/**
 * DeliveryService — Central server-authoritative delivery distance, fee,
 * and routing service for Food Rush.
 *
 * Exposes:
 * - quoteDelivery: computes distance, fee, and promotional waivers per restaurant
 * - verifyQuoteIntegrity: ensures client was quoted the exact amount charged
 * - geocoding: search and reverse geocode with caching and rate limiting
 */
import crypto from "crypto";
import DeliveryCampaign, {
  IDeliveryCampaign,
} from "../../models/DeliveryCampaign";
import DeliverySettings, {
  IDeliverySettings,
  BANGLADESH_BOUNDING_BOX,
} from "../../models/DeliverySettings";
import Restaurant from "../../models/Restaurant";
import { ConflictError, ValidationError } from "../../utils/errors";
import {
  matchDeliveryCampaign,
  MatchedCampaignResult,
} from "./campaign-matcher";
import { getDeliveryConfig } from "./delivery-config";
import {
  calculateDeliveryFee,
  FeeCalculationResult,
} from "./fee-calculator";
import { GeocodingAddress } from "./geocoding/geocoding.interface";
import { NominatimProvider } from "./geocoding/nominatim.provider";
import { RoutingCircuitBreaker } from "./routing/circuit-breaker";
import { HaversineFallbackProvider } from "./routing/haversine-fallback.provider";
import { OsrmProvider } from "./routing/osrm.provider";
import { CachedRoutingProvider } from "./routing/route-cache";
import { LatLngPoint, RouteResult } from "./routing/routing.interface";

export interface SubOrderQuoteInput {
  restaurantId: string;
  itemsSubtotal: number;
}

export interface SubOrderQuoteResult {
  restaurantId: string;
  restaurantName: string;
  deliverable: boolean;
  distanceKm: number;
  durationMin: number;
  feeOriginal: number;
  feeDiscount: number;
  feeCharged: number;
  campaign: MatchedCampaignResult["snapshot"];
  isEstimate: boolean;
  provider: string;
  reason?:
    | "OUT_OF_RANGE"
    | "RESTAURANT_NO_LOCATION"
    | "OUTSIDE_SERVICE_AREA"
    | "RESTAURANT_NOT_FOUND";
}

export interface DeliveryQuoteResult {
  quoteId: string;
  expiresAt: string;
  destination: LatLngPoint;
  quotes: SubOrderQuoteResult[];
  totals: {
    deliveryFeeOriginal: number;
    deliveryFeeDiscount: number;
    deliveryFeeCharged: number;
    totalDistanceKm: number;
  };
}

export interface VerifyQuoteInput {
  destination: LatLngPoint;
  subOrders: SubOrderQuoteInput[];
  quoteSignature?: string;
  expectedChargedFee?: number;
}

export class DeliveryService {
  private static instance: DeliveryService;
  private readonly router: CachedRoutingProvider;
  private readonly geocoder: NominatimProvider;
  private readonly circuitBreaker: RoutingCircuitBreaker;

  private constructor() {
    const config = getDeliveryConfig();

    const osrm = new OsrmProvider({
      baseUrl: config.osrmBaseUrl,
      timeoutMs: config.routingTimeoutMs,
    });
    const fallback = new HaversineFallbackProvider({ detourFactor: 1.3 });

    this.circuitBreaker = new RoutingCircuitBreaker(osrm, fallback, {
      failureThreshold: 3,
      resetTimeoutMs: 30000,
    });

    this.router = new CachedRoutingProvider(this.circuitBreaker);
    this.geocoder = new NominatimProvider({
      baseUrl: config.nominatimBaseUrl,
      userAgent: config.nominatimUserAgent,
    });
  }

  public static getInstance(): DeliveryService {
    if (!DeliveryService.instance) {
      DeliveryService.instance = new DeliveryService();
    }
    return DeliveryService.instance;
  }

  /**
   * Validate geographical point. Rejects 0,0, non-finite, and out-of-bounds coordinates.
   */
  public validateDestinationCoordinates(
    destination: LatLngPoint,
    serviceArea = BANGLADESH_BOUNDING_BOX,
  ): void {
    const { latitude, longitude } = destination;
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      (latitude === 0 && longitude === 0)
    ) {
      throw new ValidationError(
        "Invalid delivery coordinates: latitude and longitude must be non-zero finite numbers",
      );
    }

