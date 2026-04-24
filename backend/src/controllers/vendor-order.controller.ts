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
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
  [OrderStatus.PICKED_UP]: [OrderStatus.DELIVERED],
};

const STATUS_LABELS: Record<string, string> = {
  [OrderStatus.CONFIRMED]: "Confirmed",
  [OrderStatus.PREPARING]: "Being Prepared",
  [OrderStatus.READY]: "Ready for Pickup",
  [OrderStatus.PICKED_UP]: "Picked Up",
  [OrderStatus.DELIVERED]: "Delivered",
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
 * List orders for the vendor's restaurants with advanced filtering.
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
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const search = req.query.search as string | undefined;
    const restaurantId = req.query.restaurantId as string | undefined;
    const sortBy = (req.query.sortBy as string) || "-createdAt";

    // Build filter
    const matchRestaurants =
      restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)
        ? [new mongoose.Types.ObjectId(restaurantId)]
        : restaurantIds;

    const filter: Record<string, unknown> = {
      restaurantId: { $in: matchRestaurants },
    };

    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      filter.status = status;
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      filter.createdAt = dateFilter;
    }

    if (search) {
      filter.orderNumber = { $regex: search, $options: "i" };
    }

    // Parse sort
    const sortMap: Record<string, Record<string, 1 | -1>> = {
      "-createdAt": { createdAt: -1 },
      createdAt: { createdAt: 1 },
      "-total": { total: -1 },
      total: { total: 1 },
    };
    const sortObj = sortMap[sortBy] || { createdAt: -1 };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("customerId", "firstName lastName phoneNumber")
        .populate("restaurantId", "name images.logo")
        .sort(sortObj)
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

    if (newStatus === OrderStatus.DELIVERED) {
      order.actualDeliveryTime = new Date();
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
