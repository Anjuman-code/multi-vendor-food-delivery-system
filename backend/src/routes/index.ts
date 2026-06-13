/**
 * Central route aggregator.
 */
import { Router } from "express";
import { getRestaurantReviews } from "../controllers/review.controller";
import adminRoutes from "./admin.routes";
import authRoutes from "./auth.routes";
import campaignRoutes from "./campaign.routes";
import cartRoutes from "./cart.routes";
import deliveryZoneRoutes from "./delivery-zone.routes";
import driverRoutes from "./driver.routes";
import exploreRoutes from "./explore.routes";
import menuRoutes from "./menu.routes";
import notificationRoutes from "./notification.routes";
import orderRoutes from "./order.routes";
import payoutRoutes from "./payout.routes";
import referralRoutes from "./referral.routes";
import restaurantRoutes from "./restaurantRoutes";
import reviewRoutes from "./review.routes";
import supportRoutes from "./support.routes";
import contactRoutes from "./contact.routes";
import userRoutes from "./user.routes";
import vendorRoutes from "./vendor.routes";

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
router.use(contactRoutes);
router.use("/admin/campaigns", campaignRoutes);
router.use("/referrals", referralRoutes);

import { UserRole } from "../config/constants";
import { authenticate, authorize } from "../controllers/../middleware/auth.middleware";
import { submitDriverRating } from "../controllers/driver.controller";

// Customer rates a driver — must be before /driver driverRoutes to avoid DRIVER-only auth
router.post("/driver/ratings", authenticate, authorize(UserRole.CUSTOMER), submitDriverRating);

router.use("/driver", driverRoutes);

// Restaurant-scoped review listing (public)
router.get("/restaurants/:restaurantId/reviews", getRestaurantReviews);

export default router;
