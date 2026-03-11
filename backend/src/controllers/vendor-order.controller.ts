/**
 * Vendor order controller – view and manage orders for vendor's restaurants.
 */
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import VendorProfile from "../models/VendorProfile";
import Order, { OrderStatus } from "../models/Order";
import Notification, { NotificationType } from "../models/Notification";
import { successResponse } from "../utils/response.util";
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import type { AuthRequest } from "../types";
import type { UpdateOrderStatusInput } from "../validations/vendor.validation";

// ────────────────────────────────────────────────────────────────
// Valid status transitions for vendors
// ────────────────────────────────────────────────────────────────

const VENDOR_STATUS_TRANSITIONS: Record<string, string[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
};

const STATUS_LABELS: Record<string, string> = {
  [OrderStatus.CONFIRMED]: "Confirmed",
  [OrderStatus.PREPARING]: "Being Prepared",
  [OrderStatus.READY]: "Ready for Pickup",
  [OrderStatus.CANCELLED]: "Cancelled by Restaurant",
};

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

/** Get the vendor profile and their restaurant IDs. */
const getVendorRestaurantIds = async (req: Request) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) throw new AuthenticationError();

  const profile = await VendorProfile.findOne({ userId: authReq.user._id });
  if (!profile) throw new NotFoundError("Vendor profile not found");

  return { authReq, profile, restaurantIds: profile.restaurantIds };
};

// ────────────────────────────────────────────────────────────────
// Controllers
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/vendor/orders
 * List orders for the vendor's restaurants.
 */
export const getVendorOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantIds } = await getVendorRestaurantIds(req);

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = {
      restaurantId: { $in: restaurantIds },
    };
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      filter.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("customerId", "firstName lastName phoneNumber")
        .populate("restaurantId", "name images.logo")
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    successResponse(res, {
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/vendor/orders/:orderId
 * Get order details (must belong to vendor's restaurant).
 */
export const getVendorOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantIds } = await getVendorRestaurantIds(req);
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      restaurantId: { $in: restaurantIds },
    })
      .populate("customerId", "firstName lastName phoneNumber email")
      .populate("restaurantId", "name images.logo contactInfo");

    if (!order) throw new NotFoundError("Order not found");

    successResponse(res, { order });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/vendor/orders/:orderId/status
 * Update order status (vendor can confirm, prepare, mark ready, or cancel).
 */
export const updateVendorOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantIds } = await getVendorRestaurantIds(req);
    const { orderId } = req.params;
    const { status: newStatus, note } = req.body as UpdateOrderStatusInput;

    const order = await Order.findOne({
      _id: orderId,
      restaurantId: { $in: restaurantIds },
    });

    if (!order) throw new NotFoundError("Order not found");

    // Validate status transition
    const allowedTransitions = VENDOR_STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from "${order.status}" to "${newStatus}"`,
      );
    }

    // Apply status change
    order.status = newStatus as OrderStatus;
    order.statusHistory.push({
      status: newStatus as OrderStatus,
      timestamp: new Date(),
      note,
    });

    if (newStatus === OrderStatus.CANCELLED) {
      order.cancelReason = note || "Cancelled by restaurant";
    }

    await order.save();

    // Notify the customer
    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    await Notification.create({
      userId: order.customerId,
      type: NotificationType.ORDER_UPDATE,
      title: `Order ${statusLabel}`,
      message: `Your order ${order.orderNumber} is now ${statusLabel.toLowerCase()}.`,
      data: { orderId: order._id, status: newStatus },
    });

    successResponse(res, { order }, `Order status updated to ${newStatus}`);
  } catch (error) {
    next(error);
  }
};
