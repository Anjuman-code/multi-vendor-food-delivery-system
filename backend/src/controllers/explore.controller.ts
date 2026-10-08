/**
 * Explore controller – public discovery endpoints for the home page.
 */
import { Request, Response, NextFunction } from "express";
import { successResponse } from "../utils/response.util";
import {
  fetchTopCategories,
  fetchTrendingItems,
  fetchPopularRestaurants,
  fetchMenuItemsByCategory,
  fetchExploreCategories,
  searchExploreMenuItems,
} from "../services/explore.service";
import { exploreMenuItemsQuerySchema } from "../validations/explore.validation";

const resolveLimit = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), 20);
};

/** GET /api/explore/top-categories */
export const getTopCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = resolveLimit(req.query.limit, 8);
    const categories = await fetchTopCategories(limit);
    successResponse(res, { categories });
  } catch (error) {
    next(error);
  }
};

/** GET /api/explore/trending-items */
export const getTrendingItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = resolveLimit(req.query.limit, 6);
    const items = await fetchTrendingItems(limit);
    successResponse(res, { items });
  } catch (error) {
    next(error);
  }
};

/** GET /api/explore/popular-restaurants */
export const getPopularRestaurants = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = resolveLimit(req.query.limit, 6);
    const restaurants = await fetchPopularRestaurants(limit);
    successResponse(res, { restaurants });
  } catch (error) {
    next(error);
  }
};

/** GET /api/explore/menu-items/:category */
export const getMenuItemsByCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const category = req.params.category as string;
    const limit = resolveLimit(req.query.limit, 50);
    const offset = Number(req.query.offset) || 0;

    if (!category) {
      successResponse(res, { items: [], categories: [] });
      return;
    }

    const items = await fetchMenuItemsByCategory(category, limit, offset);
    
    const categories = await fetchTopCategories(20);

    successResponse(res, { items, categories });
  } catch (error) {
    next(error);
  }
};

/** GET /api/explore/menu-items */
export const getExploreMenuItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validated = exploreMenuItemsQuerySchema.parse(req.query);

    const categories = validated.categories
      ? validated.categories.split(",").map((s) => s.trim()).filter(Boolean)
      : validated.category
        ? [validated.category.trim()]
        : undefined;

    const dietaryTags = validated.dietaryTags
      ? validated.dietaryTags.split(",").map((s) => s.trim()).filter(Boolean)
      : validated.dietary
        ? validated.dietary.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;

    const restaurantIds = validated.restaurantIds
      ? validated.restaurantIds.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const cuisines = validated.cuisines
      ? validated.cuisines.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const result = await searchExploreMenuItems({
      search: validated.search || validated.q,
      categories,
      minPrice: validated.minPrice,
      maxPrice: validated.maxPrice,
      minRating: validated.minRating,
      openNow: validated.openNow,
      dietaryTags,
      restaurantIds,
      cuisines,
      sort: validated.sort,
      page: validated.page,
      limit: validated.limit,
    });

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

/** GET /api/explore/categories */
export const getExploreCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const categories = await fetchExploreCategories();
    successResponse(res, { categories });
  } catch (error) {
    next(error);
  }
};

