/**
 * Vendor denormalized-stat sync helpers.
 *
 * VendorProfile carries denormalized fields (totalOrders, totalEarnings,
 * pendingPayout, averageRating) that power the dashboard and gate payout
 * creation. These helpers keep them coherent at the order/review lifecycle
 * points. Earnings use atomic `$inc` (race-safe); ratings are recomputed via
 * aggregation (averages have no safe incremental delta under edits/deletes).
 *
 * Commission base: order `subtotal` (excludes tax + delivery fee, which are
 * not vendor revenue). This must stay identical to the earnings aggregation
 * in vendor.controller.getVendorEarnings and the admin payout math.
 *
 * All helpers are best-effort: callers should treat failures as non-fatal so
 * a sync hiccup never breaks the primary request.
 */
import type { Types } from "mongoose";
import Restaurant from "../models/Restaurant";
import VendorProfile from "../models/VendorProfile";

type Id = Types.ObjectId | string;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Vendor's net share of a gross amount after commission. */
const netOf = (gross: number, commissionRate: number) =>
  round2(gross * (1 - (commissionRate || 0) / 100));

/**
 * Credit a vendor when one of their orders is delivered: bump order count and
 * accrue net earnings into both lifetime total and the un-paid-out balance.
 */
export const applyOrderDelivered = async (
  restaurantId: Id,
  subtotal: number,
): Promise<void> => {
  const profile = await VendorProfile.findOne({ restaurantIds: restaurantId });
  if (!profile) return;
  const net = netOf(subtotal || 0, profile.commissionRate);
  await VendorProfile.updateOne(
    { _id: profile._id },
    { $inc: { totalOrders: 1, totalEarnings: net, pendingPayout: net } },
  );
};

/**
 * Reverse a vendor's net share when a (delivered) order is refunded. Only the
 * vendor's net portion of the refund is clawed back; the platform absorbs its
 * commission share. Does not touch totalOrders (the order still happened).
 */
export const reverseOrderEarnings = async (
  restaurantId: Id,
  refundAmount: number,
): Promise<void> => {
  const profile = await VendorProfile.findOne({ restaurantIds: restaurantId });
  if (!profile) return;
  const net = netOf(refundAmount || 0, profile.commissionRate);
  await VendorProfile.updateOne(
    { _id: profile._id },
    { $inc: { totalEarnings: -net, pendingPayout: -net } },
  );
};

/**
 * Recompute a vendor's profile-level averageRating as the mean of their
 * restaurants' rating averages. Mirrors getDashboardStats' live computation.
 */
export const recomputeVendorRating = async (restaurantId: Id): Promise<void> => {
  const profile = await VendorProfile.findOne({ restaurantIds: restaurantId });
  if (!profile) return;
  const restaurants = await Restaurant.find({
    _id: { $in: profile.restaurantIds },
  })
    .select("rating")
    .lean();
  const avg =
    restaurants.length > 0
      ? restaurants.reduce((sum, r) => sum + (r.rating?.average || 0), 0) /
        restaurants.length
      : 0;
  await VendorProfile.updateOne(
    { _id: profile._id },
    { $set: { averageRating: Math.round(avg * 10) / 10 } },
  );
};
