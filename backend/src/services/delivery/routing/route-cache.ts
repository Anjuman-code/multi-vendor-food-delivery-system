/**
 * Two-tier Route Cache: In-memory LRU + MongoDB TTL Collection.
 *
 * Keys coordinates rounded to 5 decimal places (~1.1m precision).
 * Real routes cached for 7 days.
 * Estimates cached for 1 hour.
 */
import RouteCache from "../../../models/RouteCache";
import { LatLngPoint, RouteResult, RoutingProvider } from "./routing.interface";

const REAL_ROUTE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ESTIMATE_ROUTE_TTL_MS = 60 * 60 * 1000; // 1 hour
const IN_MEMORY_CACHE_MAX_ENTRIES = 1000;

interface MemoryCacheEntry {
  result: RouteResult;
  expiresAt: number;
}

export function formatCoordinateKey(point: LatLngPoint): string {
  const lat = point.latitude.toFixed(5);
  const lng = point.longitude.toFixed(5);
  return `${lat},${lng}`;
}

export class CachedRoutingProvider implements RoutingProvider {
  public readonly name: string;
  private readonly inner: RoutingProvider;
  private readonly memoryCache = new Map<string, MemoryCacheEntry>();

  // Operational metrics
  public metrics = {
    hits: 0,
    misses: 0,
    mongoHits: 0,
  };

  constructor(inner: RoutingProvider) {
    this.inner = inner;
    this.name = `cached_${inner.name}`;
  }

  public async route(
    origin: LatLngPoint,
    destination: LatLngPoint,
  ): Promise<RouteResult> {
    const originKey = formatCoordinateKey(origin);
    const destinationKey = formatCoordinateKey(destination);
    const cacheKey = `${originKey}->${destinationKey}`;
    const now = Date.now();

    // 1. Check in-memory LRU cache
    const memEntry = this.memoryCache.get(cacheKey);
    if (memEntry && memEntry.expiresAt > now) {
      this.metrics.hits++;
      return memEntry.result;
    }

    // 2. Check MongoDB RouteCache collection
    try {
      const doc = await RouteCache.findOne({
        originKey,
        destinationKey,
        expiresAt: { $gt: new Date(now) },
      });

      if (doc) {
        this.metrics.hits++;
        this.metrics.mongoHits++;
        const result: RouteResult = {
          distanceMeters: doc.distanceMeters,
          distanceKm: Math.round((doc.distanceMeters / 1000) * 100) / 100,
          durationSeconds: doc.durationSeconds,
          durationMin: Math.max(1, Math.round(doc.durationSeconds / 60)),
          provider: doc.routeProvider,
          isEstimate: doc.isEstimate,
        };
        // Promote to memory cache
        this.setMemory(cacheKey, result, doc.expiresAt.getTime());
        return result;
      }
    } catch {
      // Non-blocking: DB cache lookup failure should not block routing
    }

    // 3. Cache Miss: Execute routing through provider
    this.metrics.misses++;
    const result = await this.inner.route(origin, destination);

    // 4. Save to caches (Never cache errors)
    const ttlMs = result.isEstimate ? ESTIMATE_ROUTE_TTL_MS : REAL_ROUTE_TTL_MS;
    const expiresAt = new Date(now + ttlMs);

    this.setMemory(cacheKey, result, expiresAt.getTime());

    // Async write to MongoDB
    RouteCache.findOneAndUpdate(
      { originKey, destinationKey },
      {
        $set: {
          distanceMeters: result.distanceMeters,
          durationSeconds: result.durationSeconds,
          routeProvider: result.provider,
          isEstimate: result.isEstimate,
          expiresAt,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    ).catch(() => {
      // Ignore background cache write failures
    });

    return result;
  }

  private setMemory(key: string, result: RouteResult, expiresAt: number): void {
    if (this.memoryCache.size >= IN_MEMORY_CACHE_MAX_ENTRIES) {
      // Evict oldest entry (first key in insertion-order iterator)
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) this.memoryCache.delete(oldestKey);
    }
    this.memoryCache.set(key, { result, expiresAt });
  }

  public async healthCheck(): Promise<boolean> {
    return this.inner.healthCheck();
  }

  public clearMemoryCache(): void {
    this.memoryCache.clear();
  }
}
