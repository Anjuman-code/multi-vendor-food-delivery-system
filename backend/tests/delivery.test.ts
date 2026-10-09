/**
 * Delivery Foundation Unit Tests.
 *
 * Covers:
 * 1. Fee Calculator (formula, floors, ceilings, rounding, validation)
 * 2. Campaign Matcher (subtotal thresholds, restaurant scoping, distance caps, best-match selection)
 * 3. Routing Circuit Breaker & Fallback Provider
 * 4. Coordinate Key Formatting & Cache Keys
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateDeliveryFee,
  validateDeliverySettings,
  MIN_FEE_FLOOR,
} from "../src/services/delivery/fee-calculator";
import {
  matchDeliveryCampaign,
} from "../src/services/delivery/campaign-matcher";
import {
  HaversineFallbackProvider,
  calculateHaversineDistanceMeters,
} from "../src/services/delivery/routing/haversine-fallback.provider";
import {
  RoutingCircuitBreaker,
  CircuitState,
} from "../src/services/delivery/routing/circuit-breaker";
import {
  formatCoordinateKey,
} from "../src/services/delivery/routing/route-cache";
import { RoutingProvider, LatLngPoint, RouteResult } from "../src/services/delivery/routing/routing.interface";
import { IDeliveryCampaign } from "../src/models/DeliveryCampaign";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Fee Calculator Tests
// ─────────────────────────────────────────────────────────────────────────────

test("calculateDeliveryFee: enforces minimum fee floor of ৳10 for zero distance", () => {
  const result = calculateDeliveryFee({ distanceKm: 0 });
  assert.equal(result.fee, 10);
  assert.equal(result.isMinFeeApplied, true);
});

test("calculateDeliveryFee: enforces minimum fee floor for small distance <= includedKm", () => {
  const result = calculateDeliveryFee({ distanceKm: 0.8, includedKm: 1.0, includedDistanceFee: 10 });
  assert.equal(result.fee, 10);
});

test("calculateDeliveryFee: correctly calculates per-km fee above includedKm and rounds UP", () => {
  // distance: 2.3 km, included: 1.0 km -> 1.3 km extra @ ৳10/km -> 10 + 13 = ৳23
  const res1 = calculateDeliveryFee({
    distanceKm: 2.3,
    includedKm: 1.0,
    includedDistanceFee: 10,
    perKmRate: 10,
  });
  assert.equal(res1.fee, 23);

  // distance: 2.35 km -> 1.35 km extra @ ৳10/km -> 10 + 13.5 = 23.5 -> rounds UP to ৳24
  const res2 = calculateDeliveryFee({
    distanceKm: 2.35,
    includedKm: 1.0,
    includedDistanceFee: 10,
    perKmRate: 10,
  });
  assert.equal(res2.fee, 24);
});

test("calculateDeliveryFee: applies maxFee cap when configured", () => {
  // distance: 10 km -> 10 + 9*10 = ৳100, but maxFee is ৳60
  const result = calculateDeliveryFee({
    distanceKm: 10.0,
    includedKm: 1.0,
    includedDistanceFee: 10,
    perKmRate: 10,
    maxFee: 60,
  });
  assert.equal(result.fee, 60);
  assert.equal(result.isMaxFeeApplied, true);
});

test("calculateDeliveryFee: rejects distances exceeding maxDeliveryDistanceKm", () => {
  assert.throws(
    () => {
      calculateDeliveryFee({ distanceKm: 16.5, maxDeliveryDistanceKm: 15.0 });
    },
    /exceeds maximum delivery radius/,
  );
});

test("calculateDeliveryFee: rejects negative and NaN distances", () => {
  assert.throws(() => calculateDeliveryFee({ distanceKm: -2 }), /non-negative/);
  assert.throws(() => calculateDeliveryFee({ distanceKm: NaN }), /non-negative/);
});

test("validateDeliverySettings: prevents saving minFee below ৳10", () => {
  assert.throws(
    () => {
      validateDeliverySettings({
        minFee: 8,
        includedKm: 1,
        includedDistanceFee: 10,
        perKmRate: 10,
        maxDeliveryDistanceKm: 15,
        detourFactor: 1.3,
      });
    },
    /Minimum delivery fee must be at least ৳10/,
  );
});

test("validateDeliverySettings: passes valid configuration", () => {
  assert.doesNotThrow(() => {
    validateDeliverySettings({
      minFee: 15,
      includedKm: 1.5,
      includedDistanceFee: 15,
      perKmRate: 12,
      maxFee: 100,
      maxDeliveryDistanceKm: 20,
      detourFactor: 1.3,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Delivery Campaign Matcher Tests
// ─────────────────────────────────────────────────────────────────────────────

const mockCampaign = (
  overrides: Partial<IDeliveryCampaign> & { _id?: string } = {},
): IDeliveryCampaign & { _id: string } => ({
  _id: "camp-123",
  name: "Summer Free Delivery",
  label: "Free delivery over ৳500",
  minSubtotal: 500,
  restaurantIds: [],
  isActive: true,
  isDeleted: false,
  createdBy: "user-1" as any,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

test("matchDeliveryCampaign: returns no waiver when subtotal is below threshold", () => {
  const campaign = mockCampaign({ minSubtotal: 500 });
  const result = matchDeliveryCampaign({
    restaurantId: "rest-1",
    itemsSubtotal: 450,
    deliveryFeeOriginal: 35,
    distanceKm: 3.0,
    campaigns: [campaign],
  });

  assert.equal(result.bestCampaign, null);
  assert.equal(result.deliveryFeeOriginal, 35);
  assert.equal(result.deliveryFeeDiscount, 0);
  assert.equal(result.deliveryFeeCharged, 35);
});

test("matchDeliveryCampaign: applies 100% waiver when qualifying and no cap", () => {
  const campaign = mockCampaign({ minSubtotal: 500 });
  const result = matchDeliveryCampaign({
    restaurantId: "rest-1",
    itemsSubtotal: 520,
    deliveryFeeOriginal: 40,
    distanceKm: 3.5,
    campaigns: [campaign],
  });

  assert.ok(result.bestCampaign);
  assert.equal(result.deliveryFeeOriginal, 40);
  assert.equal(result.deliveryFeeDiscount, 40);
  assert.equal(result.deliveryFeeCharged, 0);
  assert.equal(result.snapshot?.name, "Summer Free Delivery");
});

test("matchDeliveryCampaign: respects maxWaivedAmount cap", () => {
  const campaign = mockCampaign({ minSubtotal: 300, maxWaivedAmount: 25 });
  const result = matchDeliveryCampaign({
    restaurantId: "rest-1",
    itemsSubtotal: 400,
    deliveryFeeOriginal: 45,
    distanceKm: 4.0,
    campaigns: [campaign],
  });

  assert.equal(result.deliveryFeeOriginal, 45);
  assert.equal(result.deliveryFeeDiscount, 25);
  assert.equal(result.deliveryFeeCharged, 20);
});

test("matchDeliveryCampaign: best of many wins without stacking", () => {
  const campA = mockCampaign({ _id: "camp-A", minSubtotal: 300, maxWaivedAmount: 20 });
  const campB = mockCampaign({ _id: "camp-B", minSubtotal: 400, maxWaivedAmount: 50 }); // Higher waiver

  const result = matchDeliveryCampaign({
    restaurantId: "rest-1",
    itemsSubtotal: 450,
    deliveryFeeOriginal: 40,
    distanceKm: 3.0,
    campaigns: [campA, campB],
  });

  assert.equal(String(result.bestCampaign?._id), "camp-B");
  assert.equal(result.deliveryFeeDiscount, 40); // Capped by original fee
  assert.equal(result.deliveryFeeCharged, 0);
});

test("matchDeliveryCampaign: respects restaurantIds scoping", () => {
  const campaign = mockCampaign({
    minSubtotal: 300,
    restaurantIds: ["rest-eligible" as any],
  });

  // Non-eligible restaurant
  const res1 = matchDeliveryCampaign({
    restaurantId: "rest-ineligible",
    itemsSubtotal: 500,
    deliveryFeeOriginal: 30,
    distanceKm: 2.0,
    campaigns: [campaign],
  });
  assert.equal(res1.bestCampaign, null);
  assert.equal(res1.deliveryFeeCharged, 30);

  // Eligible restaurant
  const res2 = matchDeliveryCampaign({
    restaurantId: "rest-eligible",
    itemsSubtotal: 500,
    deliveryFeeOriginal: 30,
    distanceKm: 2.0,
    campaigns: [campaign],
  });
  assert.ok(res2.bestCampaign);
  assert.equal(res2.deliveryFeeCharged, 0);
});

test("matchDeliveryCampaign: ignores expired or scheduled campaigns", () => {
  const now = new Date("2026-10-09T12:00:00Z");
  const expired = mockCampaign({ endsAt: new Date("2026-10-08T00:00:00Z") });
  const future = mockCampaign({ startsAt: new Date("2026-10-15T00:00:00Z") });

  const resExpired = matchDeliveryCampaign({
    restaurantId: "rest-1",
    itemsSubtotal: 600,
    deliveryFeeOriginal: 30,
    distanceKm: 2.0,
    campaigns: [expired],
    now,
  });
  assert.equal(resExpired.bestCampaign, null);

  const resFuture = matchDeliveryCampaign({
    restaurantId: "rest-1",
    itemsSubtotal: 600,
    deliveryFeeOriginal: 30,
    distanceKm: 2.0,
    campaigns: [future],
    now,
  });
  assert.equal(resFuture.bestCampaign, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Routing Adapter & Circuit Breaker Tests
// ─────────────────────────────────────────────────────────────────────────────

test("HaversineFallbackProvider: calculates distance with detour factor and flags estimate", async () => {
  const provider = new HaversineFallbackProvider({ detourFactor: 1.3, averageSpeedKmh: 24 });
  // Sylhet Zinda Bazar to Shibganj (~1.8 km straight line)
  const origin: LatLngPoint = { latitude: 24.8994, longitude: 91.8687 };
  const destination: LatLngPoint = { latitude: 24.8912, longitude: 91.8845 };

  const res = await provider.route(origin, destination);
  assert.ok(res.distanceMeters > 2000, `Expected >2000m, got ${res.distanceMeters}`);
  assert.ok(res.distanceKm > 2.0);
  assert.equal(res.isEstimate, true);
  assert.equal(res.provider, "haversine_fallback");
  assert.ok(res.durationMin >= 1);
});

test("RoutingCircuitBreaker: trips to fallback after threshold consecutive failures", async () => {
  let callCount = 0;
  const failingPrimary: RoutingProvider = {
    name: "mock_failing_osrm",
    async route() {
      callCount++;
      throw new Error("Connection refused");
    },
    async healthCheck() {
      return false;
    },
  };

  const fallback = new HaversineFallbackProvider();
  const cb = new RoutingCircuitBreaker(failingPrimary, fallback, {
    failureThreshold: 2,
    resetTimeoutMs: 500,
  });

  const origin = { latitude: 24.8994, longitude: 91.8687 };
  const destination = { latitude: 24.8912, longitude: 91.8845 };

  assert.equal(cb.getState(), CircuitState.CLOSED);

  // Call 1: Primary fails, uses fallback
  const r1 = await cb.route(origin, destination);
  assert.equal(r1.isEstimate, true);
  assert.equal(cb.getState(), CircuitState.CLOSED);

  // Call 2: Primary fails again -> Trips to OPEN
  const r2 = await cb.route(origin, destination);
  assert.equal(r2.isEstimate, true);
  assert.equal(cb.getState(), CircuitState.OPEN);
  assert.equal(callCount, 2);

  // Call 3: Circuit is OPEN -> Doesn't call primary at all!
  const r3 = await cb.route(origin, destination);
  assert.equal(r3.isEstimate, true);
  assert.equal(callCount, 2); // Unchanged!
});

test("formatCoordinateKey: rounds coordinates to 5 decimal places", () => {
  const key = formatCoordinateKey({ latitude: 24.899401234, longitude: 91.868709876 });
  assert.equal(key, "24.89940,91.86871");
});

test("validateDestinationCoordinates: rejects zero, non-finite, and out-of-bounds coordinates", () => {
  const { deliveryService } = require("../src/services/delivery/delivery.service");

  // Invalid: 0,0
  assert.throws(
    () => deliveryService.validateDestinationCoordinates({ latitude: 0, longitude: 0 }),
    /Invalid delivery coordinates/,
  );

  // Invalid: NaN
  assert.throws(
    () => deliveryService.validateDestinationCoordinates({ latitude: NaN, longitude: 91.8 }),
    /Invalid delivery coordinates/,
  );

  // Invalid: Outside Bangladesh (e.g. London: 51.5074, -0.1278)
  assert.throws(
    () => deliveryService.validateDestinationCoordinates({ latitude: 51.5074, longitude: -0.1278 }),
    /outside the supported service area/,
  );

  // Valid: Sylhet, Bangladesh (24.8949, 91.8687)
  assert.doesNotThrow(() =>
    deliveryService.validateDestinationCoordinates({ latitude: 24.8949, longitude: 91.8687 }),
  );
});

test("isInsideServiceArea: correctly verifies points inside and outside Bangladesh bounding box", () => {
  const { deliveryService } = require("../src/services/delivery/delivery.service");

  // Inside Dhaka
  assert.equal(deliveryService.isInsideServiceArea(23.8103, 90.4125), true);
  // Inside Sylhet
  assert.equal(deliveryService.isInsideServiceArea(24.8949, 91.8687), true);
  // Outside: New York
  assert.equal(deliveryService.isInsideServiceArea(40.7128, -74.006), false);
  // Outside: Tokyo
  assert.equal(deliveryService.isInsideServiceArea(35.6762, 139.6503), false);
});
test("quoteDeliverySchema: accepts either subOrders or restaurants and lat/lng aliases", () => {
  const { quoteDeliverySchema } = require("../src/validations/delivery.validation");

  // Format 1: Using 'subOrders' with 'latitude' & 'longitude'
  const parsed1 = quoteDeliverySchema.parse({
    destination: { latitude: 24.8949, longitude: 91.8687 },
    subOrders: [{ restaurantId: "rest-123", itemsSubtotal: 450 }],
  });
  assert.equal(parsed1.restaurants.length, 1);
  assert.equal(parsed1.restaurants[0].restaurantId, "rest-123");
  assert.equal(parsed1.destination.latitude, 24.8949);

  // Format 2: Using 'restaurants' with 'lat' & 'lng'
  const parsed2 = quoteDeliverySchema.parse({
    destination: { lat: 24.8949, lng: 91.8687 },
    restaurants: [{ restaurantId: "rest-456", itemsSubtotal: 600 }],
  });
  assert.equal(parsed2.restaurants.length, 1);
  assert.equal(parsed2.restaurants[0].restaurantId, "rest-456");
  assert.equal(parsed2.destination.latitude, 24.8949);
});
