/**
 * Order controller – create, list, detail, cancel, and reorder.
 */
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import Coupon, { CouponType } from "../models/Coupon";
import CustomerProfile from "../models/CustomerProfile";
import MenuItem from "../models/MenuItem";
import Notification, { NotificationType } from "../models/Notification";
import Order, { OrderStatus, PaymentStatus } from "../models/Order";
import VendorProfile from "../models/VendorProfile";
import { getIO } from "../socket";
import type { AuthRequest } from "../types";
import {
    AuthenticationError,
    NotFoundError,
    ValidationError,
} from "../utils/errors";
import { successResponse } from "../utils/response.util";

/** Generate a unique order number: ORD-XXXXXXXX */
const generateOrderNumber = (): string => {
  const hex = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `ORD-${hex}`;
};

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.PICKED_UP,
];

type RequestedItemOption = {
  optionId?: string;
  name?: string;
};

type TrustedItemOption = {
  name: string;
  price: number;
};

const parseStatusFilter = (statusQuery?: string): OrderStatus[] | undefined => {
  if (!statusQuery) return undefined;

  if (statusQuery === "active") {
    return ACTIVE_ORDER_STATUSES;
  }

  const parsed = statusQuery
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (parsed.length === 0) return undefined;

  const invalid = parsed.filter(
    (value) => !Object.values(OrderStatus).includes(value as OrderStatus),
  );
  if (invalid.length > 0) {
    throw new ValidationError(`Invalid order status filter: ${invalid.join(", ")}`);
  }

  return parsed as OrderStatus[];
};

const resolveRequestedOptions = (
  requested: RequestedItemOption[],
  available: Array<{ _id?: Types.ObjectId; name: string; price: number }>,
  optionType: "variant" | "addon",
  itemName: string,
): TrustedItemOption[] => {
  return requested.map((option) => {
    const byId =
      option.optionId &&
      available.find((candidate) => candidate._id?.toString() === option.optionId);

    const byName =
      option.name &&
      available.find(
        (candidate) =>
          candidate.name.trim().toLowerCase() === option.name?.trim().toLowerCase(),
      );

    const matched = byId ?? byName;
    if (!matched) {
      const identifier = option.name || option.optionId || "unknown";
      throw new ValidationError(
        `Invalid ${optionType} \"${identifier}\" for menu item \"${itemName}\"`,
      );
    }

    return { name: matched.name, price: matched.price };
  });
};

