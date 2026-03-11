/**
 * Review controller – CRUD + voting for customer reviews.
 */
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Review from "../models/Review";
import Order, { OrderStatus } from "../models/Order";
import Restaurant from "../models/Restaurant";
import { successResponse } from "../utils/response.util";
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../utils/errors";
import type { AuthRequest } from "../types";

/**
 * POST /api/reviews
 * Create a review for a delivered order.
 */
export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { orderId, rating, title, comment, images } = req.body;

    if (!orderId || !rating || !comment) {
      throw new ValidationError("orderId, rating, and comment are required");
    }
    if (rating < 1 || rating > 5) {
      throw new ValidationError("Rating must be between 1 and 5");
    }

    const order = await Order.findOne({
      _id: orderId,
      customerId: authReq.user._id,
    });
    if (!order) throw new NotFoundError("Order not found");
    if (order.status !== OrderStatus.DELIVERED) {
      throw new ValidationError("You can only review delivered orders");
    }

    const existing = await Review.findOne({
      customerId: authReq.user._id,
      orderId,
    });
    if (existing) throw new ConflictError("You already reviewed this order");

    const review = await Review.create({
      customerId: authReq.user._id,
      restaurantId: order.restaurantId,
      orderId,
      rating,
      title,
      comment,
      images: images || [],
    });

    // Recalculate restaurant rating
    const stats = await Review.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(
            order.restaurantId.toString(),
          ),
        },
      },
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await Restaurant.findByIdAndUpdate(order.restaurantId, {
        rating: {
          average: Math.round(stats[0].average * 10) / 10,
          count: stats[0].count,
        },
      });
    }

    successResponse(res, { review }, "Review submitted", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/restaurants/:restaurantId/reviews
 * Get reviews for a restaurant.
 */
export const getRestaurantReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new ValidationError("Invalid restaurant ID");
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );

    const [reviews, total] = await Promise.all([
      Review.find({ restaurantId })
        .populate("customerId", "firstName lastName profileImage")
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(limit),
      Review.countDocuments({ restaurantId }),
    ]);

    successResponse(res, {
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reviews/me
 * Get logged-in user's reviews.
 */
export const getMyReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const reviews = await Review.find({ customerId: authReq.user._id })
      .populate("restaurantId", "name images.logo")
      .sort("-createdAt");

    successResponse(res, { reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/reviews/:reviewId
 * Delete own review.
 */
export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const review = await Review.findOne({
      _id: req.params.reviewId,
      customerId: authReq.user._id,
    });
    if (!review) throw new NotFoundError("Review not found");

    const restaurantId = review.restaurantId;
    await review.deleteOne();

    // Recalculate restaurant rating
    const stats = await Review.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId.toString()),
        },
      },
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const newRating =
      stats.length > 0
        ? {
            average: Math.round(stats[0].average * 10) / 10,
            count: stats[0].count,
          }
        : { average: 0, count: 0 };

    await Restaurant.findByIdAndUpdate(restaurantId, { rating: newRating });

    successResponse(res, null, "Review deleted");
  } catch (error) {
    next(error);
  }
};
