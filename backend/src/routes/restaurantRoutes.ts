import { Router } from "express";
import {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getFeaturedRestaurants,
} from "../controllers/restaurantController";

const router = Router();

// Collection routes
router.route("/").get(getAllRestaurants).post(createRestaurant);

// Specific routes first (to avoid conflicts with dynamic :id)
router.route("/featured").get(getFeaturedRestaurants);

// Dynamic routes
router
  .route("/:id")
  .get(getRestaurantById)
  .put(updateRestaurant)
  .delete(deleteRestaurant);

export default router;