    if (!this.isInsideServiceArea(latitude, longitude, serviceArea)) {
      throw new ValidationError(
        "Delivery address is outside the supported service area (Bangladesh)",
      );
    }
  }

  /**
   * Check if a coordinate is inside the service area polygon.
   */
  public isInsideServiceArea(
    lat: number,
    lng: number,
    polygon = BANGLADESH_BOUNDING_BOX,
  ): boolean {
    const rings = polygon.coordinates;
    if (!rings || rings.length === 0) return true;

    // Ray-casting algorithm for GeoJSON polygon coordinates [lng, lat]
    const ring = rings[0];
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];

      const intersect =
        yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Route between origin and destination with caching and fallback.
   */
  public async route(
    origin: LatLngPoint,
    destination: LatLngPoint,
  ): Promise<RouteResult> {
    return this.router.route(origin, destination);
  }

  /**
   * Generates quoteId token with HMAC-SHA256 signature containing expiration and amounts.
   */
  public generateQuoteToken(
    destination: LatLngPoint,
    subQuotes: SubOrderQuoteResult[],
    expiresInMs = 15 * 60 * 1000, // 15 minutes
  ): { quoteId: string; expiresAt: string } {
    const expiresAt = new Date(Date.now() + expiresInMs).toISOString();
    const config = getDeliveryConfig();

    const payload = JSON.stringify({
      dest: `${destination.latitude.toFixed(5)},${destination.longitude.toFixed(5)}`,
      exp: expiresAt,
      quotes: subQuotes.map((q) => ({
        id: q.restaurantId,
        fee: q.feeCharged,
      })),
    });

    const hmac = crypto
      .createHmac("sha256", config.quoteSecret)
      .update(payload)
      .digest("base64url");

    const token = `${Buffer.from(payload).toString("base64url")}.${hmac}`;
    return { quoteId: token, expiresAt };
  }

  /**
   * Quotes delivery distance, fees, and promotional discounts across all restaurants in a cart.
   */
  public async quoteDelivery(input: {
    destination: LatLngPoint;
    subOrders: SubOrderQuoteInput[];
  }): Promise<DeliveryQuoteResult> {
    const settings = await DeliverySettings.getSettings();
    this.validateDestinationCoordinates(input.destination, settings.serviceArea);

    if (!Array.isArray(input.subOrders) || input.subOrders.length === 0) {
      throw new ValidationError("At least one sub-order is required to quote delivery");
    }

    if (input.subOrders.length > 5) {
      throw new ValidationError("Cannot quote delivery for more than 5 restaurants in one cart");
    }

    // Load active delivery campaigns once
    const activeCampaigns = await DeliveryCampaign.find({
      isActive: true,
      isDeleted: false,
    }).lean();

    const quotes: SubOrderQuoteResult[] = [];
    let totalsOriginal = 0;
    let totalsDiscount = 0;
    let totalsCharged = 0;
    let totalDistKm = 0;

    for (const subOrder of input.subOrders) {
      const restaurant = await Restaurant.findById(subOrder.restaurantId).select(
        "name address location locationVerified approvalStatus isActive",
      );

      if (!restaurant) {
        quotes.push({
          restaurantId: subOrder.restaurantId,
          restaurantName: "Unknown Restaurant",
          deliverable: false,
          distanceKm: 0,
          durationMin: 0,
          feeOriginal: 0,
          feeDiscount: 0,
          feeCharged: 0,
          campaign: null,
          isEstimate: false,
          provider: "none",
          reason: "RESTAURANT_NOT_FOUND",
        });
        continue;
      }

      // Extract restaurant coordinates
      let restCoords: LatLngPoint | null = null;
      if (
        restaurant.location?.coordinates &&
        restaurant.location.coordinates.length === 2 &&
        Number.isFinite(restaurant.location.coordinates[0]) &&
        Number.isFinite(restaurant.location.coordinates[1]) &&
        (restaurant.location.coordinates[0] !== 0 ||
          restaurant.location.coordinates[1] !== 0)
      ) {
        restCoords = {
          latitude: restaurant.location.coordinates[1],
          longitude: restaurant.location.coordinates[0],
        };
      } else if (
        restaurant.address?.coordinates?.lat != null &&
        restaurant.address?.coordinates?.lng != null &&
        Number.isFinite(restaurant.address.coordinates.lat) &&
        Number.isFinite(restaurant.address.coordinates.lng) &&
        (restaurant.address.coordinates.lat !== 0 ||
          restaurant.address.coordinates.lng !== 0)
      ) {
        restCoords = {
          latitude: restaurant.address.coordinates.lat,
          longitude: restaurant.address.coordinates.lng,
        };
      }

      if (!restCoords) {
        quotes.push({
          restaurantId: subOrder.restaurantId,
          restaurantName: restaurant.name,
          deliverable: false,
          distanceKm: 0,
          durationMin: 0,
          feeOriginal: 0,
          feeDiscount: 0,
          feeCharged: 0,
          campaign: null,
          isEstimate: false,
          provider: "none",
          reason: "RESTAURANT_NO_LOCATION",
        });
        continue;
      }

      // Check if destination is within service area
      if (
        !this.isInsideServiceArea(
          restCoords.latitude,
          restCoords.longitude,
          settings.serviceArea,
        )
      ) {
        quotes.push({
          restaurantId: subOrder.restaurantId,
          restaurantName: restaurant.name,
          deliverable: false,
          distanceKm: 0,
          durationMin: 0,
          feeOriginal: 0,
          feeDiscount: 0,
          feeCharged: 0,
          campaign: null,
          isEstimate: false,
          provider: "none",
          reason: "OUTSIDE_SERVICE_AREA",
        });
        continue;
      }

      // Compute route distance & duration
      let routeResult: RouteResult;
      try {
        routeResult = await this.router.route(restCoords, input.destination);
      } catch {
        // Fallback to direct Haversine calculation if router throws
        const fallback = new HaversineFallbackProvider({
          detourFactor: settings.detourFactor,
        });
        routeResult = await fallback.route(restCoords, input.destination);
      }

      // Check distance against maximum allowed radius
      if (routeResult.distanceKm > settings.maxDeliveryDistanceKm) {
        quotes.push({
          restaurantId: subOrder.restaurantId,
          restaurantName: restaurant.name,
          deliverable: false,
          distanceKm: routeResult.distanceKm,
          durationMin: routeResult.durationMin,
          feeOriginal: 0,
          feeDiscount: 0,
          feeCharged: 0,
          campaign: null,
          isEstimate: routeResult.isEstimate,
          provider: routeResult.provider,
          reason: "OUT_OF_RANGE",
        });
        continue;
      }

      // Calculate base fee using pure formula
      let feeResult: FeeCalculationResult;
      try {
        feeResult = calculateDeliveryFee({
          distanceKm: routeResult.distanceKm,
          minFee: settings.minFee,
          includedKm: settings.includedKm,
          includedDistanceFee: settings.includedDistanceFee,
          perKmRate: settings.perKmRate,
          maxFee: settings.maxFee,
          maxDeliveryDistanceKm: settings.maxDeliveryDistanceKm,
        });
      } catch {
        quotes.push({
          restaurantId: subOrder.restaurantId,
          restaurantName: restaurant.name,
          deliverable: false,
          distanceKm: routeResult.distanceKm,
          durationMin: routeResult.durationMin,
          feeOriginal: 0,
          feeDiscount: 0,
          feeCharged: 0,
          campaign: null,
          isEstimate: routeResult.isEstimate,
          provider: routeResult.provider,
          reason: "OUT_OF_RANGE",
        });
        continue;
      }

      // Match free delivery campaigns for this sub-order
      const campaignResult = matchDeliveryCampaign({
        restaurantId: subOrder.restaurantId,
        itemsSubtotal: subOrder.itemsSubtotal,
        deliveryFeeOriginal: feeResult.fee,
        distanceKm: routeResult.distanceKm,
        campaigns: activeCampaigns,
      });

      quotes.push({
        restaurantId: subOrder.restaurantId,
        restaurantName: restaurant.name,
        deliverable: true,
        distanceKm: routeResult.distanceKm,
        durationMin: routeResult.durationMin,
        feeOriginal: campaignResult.deliveryFeeOriginal,
        feeDiscount: campaignResult.deliveryFeeDiscount,
        feeCharged: campaignResult.deliveryFeeCharged,
        campaign: campaignResult.snapshot,
        isEstimate: routeResult.isEstimate,
        provider: routeResult.provider,
      });

      totalsOriginal += campaignResult.deliveryFeeOriginal;
      totalsDiscount += campaignResult.deliveryFeeDiscount;
      totalsCharged += campaignResult.deliveryFeeCharged;
      totalDistKm += routeResult.distanceKm;
    }

    const { quoteId, expiresAt } = this.generateQuoteToken(
      input.destination,
      quotes,
    );

    return {
      quoteId,
      expiresAt,
      destination: input.destination,
      quotes,
      totals: {
        deliveryFeeOriginal: totalsOriginal,
        deliveryFeeDiscount: totalsDiscount,
        deliveryFeeCharged: totalsCharged,
        totalDistanceKm: Math.round(totalDistKm * 100) / 100,
      },
    };
  }

  /**
   * Recomputes delivery fee at order placement time and validates quote integrity.
   * Throws ConflictError with code DELIVERY_QUOTE_CHANGED if the recomputed charged fee
   * does not match what the client was shown.
   */
  public async verifyQuoteIntegrity(
    input: VerifyQuoteInput,
  ): Promise<DeliveryQuoteResult> {
    const freshQuote = await this.quoteDelivery({
      destination: input.destination,
      subOrders: input.subOrders,
    });

    // Check if any restaurant is non-deliverable
    const undeliverable = freshQuote.quotes.find((q) => !q.deliverable);
    if (undeliverable) {
      if (undeliverable.reason === "OUT_OF_RANGE") {
        throw new ValidationError(
          `Restaurant "${undeliverable.restaurantName}" is too far for delivery (${undeliverable.distanceKm.toFixed(1)} km). Maximum delivery distance is 15 km.`,
        );
      }
      if (undeliverable.reason === "RESTAURANT_NO_LOCATION") {
        throw new ValidationError(
          `Restaurant "${undeliverable.restaurantName}" has not configured its location yet and cannot accept orders.`,
        );
      }
      throw new ValidationError(
        `Restaurant "${undeliverable.restaurantName}" cannot be delivered to this location (${undeliverable.reason || "unavailable"}).`,
      );
    }

    // Check fee integrity against expected charged fee
    if (
      input.expectedChargedFee != null &&
      Number.isFinite(input.expectedChargedFee)
    ) {
      const freshChargedTotal = freshQuote.totals.deliveryFeeCharged;
      if (input.expectedChargedFee !== freshChargedTotal) {
        const error = new ConflictError(
          `Delivery fee updated: previously quoted ৳${input.expectedChargedFee}, current fee is ৳${freshChargedTotal}`,
        );
        (error as any).code = "DELIVERY_QUOTE_CHANGED";
        (error as any).quote = freshQuote;
        throw error;
      }
    }

    return freshQuote;
  }

  // ── Geocoding Proxy Methods ────────────────────────────────────

  public async geocodeSearch(query: string): Promise<GeocodingAddress[]> {
    return this.geocoder.search(query);
  }

  public async geocodeReverse(
    lat: number,
    lng: number,
  ): Promise<GeocodingAddress | null> {
    return this.geocoder.reverse(lat, lng);
  }

  // ── Operational & Diagnostics ──────────────────────────────────

  public async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "down";
    circuitState: string;
    routingProvider: string;
    routerHealthy: boolean;
  }> {
    const routerHealthy = await this.circuitBreaker.healthCheck();
    const circuitState = this.circuitBreaker.getState();

    let status: "healthy" | "degraded" | "down" = "healthy";
    if (circuitState === "OPEN") {
      status = "degraded"; // Working via Haversine fallback
    } else if (!routerHealthy) {
      status = "degraded";
    }

    return {
      status,
      circuitState,
      routingProvider: this.circuitBreaker.name,
      routerHealthy,
    };
  }

  public getCircuitBreakerMetrics() {
    return this.circuitBreaker.metrics;
  }
}

export const deliveryService = DeliveryService.getInstance();
