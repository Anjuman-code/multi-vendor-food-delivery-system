/**
 * One-time backfill for VendorProfile denormalized stats.
 *
 * The fields totalOrders / totalEarnings / pendingPayout / averageRating were
 * never written before the stat-sync work landed, so existing vendors read 0.
 * This recomputes them from historical data:
 *   - totalOrders   = delivered orders across the vendor's restaurants
 *   - totalEarnings = sum(subtotal * (1 - commissionRate/100)) over delivered+paid
 *   - pendingPayout = totalEarnings - already-paid-out (completed/processing payouts)
 *                     - refunded vendor share
 *   - averageRating = mean of the vendor's restaurants' rating.average
 *
 * Commission base = order subtotal, matching utils/vendor-stats.util and
 * controllers/vendor.controller.getVendorEarnings.
 *
 * Run: npm run db:backfill-vendor  (from repo root)
 */
import { createRequire } from "node:module";
import path from "node:path";

import Order, { OrderStatus, PaymentStatus } from "../backend/src/models/Order";
import Payout, { PayoutStatus } from "../backend/src/models/Payout";
import Restaurant from "../backend/src/models/Restaurant";
import VendorProfile from "../backend/src/models/VendorProfile";

const backendRequire = createRequire(
  path.resolve(__dirname, "../backend/package.json"),
);
backendRequire("dotenv/config");
const mongoose = backendRequire("mongoose") as typeof import("mongoose");

const round2 = (n: number) => Math.round((n || 0) * 100) / 100;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("✖  MONGODB_URI is not defined in .env");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("→  Connected. Backfilling vendor stats…");

  const profiles = await VendorProfile.find();
  let updated = 0;

  for (const profile of profiles) {
    const restaurantIds = profile.restaurantIds;
    const rate = profile.commissionRate || 0;
    const netFactor = 1 - rate / 100;

    if (restaurantIds.length === 0) {
      await VendorProfile.updateOne(
        { _id: profile._id },
        {
          $set: {
            totalOrders: 0,
            totalEarnings: 0,
            pendingPayout: 0,
            averageRating: 0,
          },
        },
      );
      updated++;
      continue;
    }

    const [earnAgg, refundAgg, payoutAgg, restaurants] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            restaurantId: { $in: restaurantIds },
            status: OrderStatus.DELIVERED,
            paymentStatus: PaymentStatus.PAID,
          },
        },
        { $group: { _id: null, gross: { $sum: "$subtotal" }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { restaurantId: { $in: restaurantIds }, status: OrderStatus.DELIVERED } },
        { $unwind: "$refundLineItems" },
        { $group: { _id: null, refunded: { $sum: "$refundLineItems.refundAmount" } } },
      ]),
      Payout.aggregate([
        {
          $match: {
            vendorId: profile.userId,
            status: { $in: [PayoutStatus.PENDING, PayoutStatus.PROCESSING, PayoutStatus.COMPLETED] },
          },
        },
        { $group: { _id: null, paid: { $sum: "$amount" } } },
      ]),
      Restaurant.find({ _id: { $in: restaurantIds } }).select("rating").lean(),
    ]);

    const gross = earnAgg[0]?.gross || 0;
    const totalOrders = earnAgg[0]?.orders || 0;
    const totalEarnings = round2(gross * netFactor);
    const refundedVendorShare = round2((refundAgg[0]?.refunded || 0) * netFactor);
    const alreadyPaid = payoutAgg[0]?.paid || 0;
    const pendingPayout = round2(
      Math.max(0, totalEarnings - refundedVendorShare - alreadyPaid),
    );
    const avgRating =
      restaurants.length > 0
        ? restaurants.reduce(
            (sum: number, r: { rating?: { average?: number } }) =>
              sum + (r.rating?.average || 0),
            0,
          ) / restaurants.length
        : 0;

    await VendorProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          totalOrders,
          totalEarnings,
          pendingPayout,
          averageRating: Math.round(avgRating * 10) / 10,
        },
      },
    );
    updated++;
  }

  console.log(`✔  Backfilled ${updated} vendor profile(s).`);
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("✖  Backfill failed:", err);
  process.exit(1);
});
