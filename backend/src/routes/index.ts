/**
 * Central route aggregator.
 */
import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import restaurantRoutes from "./restaurantRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/restaurants", restaurantRoutes);

export default router;
