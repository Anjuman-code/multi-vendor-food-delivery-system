/**
 * Vendor coupon controller – CRUD for promotions/discount coupons.
 * All operations verify the vendor owns the applicable restaurants.
 */
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import VendorProfile from "../models/VendorProfile";
import Coupon from "../models/Coupon";
import Order, { OrderStatus } from "../models/Order";
import { successResponse } from "../utils/response.util";
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import type { AuthRequest } from "../types";
import type {
  CreateCouponInput,
  UpdateCouponInput,
} from "../validations/vendor.validation";

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

const getVendorProfile = async (req: Request) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) throw new AuthenticationError();

  const profile = await VendorProfile.findOne({ userId: authReq.user._id });
  if (!profile) throw new NotFoundError("Vendor profile not found");

  return { authReq, profile };
};

/** Verify all applicable restaurants belong to the vendor. */
const verifyRestaurantOwnership = (
  profile: InstanceType<typeof VendorProfile>,
  restaurantIds: string[],
) => {
  const owned = new Set(profile.restaurantIds.map((id) => id.toString()));
  for (const rid of restaurantIds) {
    if (!owned.has(rid)) {
      throw new AuthorizationError(
        "You can only create coupons for your own restaurants",
      );
    }
  }
};

// ────────────────────────────────────────────────────────────────
// Controllers
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/vendor/coupons
 * List coupons for the vendor's restaurants.
 */
export const getVendorCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = {
      applicableRestaurants: { $in: profile.restaurantIds },
    };

    if (status === "active") {
      filter.isActive = true;
      filter.validTo = { $gte: new Date() };
    } else if (status === "expired") {
      filter.$or = [{ validTo: { $lt: new Date() } }, { isActive: false }];
    }

    const coupons = await Coupon.find(filter).sort("-createdAt");

    successResponse(res, { coupons, count: coupons.length });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/vendor/coupons
 * Create a new coupon scoped to vendor's restaurants.
 */
export const createVendorCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);
    const data = req.body as CreateCouponInput;

    // If no restaurants specified, apply to all vendor's restaurants
    const applicableRestaurants =
      data.applicableRestaurants && data.applicableRestaurants.length > 0
        ? data.applicableRestaurants
        : profile.restaurantIds.map((id) => id.toString());

    verifyRestaurantOwnership(profile, applicableRestaurants);

    const coupon = await Coupon.create({
      ...data,
      applicableRestaurants: applicableRestaurants.map(
        (restaurantId) => new mongoose.Types.ObjectId(restaurantId),
      ),
    });

    successResponse(res, { coupon }, "Coupon created", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/vendor/coupons/:couponId
 * Update an existing coupon.
 */
export const updateVendorCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);
    const { couponId } = req.params;

    const coupon = await Coupon.findById(couponId);
    if (!coupon) throw new NotFoundError("Coupon not found");

    // Verify ownership
    const owned = new Set(profile.restaurantIds.map((id) => id.toString()));
    const isOwned = coupon.applicableRestaurants.some((id) =>
      owned.has(id.toString()),
    );
    if (!isOwned) {
      throw new AuthorizationError("You do not own this coupon");
    }

    const updates = req.body as UpdateCouponInput;

    if (updates.applicableRestaurants) {
      verifyRestaurantOwnership(profile, updates.applicableRestaurants);
    }

    Object.assign(coupon, updates);
    await coupon.save();

    successResponse(res, { coupon }, "Coupon updated");
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/vendor/coupons/:couponId
 * Deactivate a coupon (soft delete).
 */
export const deleteVendorCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);
    const { couponId } = req.params;

    const coupon = await Coupon.findById(couponId);
    if (!coupon) throw new NotFoundError("Coupon not found");

    const owned = new Set(profile.restaurantIds.map((id) => id.toString()));
    const isOwned = coupon.applicableRestaurants.some((id) =>
      owned.has(id.toString()),
    );
    if (!isOwned) {
      throw new AuthorizationError("You do not own this coupon");
    }

    coupon.isActive = false;
    await coupon.save();

    successResponse(res, null, "Coupon deactivated");
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/vendor/coupons/:couponId/stats
 * Usage statistics for a specific coupon.
 */
export const getCouponStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);
    const { couponId } = req.params;

    const coupon = await Coupon.findById(couponId);
    if (!coupon) throw new NotFoundError("Coupon not found");

    const owned = new Set(profile.restaurantIds.map((id) => id.toString()));
    const isOwned = coupon.applicableRestaurants.some((id) =>
      owned.has(id.toString()),
    );
    if (!isOwned) {
      throw new AuthorizationError("You do not own this coupon");
    }

    // Get orders that used this coupon
    const orderStats = await Order.aggregate([
      {
        $match: {
          couponCode: coupon.code,
          status: { $ne: OrderStatus.CANCELLED },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalDiscount: { $sum: "$discount" },
          totalRevenue: { $sum: "$total" },
        },
      },
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalDiscount: 0,
      totalRevenue: 0,
    };

    successResponse(res, {
      coupon,
      stats: {
        usedCount: coupon.usedCount,
        usageLimit: coupon.usageLimit,
        totalOrders: stats.totalOrders,
        totalDiscount: stats.totalDiscount,
        totalRevenue: stats.totalRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};
