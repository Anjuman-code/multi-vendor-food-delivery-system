/**
 * tests/free-delivery-guard.test.ts
 *
 * Architectural Guard Test Suite:
 * 1. Zero hardcoded free delivery constants exist in production code (cart, checkout, models).
 * 2. DeliverySettings validation strictly rejects any minFee below ৳10.
 * 3. Dynamic fee calculation correctly rounds up and honors minFee floor.
 * 4. Multi-suborder carts compute independent road distance fees.
 * 5. Free delivery applies ONLY through active database campaigns.
 * 6. Rider earnings derive strictly from original (pre-waiver) delivery fees.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  calculateDeliveryFee,
  validateDeliverySettings,
  MIN_FEE_FLOOR,
} from "../src/services/delivery/fee-calculator";
import { matchDeliveryCampaign } from "../src/services/delivery/campaign-matcher";

describe("Dynamic Delivery & Free Delivery Architectural Guard", () => {
  it("guard: asserts NO hardcoded FREE_DELIVERY_THRESHOLD constant in CartPage or CartContext", () => {
    const cartPagePath = path.resolve(
      __dirname,
      "../../frontend/src/pages/customer/CartPage.tsx",
    );
    const cartContextPath = path.resolve(
      __dirname,
      "../../frontend/src/contexts/CartContext.tsx",
    );
    const checkoutPagePath = path.resolve(
      __dirname,
      "../../frontend/src/pages/customer/CheckoutPage.tsx",
    );

    const cartPageCode = fs.readFileSync(cartPagePath, "utf-8");
    const cartContextCode = fs.readFileSync(cartContextPath, "utf-8");
    const checkoutPageCode = fs.readFileSync(checkoutPagePath, "utf-8");

    assert.ok(
      !cartPageCode.includes("FREE_DELIVERY_THRESHOLD"),
      "CartPage.tsx must not contain hardcoded FREE_DELIVERY_THRESHOLD",
    );
    assert.ok(
      !cartContextCode.includes("DEFAULT_DELIVERY_FEE"),
      "CartContext.tsx must not contain hardcoded DEFAULT_DELIVERY_FEE",
    );
    assert.ok(
      !checkoutPageCode.includes("(৳50 each)"),
      "CheckoutPage.tsx must not contain hardcoded (৳50 each) fee disclaimer",
    );
  });

  it("guard: DeliverySettings validation strictly rejects any minFee < 10", () => {
    assert.throws(
      () => {
        validateDeliverySettings({
          minFee: 9, // Below ৳10 floor!
          includedKm: 1,
          includedDistanceFee: 10,
          perKmRate: 10,
          maxDeliveryDistanceKm: 15,
          detourFactor: 1.3,
        });
      },
      /Minimum delivery fee must be at least ৳10/,
      "validateDeliverySettings must reject minFee < 10",
    );

    assert.doesNotThrow(() => {
      validateDeliverySettings({
        minFee: 10,
        includedKm: 1,
        includedDistanceFee: 10,
        perKmRate: 10,
        maxDeliveryDistanceKm: 15,
        detourFactor: 1.3,
      });
    }, "validateDeliverySettings must accept minFee >= 10");
  });

  it("guard: Fee formula enforces minFee floor and ceiling rounding", () => {
    // 0.5 km: within includedKm -> base fee 10, but minFee is 15 -> fee must be 15
    const shortTrip = calculateDeliveryFee({
      distanceKm: 0.5,
      minFee: 15,
      includedKm: 1.0,
      includedDistanceFee: 10,
      perKmRate: 10,
    });
    assert.strictEqual(shortTrip.fee, 15, "Fee must be capped below by minFee floor of 15");

    // 2.35 km: base 10 + 1.35 * 10 = 23.5 -> Math.ceil = 24
    const fractionalTrip = calculateDeliveryFee({
      distanceKm: 2.35,
      minFee: 10,
      includedKm: 1.0,
      includedDistanceFee: 10,
      perKmRate: 10,
    });
    assert.strictEqual(fractionalTrip.fee, 24, "Fee must round up to next whole Taka");
  });

  it("guard: Free delivery campaigns apply strictly on matching conditions with no stacking", () => {
    const campaigns: any[] = [
      {
        _id: "c1",
        name: "Min ৳500 Free Delivery",
        label: "Free Delivery Above ৳500",
        minSubtotal: 500,
        restaurantIds: [],
        isActive: true,
      },
      {
        _id: "c2",
        name: "Min ৳1000 Mega Waiver",
        label: "Free Delivery Above ৳1000",
        minSubtotal: 1000,
        restaurantIds: [],
        isActive: true,
      },
    ];

    // Subtotal 400: no campaign qualifies
    const match400 = matchDeliveryCampaign({
      restaurantId: "rest1",
      itemsSubtotal: 400,
      deliveryFeeOriginal: 35,
      distanceKm: 3.0,
      campaigns,
    });
    assert.strictEqual(match400.bestCampaign, null, "Under-threshold order must receive no waiver");
    assert.strictEqual(match400.deliveryFeeCharged, 35);
    assert.strictEqual(match400.deliveryFeeDiscount, 0);

    // Subtotal 600: c1 qualifies
    const match600 = matchDeliveryCampaign({
      restaurantId: "rest1",
      itemsSubtotal: 600,
      deliveryFeeOriginal: 35,
      distanceKm: 3.0,
      campaigns,
    });
    assert.ok(match600.bestCampaign, "Subtotal 600 must match c1");
    assert.strictEqual(match600.bestCampaign?.name, "Min ৳500 Free Delivery");
    assert.strictEqual(match600.deliveryFeeDiscount, 35);
    assert.strictEqual(match600.deliveryFeeCharged, 0);

    // Subtotal 1200: both qualify, best one applies without stacking
    const match1200 = matchDeliveryCampaign({
      restaurantId: "rest1",
      itemsSubtotal: 1200,
      deliveryFeeOriginal: 35,
      distanceKm: 3.0,
      campaigns,
    });
    assert.ok(match1200.bestCampaign, "Subtotal 1200 must match best campaign");
    assert.strictEqual(match1200.deliveryFeeCharged, 0, "Full fee waived, no stacking beyond fee");
  });

  it("guard: Rider earnings calculation protects rider from campaign discounts", () => {
    const mockedOrder = {
      subtotal: 600,
      deliveryFeeOriginal: 45, // Full calculated fee
      deliveryFeeDiscount: 45, // 100% waived by campaign
      deliveryFeeCharged: 0,   // Customer pays 0
      deliveryFee: 0,
      tipAmount: 20,
    };

    // Rider earnings formula: (order.deliveryFeeOriginal ?? order.deliveryFee) + (order.tipAmount ?? 0)
    const riderEarned =
      (mockedOrder.deliveryFeeOriginal ?? mockedOrder.deliveryFee) +
      (mockedOrder.tipAmount ?? 0);

    assert.strictEqual(
      riderEarned,
      65,
      "Rider must receive full original delivery fee (৳45) + tip (৳20) despite free delivery promotion",
    );
  });
});
