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
import { getRestaurantReviews } from "../controllers/review.controller";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/restaurants", restaurantRoutes);
router.use("/orders", orderRoutes);
router.use("/restaurants", menuRoutes);
router.use("/reviews", reviewRoutes);
router.use("/notifications", notificationRoutes);

// Restaurant-scoped review listing (public)
router.get("/restaurants/:restaurantId/reviews", getRestaurantReviews);

export default router;
