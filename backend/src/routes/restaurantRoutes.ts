import { Router } from "express";
import {
  getAllRestaurants,
  getRestaurantById,
  getFeaturedRestaurants,
} from "../controllers/restaurantController";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../config/constants";

const router: Router = Router();

// Public read-only routes
router.get("/", getAllRestaurants);
router.get("/featured", getFeaturedRestaurants);
router.get("/:id", getRestaurantById);

// Mutation routes are now handled via /api/vendor/restaurants
// (secured with vendor auth). Legacy unprotected routes removed.

export default router;
