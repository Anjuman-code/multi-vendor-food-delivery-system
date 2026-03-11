/**
 * Vendor menu controller – CRUD for menu categories and items.
 * All operations are scoped to restaurants owned by the authenticated vendor.
 */
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import VendorProfile from "../models/VendorProfile";
import MenuItem from "../models/MenuItem";
import MenuCategory from "../models/MenuCategory";
import { successResponse } from "../utils/response.util";
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import type { AuthRequest } from "../types";
import type {
  CreateMenuCategoryInput,
  UpdateMenuCategoryInput,
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "../validations/vendor.validation";

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

/** Verify the authenticated vendor owns the restaurant. */
const verifyRestaurantOwnership = async (req: Request) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) throw new AuthenticationError();

  const restaurantId = req.params.restaurantId as string;
  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    throw new ValidationError("Invalid restaurant ID format");
  }

  const profile = await VendorProfile.findOne({ userId: authReq.user._id });
  if (!profile) throw new NotFoundError("Vendor profile not found");

  if (!profile.restaurantIds.some((id) => id.toString() === restaurantId)) {
    throw new AuthorizationError(
      "You do not have permission to manage this restaurant's menu",
    );
  }

  return { restaurantId, profile };
};

// ────────────────────────────────────────────────────────────────
// Categories
// ────────────────────────────────────────────────────────────────

/**
 * POST /api/vendor/restaurants/:restaurantId/menu/categories
 */
export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantId } = await verifyRestaurantOwnership(req);
    const data = req.body as CreateMenuCategoryInput;

    const category = await MenuCategory.create({
      ...data,
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
    });

    successResponse(res, { category }, "Category created", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/vendor/restaurants/:restaurantId/menu/categories/:categoryId
 */
export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantId } = await verifyRestaurantOwnership(req);
    const categoryId = req.params.categoryId as string;

    const category = await MenuCategory.findOneAndUpdate(
      {
        _id: categoryId,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      },
      req.body as UpdateMenuCategoryInput,
      { new: true, runValidators: true },
    );

    if (!category) throw new NotFoundError("Category not found");

    successResponse(res, { category }, "Category updated");
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/vendor/restaurants/:restaurantId/menu/categories/:categoryId
 */
export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantId } = await verifyRestaurantOwnership(req);
    const categoryId = req.params.categoryId as string;

    const category = await MenuCategory.findOneAndDelete({
      _id: categoryId,
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
    });

    if (!category) throw new NotFoundError("Category not found");

    // Unset categoryId on any items that were in this category
    await MenuItem.updateMany(
      {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        categoryId: new mongoose.Types.ObjectId(categoryId),
      },
      { $unset: { categoryId: "" } },
    );

    successResponse(res, null, "Category deleted");
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// Menu Items
// ────────────────────────────────────────────────────────────────

/**
 * POST /api/vendor/restaurants/:restaurantId/menu/items
 */
export const createItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantId } = await verifyRestaurantOwnership(req);
    const data = req.body as CreateMenuItemInput;

    // Validate categoryId belongs to this restaurant if provided
    if (data.categoryId) {
      if (!mongoose.Types.ObjectId.isValid(data.categoryId)) {
        throw new ValidationError("Invalid category ID format");
      }
      const categoryExists = await MenuCategory.findOne({
        _id: data.categoryId,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });
      if (!categoryExists) {
        throw new NotFoundError("Category not found for this restaurant");
      }
    }

    const item = await MenuItem.create({
      ...data,
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      categoryId: data.categoryId
        ? new mongoose.Types.ObjectId(data.categoryId)
        : undefined,
    });

    successResponse(res, { item }, "Menu item created", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/vendor/restaurants/:restaurantId/menu/items/:itemId
 */
export const updateItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantId } = await verifyRestaurantOwnership(req);
    const itemId = req.params.itemId as string;
    const data = req.body as UpdateMenuItemInput;

    // Validate categoryId if being updated
    if (data.categoryId) {
      if (!mongoose.Types.ObjectId.isValid(data.categoryId)) {
        throw new ValidationError("Invalid category ID format");
      }
      const categoryExists = await MenuCategory.findOne({
        _id: data.categoryId,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });
      if (!categoryExists) {
        throw new NotFoundError("Category not found for this restaurant");
      }
    }

    // Build update object, handling nullable categoryId
    const updateData: Record<string, unknown> = { ...data };
    if (data.categoryId === null) {
      delete updateData.categoryId;
      // Use $unset for null categoryId
      const item = await MenuItem.findOneAndUpdate(
        {
          _id: itemId,
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
        },
        { ...updateData, $unset: { categoryId: "" } },
        { new: true, runValidators: true },
      );
      if (!item) throw new NotFoundError("Menu item not found");
      successResponse(res, { item }, "Menu item updated");
      return;
    }

    if (data.categoryId) {
      updateData.categoryId = new mongoose.Types.ObjectId(data.categoryId);
    }

    const item = await MenuItem.findOneAndUpdate(
      {
        _id: itemId,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      },
      updateData,
      { new: true, runValidators: true },
    );

    if (!item) throw new NotFoundError("Menu item not found");

    successResponse(res, { item }, "Menu item updated");
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/vendor/restaurants/:restaurantId/menu/items/:itemId
 */
export const deleteItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantId } = await verifyRestaurantOwnership(req);
    const itemId = req.params.itemId as string;

    const item = await MenuItem.findOneAndDelete({
      _id: itemId,
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
    });

    if (!item) throw new NotFoundError("Menu item not found");

    successResponse(res, null, "Menu item deleted");
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/vendor/restaurants/:restaurantId/menu/items/:itemId/availability
 */
export const toggleItemAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantId } = await verifyRestaurantOwnership(req);
    const itemId = req.params.itemId as string;

    const item = await MenuItem.findOne({
      _id: itemId,
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
    });

    if (!item) throw new NotFoundError("Menu item not found");

    item.isAvailable = !item.isAvailable;
    await item.save();

    successResponse(
      res,
      { item },
      `Item marked as ${item.isAvailable ? "available" : "unavailable"}`,
    );
  } catch (error) {
    next(error);
  }
};