const resolveLegacyOptionsByName = (
  requested: Array<{ name: string; price: number }> | undefined,
  available: Array<{ _id?: Types.ObjectId; name: string; price: number }>,
): { trusted: TrustedItemOption[]; missing: string[] } => {
  if (!requested || requested.length === 0) {
    return { trusted: [], missing: [] };
  }

  const trusted: TrustedItemOption[] = [];
  const missing: string[] = [];

  for (const option of requested) {
    const match = available.find(
      (candidate) =>
        candidate.name.trim().toLowerCase() === option.name.trim().toLowerCase(),
    );
    if (!match) {
      missing.push(option.name);
      continue;
    }
    trusted.push({ name: match.name, price: match.price });
  }

  return { trusted, missing };
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

    const restaurantObjectId = new Types.ObjectId(restaurantId);

    // Verify menu items and compute totals
    let subtotal = 0;
    const orderItems: Array<{
      menuItemId: Types.ObjectId;
      name: string;
      price: number;
      quantity: number;
      variants: TrustedItemOption[];
      addons: TrustedItemOption[];
      specialInstructions?: string;
      itemTotal: number;
    }> = [];

    for (const item of items) {
      const menuItem = await MenuItem.findOne({
        _id: item.menuItemId,
        restaurantId: restaurantObjectId,
      });
      if (!menuItem) {
        throw new ValidationError(
          `Menu item ${item.menuItemId} is not available for this restaurant`,
        );
      }
      if (!menuItem.isAvailable) {
        throw new ValidationError(`${menuItem.name} is currently unavailable`);
      }

      const quantity = item.quantity;

      const variants = resolveRequestedOptions(
        item.variants || [],
        menuItem.variants,
        "variant",
        menuItem.name,
      );
      const addons = resolveRequestedOptions(
        item.addons || [],
        menuItem.addons,
        "addon",
        menuItem.name,
      );

      const itemPrice =
        menuItem.price +
        variants.reduce((sum, option) => sum + option.price, 0) +
        addons.reduce((sum, option) => sum + option.price, 0);

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
    let appliedCoupon: Awaited<ReturnType<typeof Coupon.findOne>> = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validTo: { $gte: new Date() },
      });

      if (!coupon) {
        throw new ValidationError("Invalid or expired coupon code");
      }

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
        !coupon.applicableRestaurants.some((id) => id.toString() === restaurantId)
      ) {
        throw new ValidationError("Coupon is not valid for this restaurant");
      }

      discount =
        coupon.type === CouponType.PERCENTAGE
          ? Math.min((subtotal * coupon.value) / 100, coupon.maxDiscount ?? Infinity)
          : Math.min(coupon.value, subtotal);
      appliedCoupon = coupon;
    }

    const TAX_RATE = 0.05;
    const DELIVERY_FEE = 50; // Default fee – can be restaurant-specific
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = subtotal + tax + DELIVERY_FEE - discount;

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customerId: authReq.user._id,
      restaurantId: restaurantObjectId,
      items: orderItems,
      deliveryAddress,
      paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
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

    if (appliedCoupon) {
      appliedCoupon.usedCount += 1;
      await appliedCoupon.save();
    }

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

    // Emit real-time newOrder event to the vendor who owns the restaurant
    try {
      const vendorProfile = await VendorProfile.findOne({
        restaurantIds: restaurantObjectId,
      });
      if (vendorProfile) {
        getIO()
          .to(`vendor:${vendorProfile.userId.toString()}`)
          .emit("newOrder", {
            _id: order._id.toString(),
            orderNumber: order.orderNumber,
            customerName: `${authReq.user.firstName} ${authReq.user.lastName}`,
            total: order.total,
            items: order.items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
            })),
            status: order.status,
            createdAt: order.createdAt,
          });
      }
    } catch {
      // Non-blocking – socket emission failure must not affect the HTTP response
    }

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
    const statusQuery = req.query.status as string | undefined;
    const statuses = parseStatusFilter(statusQuery);

    const filter: Record<string, unknown> = {
      customerId: authReq.user._id,
    };
    if (statuses && statuses.length > 0) {
      filter.status =
        statuses.length === 1 ? statuses[0] : { $in: statuses };
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
    const cartItems: Array<{
      menuItemId: string;
      name: string;
      price: number;
      image?: string;
      quantity: number;
      variants: TrustedItemOption[];
      addons: TrustedItemOption[];
      isAvailable: boolean;
      unavailableReason?: string;
    }> = [];

    let hasUnavailableItems = false;

    for (const item of order.items) {
      const menuItem = await MenuItem.findOne({
        _id: item.menuItemId,
        restaurantId: order.restaurantId,
      });

      if (!menuItem) {
        hasUnavailableItems = true;
        cartItems.push({
          menuItemId: item.menuItemId.toString(),
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          variants: item.variants || [],
          addons: item.addons || [],
          isAvailable: false,
          unavailableReason: "This menu item is no longer available",
        });
        continue;
      }

      const resolvedVariants = resolveLegacyOptionsByName(
        item.variants,
        menuItem.variants,
      );
      const resolvedAddons = resolveLegacyOptionsByName(item.addons, menuItem.addons);

      const missingOptions = [
        ...resolvedVariants.missing,
        ...resolvedAddons.missing,
      ];
      const isAvailable = menuItem.isAvailable && missingOptions.length === 0;

      if (!isAvailable) {
        hasUnavailableItems = true;
      }

      const trustedUnitPrice =
        menuItem.price +
        resolvedVariants.trusted.reduce((sum, option) => sum + option.price, 0) +
        resolvedAddons.trusted.reduce((sum, option) => sum + option.price, 0);

      const unavailableReason = !menuItem.isAvailable
        ? `${menuItem.name} is currently unavailable`
        : missingOptions.length > 0
          ? `Some previously selected options are no longer available: ${missingOptions.join(", ")}`
          : undefined;

      cartItems.push({
        menuItemId: item.menuItemId.toString(),
        name: menuItem.name,
        price: trustedUnitPrice,
        image: menuItem.image,
        quantity: item.quantity,
        variants:
          resolvedVariants.trusted.length > 0
            ? resolvedVariants.trusted
            : item.variants || [],
        addons:
          resolvedAddons.trusted.length > 0 ? resolvedAddons.trusted : item.addons || [],
        isAvailable,
        unavailableReason,
      });
    }

    successResponse(res, {
      restaurantId: order.restaurantId.toString(),
      items: cartItems,
      hasUnavailableItems,
    });
  } catch (error) {
    next(error);
  }
};
