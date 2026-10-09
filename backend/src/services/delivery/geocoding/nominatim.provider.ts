/**
 * Nominatim Geocoding Provider.
 *
 * Implements strict compliance with the OpenStreetMap Nominatim Usage Policy:
 * 1. User-Agent identifying Food Rush with contact email.
 * 2. Strict serialized rate-limiting: max 1 request per second via queue.
 * 3. Two-tier caching (in-memory + MongoDB TTL GeocodeCache) to minimize traffic.
 * 4. Automatic bounding and country restriction to Bangladesh (countrycodes=bd).
 */
import axios, { AxiosInstance } from "axios";
import GeocodeCache from "../../../models/GeocodeCache";
import { GeocodingAddress, GeocodingProvider } from "./geocoding.interface";

const POSITIVE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const NEGATIVE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MIN_REQUEST_INTERVAL_MS = 1000; // 1 req/second max

export class NominatimProvider implements GeocodingProvider {
  public readonly name = "nominatim";
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly referer: string;
  private readonly client: AxiosInstance;

  // Rate-limiting queue state
  private lastRequestTimestamp = 0;
  private queueTail: Promise<void> = Promise.resolve();

  // In-memory cache
  private memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

  constructor(options: {
    baseUrl?: string;
    userAgent?: string;
    referer?: string;
  } = {}) {
    this.baseUrl = (
      options.baseUrl ||
      process.env.NOMINATIM_BASE_URL ||
      "https://nominatim.openstreetmap.org"
    ).replace(/\/+$/, "");

    this.userAgent =
      options.userAgent ||
      process.env.NOMINATIM_USER_AGENT ||
      "FoodRush-Delivery/1.0 (contact: support@foodrush.app)";

    this.referer =
      options.referer ||
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
      headers: {
        "User-Agent": this.userAgent,
        Referer: this.referer,
        Accept: "application/json",
        "Accept-Language": "en,bn",
      },
    });
  }

  /**
   * Serializes requests through a promise chain with a minimum 1000ms delay.
   */
  private async executeThrottled<T>(fn: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      const now = Date.now();
      const elapsed = now - this.lastRequestTimestamp;
      if (elapsed < MIN_REQUEST_INTERVAL_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed),
        );
      }
      this.lastRequestTimestamp = Date.now();
      return fn();
    };

    const promise = this.queueTail.then(run, run);
    this.queueTail = promise.then(
      () => {},
      () => {},
    );
    return promise;
  }

  public async search(query: string): Promise<GeocodingAddress[]> {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) return [];

    const cacheKey = `search:${trimmed}`;
    const now = Date.now();

    // 1. Check in-memory cache
    const mem = this.memoryCache.get(cacheKey);
    if (mem && mem.expiresAt > now) {
      return mem.data as GeocodingAddress[];
    }

    // 2. Check MongoDB GeocodeCache
    try {
      const doc = await GeocodeCache.findOne({
        cacheKey,
        expiresAt: { $gt: new Date(now) },
      });
      if (doc) {
        const results = doc.isNegative
          ? []
          : (doc.data as unknown as GeocodingAddress[]);
        this.memoryCache.set(cacheKey, {
          data: results,
          expiresAt: doc.expiresAt.getTime(),
        });
        return results;
      }
    } catch {
      // Non-blocking cache lookup
    }

    // 3. Execute throttled HTTP search
    try {
      const response = await this.executeThrottled(() =>
        this.client.get<Array<Record<string, unknown>>>("/search", {
          params: {
            q: query,
            format: "jsonv2",
            countrycodes: "bd",
            addressdetails: 1,
            limit: 5,
            // Viewbox bias towards Sylhet / Bangladesh
            viewbox: "91.70,25.05,92.05,24.75",
          },
        }),
      );

      const items = Array.isArray(response.data) ? response.data : [];
      const results: GeocodingAddress[] = items
        .map((item) => this.mapNominatimItem(item))
        .filter((item): item is GeocodingAddress => item !== null);

      const isNegative = results.length === 0;
      const ttl = isNegative ? NEGATIVE_CACHE_TTL_MS : POSITIVE_CACHE_TTL_MS;
      const expiresAt = new Date(now + ttl);

      // Save to caches
      this.memoryCache.set(cacheKey, { data: results, expiresAt: expiresAt.getTime() });
      GeocodeCache.findOneAndUpdate(
        { cacheKey },
        {
          $set: {
            queryType: "search",
            data: results,
            isNegative,
            expiresAt,
          },
        },
        { upsert: true },
      ).catch(() => {});

      return results;
    } catch (error) {
      return [];
    }
  }

  public async reverse(
    latitude: number,
    longitude: number,
  ): Promise<GeocodingAddress | null> {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    const latStr = latitude.toFixed(5);
    const lngStr = longitude.toFixed(5);
    const cacheKey = `reverse:${latStr},${lngStr}`;
    const now = Date.now();

    // 1. Check in-memory cache
    const mem = this.memoryCache.get(cacheKey);
    if (mem && mem.expiresAt > now) {
      return mem.data as GeocodingAddress | null;
    }

    // 2. Check MongoDB GeocodeCache
    try {
      const doc = await GeocodeCache.findOne({
        cacheKey,
        expiresAt: { $gt: new Date(now) },
      });
      if (doc) {
        const result = doc.isNegative
          ? null
          : (doc.data as unknown as GeocodingAddress);
        this.memoryCache.set(cacheKey, {
          data: result,
          expiresAt: doc.expiresAt.getTime(),
        });
        return result;
      }
    } catch {
      // Non-blocking
    }

    // 3. Execute throttled reverse lookup
    try {
      const response = await this.executeThrottled(() =>
        this.client.get<Record<string, unknown>>("/reverse", {
          params: {
            lat: latStr,
            lon: lngStr,
            format: "jsonv2",
            addressdetails: 1,
          },
        }),
      );

      const raw = response.data;
      if (!raw || raw.error) {
        this.saveNegativeReverse(cacheKey, now);
        return null;
      }

      const result = this.mapNominatimItem(raw);
      if (!result) {
        this.saveNegativeReverse(cacheKey, now);
        return null;
      }

      const expiresAt = new Date(now + POSITIVE_CACHE_TTL_MS);
      this.memoryCache.set(cacheKey, { data: result, expiresAt: expiresAt.getTime() });
      GeocodeCache.findOneAndUpdate(
        { cacheKey },
        {
          $set: {
            queryType: "reverse",
            data: result,
            isNegative: false,
            expiresAt,
          },
        },
        { upsert: true },
      ).catch(() => {});

      return result;
    } catch {
      return null;
    }
  }

  private saveNegativeReverse(cacheKey: string, now: number): void {
    const expiresAt = new Date(now + NEGATIVE_CACHE_TTL_MS);
    this.memoryCache.set(cacheKey, { data: null, expiresAt: expiresAt.getTime() });
    GeocodeCache.findOneAndUpdate(
      { cacheKey },
      {
        $set: {
          queryType: "reverse",
          data: null,
          isNegative: true,
          expiresAt,
        },
      },
      { upsert: true },
    ).catch(() => {});
  }

  private mapNominatimItem(raw: Record<string, unknown>): GeocodingAddress | null {
    const lat = parseFloat(String(raw.lat));
    const lng = parseFloat(String(raw.lon));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const address = (raw.address as Record<string, string>) || {};
    const streetParts = [
      address.house_number,
      address.road ||
        address.pedestrian ||
        address.neighbourhood ||
        address.suburb,
    ].filter(Boolean);

    const street = streetParts.join(" ").trim() || undefined;
    const district =
      address.county || address.state || address.state_district || "Sylhet";
    const area =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.suburb ||
      "Sylhet Sadar";

    const formatted =
      typeof raw.display_name === "string"
        ? raw.display_name
        : [street, area, district, "Bangladesh"].filter(Boolean).join(", ");

    return {
      street,
      houseNumber: address.house_number,
      area,
      district,
      city: address.city || address.town,
      formattedAddress: formatted,
      latitude: lat,
      longitude: lng,
    };
  }

  public clearMemoryCache(): void {
    this.memoryCache.clear();
  }
}
