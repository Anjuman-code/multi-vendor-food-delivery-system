/**
 * Central route aggregator.
 */
import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import restaurantRoutes from "./restaurantRoutes";
import orderRoutes from "./order.routes";
import menuRoutes from "./menu.routes";
import reviewRoutes from "./review.routes";
import notificationRoutes from "./notification.routes";
import vendorRoutes from "./vendor.routes";
import exploreRoutes from "./explore.routes";
import payoutRoutes from "./payout.routes";
import adminRoutes from "./admin.routes";
import cartRoutes from "./cart.routes";
import deliveryZoneRoutes from "./delivery-zone.routes";
import supportRoutes from "./support.routes";
import campaignRoutes from "./campaign.routes";
import referralRoutes from "./referral.routes";
import driverRoutes from "./driver.routes";
import { getRestaurantReviews } from "../controllers/review.controller";

const router: Router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/restaurants", restaurantRoutes);
router.use("/orders", orderRoutes);
router.use("/restaurants", menuRoutes);
router.use("/reviews", reviewRoutes);
router.use("/notifications", notificationRoutes);
router.use("/vendor", vendorRoutes);
router.use("/explore", exploreRoutes);
router.use(payoutRoutes);
router.use("/admin", adminRoutes);
router.use("/cart", cartRoutes);
router.use("/vendor/delivery-zone", deliveryZoneRoutes);
router.use(supportRoutes);
router.use("/admin/campaigns", campaignRoutes);
router.use("/referrals", referralRoutes);
router.use("/driver", driverRoutes);

// Restaurant-scoped review listing (public)
router.get("/restaurants/:restaurantId/reviews", getRestaurantReviews);

export default router;
