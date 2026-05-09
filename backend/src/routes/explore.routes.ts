/**
 * Explore routes – public discovery endpoints for the home page.
 */
import { Router } from "express";
import {
  getTopCategories,
  getTrendingItems,
  getPopularRestaurants,
  getMenuItemsByCategory,
} from "../controllers/explore.controller";

const router: Router = Router();

router.get("/top-categories", getTopCategories);
router.get("/trending-items", getTrendingItems);
router.get("/popular-restaurants", getPopularRestaurants);
router.get("/menu-items/:category", getMenuItemsByCategory);

export default router;
