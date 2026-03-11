/**
 * Order controller – create, list, detail, cancel, and reorder.
 */
import { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import crypto from "crypto";
import Order, { OrderStatus, PaymentStatus } from "../models/Order";
import MenuItem from "../models/MenuItem";
import CustomerProfile from "../models/CustomerProfile";
import Notification, { NotificationType } from "../models/Notification";
import Coupon, { CouponType } from "../models/Coupon";
import { successResponse } from "../utils/response.util";
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import type { AuthRequest } from "../types";

/** Generate a unique order number: ORD-XXXXXXXX */
const generateOrderNumber = (): string => {
  const hex = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `ORD-${hex}`;
};

/**
 * POST /api/orders
 * Place a new order.
 */
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const {
      restaurantId,
      items,
      deliveryAddress,
      paymentMethod,
      couponCode,
      specialInstructions,
    } = req.body;

    if (!restaurantId || !items?.length || !deliveryAddress || !paymentMethod) {
      throw new ValidationError("Missing required order fields");
    }

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new ValidationError("Invalid restaurant ID");
    }

    // Verify menu items and compute totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        throw new NotFoundError(`Menu item ${item.menuItemId} not found`);
      }
      if (!menuItem.isAvailable) {
        throw new ValidationError(`${menuItem.name} is currently unavailable`);
      }

      const quantity = Math.max(1, Math.floor(item.quantity));

      let itemPrice = menuItem.price;
      const variants = item.variants || [];
      const addons = item.addons || [];

      for (const v of variants) itemPrice += v.price ?? 0;
      for (const a of addons) itemPrice += a.price ?? 0;

      const itemTotal = itemPrice * quantity;
      subtotal += itemTotal;

      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity,
        variants,
        addons,
        specialInstructions: item.specialInstructions,
        itemTotal,
      });
    }

    // Coupon validation
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validTo: { $gte: new Date() },
      });

      if (coupon) {
        if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
          throw new ValidationError("Coupon usage limit reached");
        }
        if (subtotal < coupon.minOrderAmount) {
          throw new ValidationError(
            `Minimum order amount for this coupon is ${coupon.minOrderAmount}`,
          );
        }
        if (
          coupon.applicableRestaurants.length > 0 &&
          !coupon.applicableRestaurants.some(
            (id) => id.toString() === restaurantId,
          )
        ) {
          throw new ValidationError("Coupon is not valid for this restaurant");
        }

        discount =
          coupon.type === CouponType.PERCENTAGE
            ? Math.min(
                (subtotal * coupon.value) / 100,
                coupon.maxDiscount ?? Infinity,
              )
            : Math.min(coupon.value, subtotal);

        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const TAX_RATE = 0.05;
    const DELIVERY_FEE = 50; // Default fee – can be restaurant-specific
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = subtotal + tax + DELIVERY_FEE - discount;

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customerId: authReq.user._id,
      restaurantId: new Types.ObjectId(restaurantId),
      items: orderItems,
      deliveryAddress,
      paymentMethod,
      paymentStatus: PaymentStatus.PAID,
      subtotal,
      tax,
      deliveryFee: DELIVERY_FEE,
      discount,
      total: Math.max(total, 0),
      couponCode: couponCode?.toUpperCase(),
      specialInstructions,
      estimatedDeliveryTime: "30-45 min",
      statusHistory: [{ status: OrderStatus.PENDING, timestamp: new Date() }],
    });

    // Update customer stats
    const profile = await CustomerProfile.findOne({
      userId: authReq.user._id,
    });
    if (profile) {
      profile.totalOrders += 1;
      profile.totalSpent += order.total;
      profile.averageOrderValue = profile.totalSpent / profile.totalOrders;
      profile.loyaltyPoints += Math.floor(order.total);
      await profile.save();
    }

    // Create notification
    await Notification.create({
      userId: authReq.user._id,
      type: NotificationType.ORDER_UPDATE,
      title: "Order Placed!",
      message: `Your order ${order.orderNumber} has been placed successfully.`,
      data: { orderId: order._id },
    });

    successResponse(res, { order }, "Order placed successfully", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/orders
 * List orders for the authenticated customer.
 */
export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = {
      customerId: authReq.user._id,
    };
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      filter.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
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
 * GET /api/orders/:orderId
 * Get order details.
 */
export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      customerId: authReq.user._id,
    }).populate("restaurantId", "name images.logo contactInfo");

    if (!order) throw new NotFoundError("Order not found");

    successResponse(res, { order });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/orders/:orderId/cancel
 * Cancel an order (only when pending/confirmed).
 */
export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      customerId: authReq.user._id,
    });
    if (!order) throw new NotFoundError("Order not found");

    const cancellableStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
    if (!cancellableStatuses.includes(order.status)) {
      throw new ValidationError("Order cannot be cancelled at this stage");
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelReason = reason || "Cancelled by customer";
    order.statusHistory.push({
      status: OrderStatus.CANCELLED,
      timestamp: new Date(),
      note: reason,
    });
    await order.save();

    await Notification.create({
      userId: authReq.user._id,
      type: NotificationType.ORDER_UPDATE,
      title: "Order Cancelled",
      message: `Your order ${order.orderNumber} has been cancelled.`,
      data: { orderId: order._id },
    });

    successResponse(res, { order }, "Order cancelled");
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/orders/:orderId/reorder
 * Reorder – copies items into a response for the frontend to put in cart.
 */
export const reorder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      customerId: authReq.user._id,
    });
    if (!order) throw new NotFoundError("Order not found");

    // Check each item is still available
    const cartItems = [];
    for (const item of order.items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      cartItems.push({
        menuItemId: item.menuItemId,
        name: item.name,
        price: menuItem?.price ?? item.price,
        quantity: item.quantity,
        variants: item.variants,
        addons: item.addons,
        isAvailable: menuItem?.isAvailable ?? false,
      });
    }

    successResponse(res, {
      restaurantId: order.restaurantId,
      items: cartItems,
    });
  } catch (error) {
    next(error);
  }
};
