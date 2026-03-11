/**
 * Vendor controller – profile management and restaurant CRUD for vendors.
 */
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import VendorProfile from "../models/VendorProfile";
import Restaurant from "../models/Restaurant";
import { successResponse } from "../utils/response.util";
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import type { AuthRequest } from "../types";
import type {
  UpdateVendorProfileInput,
  CreateRestaurantInput,
  UpdateRestaurantInput,
} from "../validations/vendor.validation";

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

/** Get the vendor profile for the authenticated user, or throw. */
const getVendorProfile = async (req: Request) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) throw new AuthenticationError();

  const profile = await VendorProfile.findOne({ userId: authReq.user._id });
  if (!profile) throw new NotFoundError("Vendor profile not found");

  return { authReq, profile };
};

/** Verify the vendor owns the given restaurant. */
const verifyOwnership = (
  profile: InstanceType<typeof VendorProfile>,
  restaurantId: string,
) => {
  if (!profile.restaurantIds.some((id) => id.toString() === restaurantId)) {
    throw new AuthorizationError(
      "You do not have permission to manage this restaurant",
    );
  }
};

// ────────────────────────────────────────────────────────────────
// Profile
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/vendor/profile
 * Get the authenticated vendor's profile with linked restaurants.
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { authReq, profile } = await getVendorProfile(req);

    const populatedProfile = await VendorProfile.findById(profile._id)
      .populate(
        "restaurantIds",
        "name images.logo isActive approvalStatus rating",
      )
      .lean();

    successResponse(res, {
      user: {
        id: authReq.user!._id,
        email: authReq.user!.email,
        firstName: authReq.user!.firstName,
        lastName: authReq.user!.lastName,
        phoneNumber: authReq.user!.phoneNumber,
        profileImage: authReq.user!.profileImage,
      },
      vendorProfile: populatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/vendor/profile
 * Update vendor business details.
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);
    const updates = req.body as UpdateVendorProfileInput;

    if (updates.businessName !== undefined)
      profile.businessName = updates.businessName;
    if (updates.businessLicense !== undefined)
      profile.businessLicense = updates.businessLicense;
    if (updates.taxId !== undefined) profile.taxId = updates.taxId;

    await profile.save();

    successResponse(res, { vendorProfile: profile }, "Profile updated");
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// Restaurant Management
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/vendor/restaurants
 * List all restaurants owned by the authenticated vendor.
 */
export const getMyRestaurants = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);

    const restaurants = await Restaurant.find({
      _id: { $in: profile.restaurantIds },
    })
      .select("-__v")
      .sort({ createdAt: -1 });

    successResponse(res, { restaurants, count: restaurants.length });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/vendor/restaurants/:restaurantId
 * Get details of a specific restaurant owned by the vendor.
 */
export const getMyRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);
    const restaurantId = req.params.restaurantId as string;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new ValidationError("Invalid restaurant ID format");
    }

    verifyOwnership(profile, restaurantId);

    const restaurant = await Restaurant.findById(restaurantId).select("-__v");
    if (!restaurant) throw new NotFoundError("Restaurant not found");

    successResponse(res, { restaurant });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/vendor/restaurants
 * Create a new restaurant and link it to the vendor profile.
 */
export const createMyRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);
    const data = req.body as CreateRestaurantInput;

    const restaurant = new Restaurant({
      ...data,
      approvalStatus: "pending",
      isActive: true,
    });
    await restaurant.save();

    // Link restaurant to vendor profile
    profile.restaurantIds.push(restaurant._id as mongoose.Types.ObjectId);
    await profile.save();

    successResponse(
      res,
      { restaurant },
      "Restaurant created successfully. It will be available after approval.",
      201,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/vendor/restaurants/:restaurantId
 * Update a restaurant owned by the vendor.
 */
export const updateMyRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);
    const restaurantId = req.params.restaurantId as string;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new ValidationError("Invalid restaurant ID format");
    }

    verifyOwnership(profile, restaurantId);

    const updates = req.body as UpdateRestaurantInput;

    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      updates,
      { new: true, runValidators: true },
    ).select("-__v");

    if (!restaurant) throw new NotFoundError("Restaurant not found");

    successResponse(res, { restaurant }, "Restaurant updated");
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/vendor/restaurants/:restaurantId
 * Soft-delete a restaurant owned by the vendor.
 */
export const deleteMyRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);
    const restaurantId = req.params.restaurantId as string;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new ValidationError("Invalid restaurant ID format");
    }

    verifyOwnership(profile, restaurantId);

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) throw new NotFoundError("Restaurant not found");

    // Soft-delete: deactivate instead of hard-deleting
    restaurant.isActive = false;
    await restaurant.save();

    successResponse(res, null, "Restaurant deactivated");
  } catch (error) {
    next(error);
  }
};
