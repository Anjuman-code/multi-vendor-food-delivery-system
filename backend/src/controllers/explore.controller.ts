/**
 * Explore controller – public discovery endpoints for the home page.
 */
import { Request, Response, NextFunction } from "express";
import { successResponse } from "../utils/response.util";
import {
  fetchTopCategories,
  fetchTrendingItems,
  fetchPopularRestaurants,
} from "../services/explore.service";

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
