/**
 * Menu controller – menu items and categories for restaurants.
 */
import { Request, Response, NextFunction } from "express";
import MenuItem from "../models/MenuItem";
import MenuCategory from "../models/MenuCategory";
import { successResponse } from "../utils/response.util";
import { NotFoundError, ValidationError } from "../utils/errors";
import mongoose from "mongoose";

/**
 * GET /api/restaurants/:restaurantId/menu
 * Get all menu items for a restaurant, grouped by category.
 */
export const getMenu = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new ValidationError("Invalid restaurant ID");
    }

    const categories = await MenuCategory.find({
      restaurantId,
      isActive: true,
    }).sort("displayOrder");

    const items = await MenuItem.find({
      restaurantId,
      isAvailable: true,
    }).sort("name");

    successResponse(res, { categories, items });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/restaurants/:restaurantId/menu/:itemId
 * Get a single menu item.
 */
export const getMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { itemId } = req.params;

    const item = await MenuItem.findById(itemId);
    if (!item) throw new NotFoundError("Menu item not found");

    successResponse(res, { item });
  } catch (error) {
    next(error);
  }
};
