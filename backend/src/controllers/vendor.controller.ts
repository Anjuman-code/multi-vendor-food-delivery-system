/**
 * Vendor controller – profile management, restaurant CRUD, dashboard & analytics.
 */
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import VendorProfile from "../models/VendorProfile";
import Restaurant from "../models/Restaurant";
import Order, { OrderStatus } from "../models/Order";
import MenuItem from "../models/MenuItem";
import Review from "../models/Review";
import Notification, { NotificationType } from "../models/Notification";
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

// ────────────────────────────────────────────────────────────────
// Dashboard Stats
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/vendor/dashboard
 * Aggregate dashboard statistics across all vendor restaurants.
 */
export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);
    const restaurantIds = profile.restaurantIds;

    if (restaurantIds.length === 0) {
      successResponse(res, {
        totalRevenue: 0,
        totalOrders: 0,
        todayRevenue: 0,
        todayOrders: 0,
        pendingOrders: 0,
        avgOrderValue: 0,
        averageRating: 0,
        ordersByStatus: [],
        recentOrders: [],
        popularItems: [],
      });
      return;
    }

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Parallel aggregations
    const [
      totalStats,
      todayStats,
      ordersByStatus,
      recentOrders,
      popularItems,
      restaurants,
    ] = await Promise.all([
      // Total revenue and count (delivered orders)
      Order.aggregate([
        {
          $match: {
            restaurantId: { $in: restaurantIds },
            status: OrderStatus.DELIVERED,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: "$total" },
          },
        },
      ]),

      // Today's stats
      Order.aggregate([
        {
          $match: {
            restaurantId: { $in: restaurantIds },
            createdAt: { $gte: todayStart },
          },
        },
        {
          $group: {
            _id: null,
            todayRevenue: {
              $sum: {
                $cond: [
                  { $ne: ["$status", OrderStatus.CANCELLED] },
                  "$total",
                  0,
                ],
              },
            },
            todayOrders: { $sum: 1 },
          },
        },
      ]),

      // Orders by status
      Order.aggregate([
        { $match: { restaurantId: { $in: restaurantIds } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Recent 5 orders
      Order.find({ restaurantId: { $in: restaurantIds } })
        .populate("customerId", "firstName lastName")
        .populate("restaurantId", "name")
        .sort("-createdAt")
        .limit(5)
        .lean(),

      // Top 5 popular items by frequency
      Order.aggregate([
        {
          $match: {
            restaurantId: { $in: restaurantIds },
            status: { $ne: OrderStatus.CANCELLED },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.menuItemId",
            name: { $first: "$items.name" },
            totalOrdered: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.itemTotal" },
          },
        },
        { $sort: { totalOrdered: -1 } },
        { $limit: 5 },
      ]),

      // Restaurants for avg rating
      Restaurant.find({ _id: { $in: restaurantIds } })
        .select("rating")
        .lean(),
    ]);

    const total = totalStats[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
    };
    const today = todayStats[0] || { todayRevenue: 0, todayOrders: 0 };

    const ordersByStatusArray = ordersByStatus.map(
      (s: { _id: string; count: number }) => ({
        status: s._id,
        count: s.count,
      }),
    );
    const pendingCount =
      ordersByStatus.find((s: { _id: string }) => s._id === OrderStatus.PENDING)
        ?.count ?? 0;

    const averageRating =
      restaurants.length > 0
        ? restaurants.reduce((sum, r) => sum + (r.rating?.average || 0), 0) /
          restaurants.length
        : 0;

    const transformedRecentOrders = recentOrders.map((order) => {
      const c = order.customerId as {
        firstName?: string;
        lastName?: string;
      } | null;
      const customerName =
        c && typeof c === "object"
          ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—"
          : "—";
      return { ...order, customer: { name: customerName } };
    });

    const transformedPopularItems = popularItems.map(
      (item: {
        _id: string;
        name: string;
        totalOrdered: number;
        totalRevenue: number;
      }) => ({ ...item, orderCount: item.totalOrdered }),
    );

    successResponse(res, {
      totalRevenue: total.totalRevenue,
      totalOrders: total.totalOrders,
      avgOrderValue: Math.round((total.avgOrderValue || 0) * 100) / 100,
      todayRevenue: today.todayRevenue,
      todayOrders: today.todayOrders,
      pendingOrders: pendingCount,
      averageRating: Math.round(averageRating * 10) / 10,
      ordersByStatus: ordersByStatusArray,
      recentOrders: transformedRecentOrders,
      popularItems: transformedPopularItems,
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// Analytics
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/vendor/analytics?period=7d|30d|90d|12m
 * Time-series analytics for the vendor's restaurants.
 */
export const getAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);
    const restaurantIds = profile.restaurantIds;
    const period = (req.query.period as string) || "7d";

    const now = new Date();
    let startDate: Date;
    let groupFormat: string;

    switch (period) {
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupFormat = "%Y-%m-%d";
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        groupFormat = "%Y-%U"; // week
        break;
      case "12m":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        groupFormat = "%Y-%m";
        break;
      default: // 7d
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupFormat = "%Y-%m-%d";
    }

    const baseMatch = {
      restaurantId: { $in: restaurantIds },
      createdAt: { $gte: startDate },
    };

    const [revenueOverTime, topSellingItems, peakHours, completionStats] =
      await Promise.all([
        // Revenue & order count over time
        Order.aggregate([
          { $match: { ...baseMatch, status: { $ne: OrderStatus.CANCELLED } } },
          {
            $group: {
              _id: {
                $dateToString: { format: groupFormat, date: "$createdAt" },
              },
              revenue: { $sum: "$total" },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // Top selling items
        Order.aggregate([
          { $match: { ...baseMatch, status: { $ne: OrderStatus.CANCELLED } } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.menuItemId",
              name: { $first: "$items.name" },
              quantity: { $sum: "$items.quantity" },
              revenue: { $sum: "$items.itemTotal" },
            },
          },
          { $sort: { quantity: -1 } },
          { $limit: 10 },
        ]),

        // Peak order hours
        Order.aggregate([
          { $match: { ...baseMatch, status: { $ne: OrderStatus.CANCELLED } } },
          {
            $group: {
              _id: { $hour: "$createdAt" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // Completion rate
        Order.aggregate([
          { $match: baseMatch },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              delivered: {
                $sum: {
                  $cond: [{ $eq: ["$status", OrderStatus.DELIVERED] }, 1, 0],
                },
              },
              cancelled: {
                $sum: {
                  $cond: [{ $eq: ["$status", OrderStatus.CANCELLED] }, 1, 0],
                },
              },
            },
          },
        ]),
      ]);

    const stats = completionStats[0] || {
      total: 0,
      delivered: 0,
      cancelled: 0,
    };

    successResponse(res, {
      period,
      revenueOverTime: revenueOverTime.map((r) => ({
        date: r._id,
        revenue: r.revenue,
        orders: r.orders,
      })),
      topSellingItems,
      peakHours: peakHours.map((h) => ({ hour: h._id, orders: h.count })),
      completionRate:
        stats.total > 0
          ? Math.round((stats.delivered / stats.total) * 10000) / 100
          : 0,
      totalOrders: stats.total,
      deliveredOrders: stats.delivered,
      cancelledOrders: stats.cancelled,
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// Review Reply
// ────────────────────────────────────────────────────────────────

/**
 * POST /api/vendor/reviews/:reviewId/reply
 * Reply to a customer review on one of the vendor's restaurants.
 */
export const replyToReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profile } = await getVendorProfile(req);
    const { reviewId } = req.params;
    const { text } = req.body as { text: string };

    if (!text || text.trim().length === 0) {
      throw new ValidationError("Reply text is required");
    }
    if (text.length > 500) {
      throw new ValidationError("Reply cannot exceed 500 characters");
    }

    const review = await Review.findById(reviewId);
    if (!review) throw new NotFoundError("Review not found");

    // Verify review is for one of vendor's restaurants
    if (
      !profile.restaurantIds.some(
        (id) => id.toString() === review.restaurantId.toString(),
      )
    ) {
      throw new AuthorizationError(
        "You can only reply to reviews on your restaurants",
      );
    }

    review.reply = { text: text.trim(), repliedAt: new Date() };
    await review.save();

    // Notify customer
    await Notification.create({
      userId: review.customerId,
      type: NotificationType.REVIEW_REPLY,
      title: "Reply to your review",
      message: `The restaurant responded to your review.`,
      data: { reviewId: review._id, restaurantId: review.restaurantId },
    });

    successResponse(res, { review }, "Reply posted");
  } catch (error) {
    next(error);
  }
};
