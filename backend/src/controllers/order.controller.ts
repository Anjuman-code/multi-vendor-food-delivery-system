/**
 * Order controller – create, list, detail, cancel, and reorder.
 */
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import Coupon, { CouponType } from "../models/Coupon";
import CustomerProfile from "../models/CustomerProfile";
import { LoyaltyTransactionType } from "../models/LoyaltyTransaction";
import MenuItem from "../models/MenuItem";
import Restaurant from "../models/Restaurant";
import DriverRating from "../models/DriverRating";
import Review from "../models/Review";
import { computeDeliveryFee } from "./delivery-zone.controller";
import { applyCampaigns } from "./campaign.controller";
import { processReferralReward } from "./referral.controller";
import { NotificationType } from "../models/Notification";
import { createNotification } from "../services/notification.service";
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
  optionId?: Types.ObjectId;
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

    return { optionId: matched._id, name: matched.name, price: matched.price };
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
    trusted.push({ optionId: match._id, name: match.name, price: match.price });
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
      tipAmount = 0,
      scheduledFor,
      deliveryProof,
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
      if (!menuItem.isAvailable || menuItem.stockStatus === "hidden") {
        throw new ValidationError(`${menuItem.name} is currently unavailable`);
      }
      if (menuItem.stockStatus === "out_of_stock") {
        throw new ValidationError(`${menuItem.name} is currently out of stock`);
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
      if (
        coupon.perUserLimit > 0 &&
        coupon.usedBy.filter(
          (entry) => entry.userId.toString() === authReq.user._id.toString(),
        ).length >= coupon.perUserLimit
      ) {
        throw new ValidationError("You have already used this coupon");
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

    // Auto-apply active campaigns
    let campaignDiscount = 0;
    try {
      const profile = await CustomerProfile.findOne({ userId: authReq.user._id });
      const campaignResult = await applyCampaigns(
        authReq.user._id.toString(),
        restaurantId,
        subtotal,
        !profile || profile.totalOrders === 0,
        profile?.tier || "bronze",
      );
      campaignDiscount = campaignResult.discount;
    } catch {
      // Non-blocking
    }
    discount += campaignDiscount;

    const TAX_RATE = 0.05;

    // Compute delivery fee from zone, falling back to restaurant default
    const restaurant = await Restaurant.findById(restaurantObjectId).select("deliveryFee");
    let deliveryFee = restaurant?.deliveryFee || 50;

    if (deliveryAddress?.coordinates) {
      try {
        const zoneFee = await computeDeliveryFee(
          restaurantId,
          deliveryAddress.coordinates.latitude,
          deliveryAddress.coordinates.longitude,
          subtotal,
        );
        if (zoneFee.fee >= 0) {
          deliveryFee = zoneFee.fee;
        }
      } catch {
        // Zone validation failures are non-blocking for order creation;
        // they will be re-thrown above if critical (minimum order not met)
      }
    }

    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = subtotal + tax + deliveryFee - discount;

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
      deliveryFee,
      discount,
      tipAmount,
      total: Math.max(total + tipAmount, 0),
      couponCode: couponCode?.toUpperCase(),
      specialInstructions,
      estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000),
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      statusHistory: [{ status: OrderStatus.PENDING, timestamp: new Date(), actorId: authReq.user._id, actorRole: authReq.user.role }],
    });

    if (appliedCoupon) {
      appliedCoupon.usedCount += 1;
      appliedCoupon.usedBy.push({ userId: authReq.user._id, usedAt: new Date() });
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
      await profile.save();

      // Log loyalty points earned as an immutable transaction
      const pointsEarned = Math.floor(order.total);
      if (pointsEarned > 0) {
        try {
          await CustomerProfile.addLoyaltyPoints(
            authReq.user._id,
            pointsEarned,
            LoyaltyTransactionType.ORDER_EARNED,
            `Points earned from order ${order.orderNumber}`,
            order._id,
          );
        } catch {
          // Non-blocking — loyalty failure must not break order placement
        }
      }

      // Process referral reward on first order
      if (profile.totalOrders === 1) {
        try {
          await processReferralReward(authReq.user._id.toString());
        } catch {
          // Non-blocking
        }
      }
    }

    // Create notification
    await createNotification({
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

        // Persistent notification for the vendor so the order shows in their
        // notification center (the socket event above is for the live UI only).
        await createNotification({
          userId: vendorProfile.userId,
          type: NotificationType.ORDER_UPDATE,
          title: "New Order Received",
          message: `Order ${order.orderNumber} · ${order.items.length} item(s) · ৳${order.total.toLocaleString("en-BD")}`,
          data: { orderId: order._id },
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
 * Build a single sub-order from a restaurant's items in the cart.
 */
const buildSubOrder = async (
  params: {
    restaurantId: Types.ObjectId;
    items: Array<{
      key: string;
      restaurantId: Types.ObjectId;
      restaurantName: string;
      menuItemId: Types.ObjectId;
      name: string;
      price: number;
      image?: string;
      quantity: number;
      variants: Array<{ variantId?: Types.ObjectId; name: string; price: number }>;
      addons: Array<{ addonId?: Types.ObjectId; name: string; price: number }>;
      specialInstructions?: string;
    }>;
    customerId: Types.ObjectId;
    deliveryAddress: any;
    paymentMethod: string;
  },
): Promise<{
  order: any;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
}> => {
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

  for (const item of params.items) {
    const menuItem = await MenuItem.findOne({
      _id: item.menuItemId,
      restaurantId: params.restaurantId,
    });
    if (!menuItem) {
      throw new ValidationError(
        `Menu item ${item.menuItemId} is not available for ${params.restaurantId}`,
      );
    }
    if (!menuItem.isAvailable || menuItem.stockStatus === "hidden") {
      throw new ValidationError(`${menuItem.name} is currently unavailable`);
    }
    if (menuItem.stockStatus === "out_of_stock") {
      throw new ValidationError(`${menuItem.name} is currently out of stock`);
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
      variants.reduce((sum, opt) => sum + opt.price, 0) +
      addons.reduce((sum, opt) => sum + opt.price, 0);

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

  const restaurant = await Restaurant.findById(params.restaurantId).select("deliveryFee");
  let deliveryFee = restaurant?.deliveryFee || 50;

  if (params.deliveryAddress?.coordinates) {
    try {
      const zoneFee = await computeDeliveryFee(
        params.restaurantId.toString(),
        params.deliveryAddress.coordinates.latitude,
        params.deliveryAddress.coordinates.longitude,
        subtotal,
      );
      if (zoneFee.fee >= 0) {
        deliveryFee = zoneFee.fee;
      }
    } catch {
      // Non-blocking
    }
  }

  const TAX_RATE = 0.05;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;

  return {
    order: null,
    subtotal,
    deliveryFee,
    tax,
    discount: 0,
    total: subtotal + tax + deliveryFee,
  };
};

/**
 * POST /api/orders/from-cart
 * Create orders from the authenticated user's server-side cart.
 * Supports multi-restaurant carts – one sub-order per restaurant.
 */
export const createOrderFromCart = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const currentUser = authReq.user;
    if (!currentUser) throw new AuthenticationError();

    const {
      deliveryAddress,
      paymentMethod,
      couponCode,
      specialInstructions,
      tipAmount = 0,
      scheduledFor,
    } = req.body;

    // Fetch server cart
    const Cart = (await import("../models/Cart")).default;
    const cart = await Cart.findOne({ userId: currentUser._id });
    if (!cart || cart.items.length === 0) {
      throw new ValidationError("Your cart is empty");
    }

    // Migrate legacy cart items (old single-restaurant schema)
    try {
      const { migrateLegacyCartItems: migrate } = await import("../controllers/cart.controller");
      if (typeof migrate === "function") {
        migrate(cart);
      }
    } catch {
      // Non-blocking – migration is best-effort
    }

    // Group cart items by restaurant
    const restaurantGroups = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const restId = item.restaurantId?.toString() || "unknown";
      const group = restaurantGroups.get(restId) || [];
      group.push(item);
      restaurantGroups.set(restId, group);
    }

    if (restaurantGroups.size > 2) {
      throw new ValidationError("Orders can include items from up to 2 restaurants only");
    }

    // Calculate combined subtotal for coupon validation
    let combinedSubtotal = 0;
    const groupData: Array<{
      restaurantId: Types.ObjectId;
      items: typeof cart.items;
      subtotal: number;
      deliveryFee: number;
      tax: number;
    }> = [];

    for (const [restIdStr, items] of restaurantGroups) {
      const restId = new Types.ObjectId(restIdStr);
      const result = await buildSubOrder({
        restaurantId: restId,
        items,
        customerId: currentUser._id,
        deliveryAddress,
        paymentMethod,
      });
      combinedSubtotal += result.subtotal;
      groupData.push({
        restaurantId: restId,
        items,
        subtotal: result.subtotal,
        deliveryFee: result.deliveryFee,
        tax: result.tax,
      });
    }

    // Coupon validation
    let totalDiscount = 0;
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
      if (
        coupon.perUserLimit > 0 &&
        coupon.usedBy.filter(
          (entry) => entry.userId.toString() === currentUser._id.toString(),
        ).length >= coupon.perUserLimit
      ) {
        throw new ValidationError("You have already used this coupon");
      }
      if (combinedSubtotal < coupon.minOrderAmount) {
        throw new ValidationError(
          `Minimum order amount for this coupon is ${coupon.minOrderAmount}`,
        );
      }

      totalDiscount =
        coupon.type === CouponType.PERCENTAGE
          ? Math.min((combinedSubtotal * coupon.value) / 100, coupon.maxDiscount ?? Infinity)
          : Math.min(coupon.value, combinedSubtotal);
      appliedCoupon = coupon;
    }

    // Auto-apply active campaigns
    let campaignDiscount = 0;
    try {
      const profile = await CustomerProfile.findOne({ userId: currentUser._id });
      const campaignResult = await applyCampaigns(
        currentUser._id.toString(),
        "", // campaigns applied at group level, discount distributed proportionally
        combinedSubtotal,
        !profile || profile.totalOrders === 0,
        profile?.tier || "bronze",
      );
      campaignDiscount = campaignResult.discount;
    } catch {
      // Non-blocking
    }
    totalDiscount += campaignDiscount;

    // Distribute discount proportionally across restaurant groups
    const groupDiscounts = groupData.map((g) =>
      combinedSubtotal > 0
        ? Math.round((g.subtotal / combinedSubtotal) * totalDiscount * 100) / 100
        : 0,
    );

    // Generate a common group order ID so sub-orders are linked
    const groupOrderId = new Types.ObjectId();

    const createdOrders: Array<any> = [];

    for (let i = 0; i < groupData.length; i++) {
      const g = groupData[i];
      const discount = groupDiscounts[i];
      const total = g.subtotal + g.tax + g.deliveryFee - discount;

      // Re-validate items and create the order document
      let subSubtotal = 0;
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

      for (const item of g.items) {
        const menuItem = await MenuItem.findOne({
          _id: item.menuItemId,
          restaurantId: g.restaurantId,
        });
        if (!menuItem) {
          throw new ValidationError(
            `Menu item ${item.menuItemId} is not available`,
          );
        }
        if (!menuItem.isAvailable || menuItem.stockStatus === "hidden") {
          throw new ValidationError(`${menuItem.name} is currently unavailable`);
        }
        if (menuItem.stockStatus === "out_of_stock") {
          throw new ValidationError(`${menuItem.name} is currently out of stock`);
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
          variants.reduce((sum, opt) => sum + opt.price, 0) +
          addons.reduce((sum, opt) => sum + opt.price, 0);

        const itemTotal = itemPrice * quantity;
        subSubtotal += itemTotal;

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

      const order = await Order.create({
        orderNumber: generateOrderNumber(),
        customerId: currentUser._id,
        restaurantId: g.restaurantId,
        groupOrderId,
        items: orderItems,
        deliveryAddress,
        paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: subSubtotal,
        tax: g.tax,
        deliveryFee: g.deliveryFee,
        discount,
        tipAmount,
        total: Math.max(total + tipAmount, 0),
        couponCode: couponCode?.toUpperCase(),
        specialInstructions,
        estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000),
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        statusHistory: [{
          status: OrderStatus.PENDING,
          timestamp: new Date(),
          actorId: currentUser._id,
          actorRole: currentUser.role,
        }],
      });

      createdOrders.push(order);
    }

    // Clear cart after all sub-orders created
    await Cart.deleteOne({ userId: currentUser._id });

    if (appliedCoupon) {
      appliedCoupon.usedCount += 1;
      appliedCoupon.usedBy.push({ userId: currentUser._id, usedAt: new Date() });
      await appliedCoupon.save();
    }

    // Update customer stats (once per group order)
    const profile = await CustomerProfile.findOne({
      userId: currentUser._id,
    });
    if (profile) {
      const groupTotal = createdOrders.reduce((s, o) => s + o.total, 0);
      profile.totalOrders += 1;
      profile.totalSpent += groupTotal;
      profile.averageOrderValue = profile.totalSpent / profile.totalOrders;
      await profile.save();

      const pointsEarned = Math.floor(groupTotal);
      if (pointsEarned > 0) {
        try {
          const LoyaltyTransactionTypeModule = await import("../models/LoyaltyTransaction");
          await CustomerProfile.addLoyaltyPoints(
            currentUser._id,
            pointsEarned,
            LoyaltyTransactionTypeModule.LoyaltyTransactionType.ORDER_EARNED,
            `Points earned from group order ${createdOrders[0].orderNumber}`,
            groupOrderId,
          );
        } catch {
          // Non-blocking
        }
      }

      if (profile.totalOrders === 1) {
        try {
          await processReferralReward(currentUser._id.toString());
        } catch {
          // Non-blocking
        }
      }
    }

    // Create notification
    const firstOrder = createdOrders[0];
    await createNotification({
      userId: currentUser._id,
      type: NotificationType.ORDER_UPDATE,
      title: "Order Placed!",
      message: `Your order${createdOrders.length > 1 ? "s" : ""} ${createdOrders.map((o) => o.orderNumber).join(", ")} ${createdOrders.length > 1 ? "have" : "has"} been placed successfully.`,
      data: { orderId: firstOrder._id, groupOrderId },
    });

    // Emit real-time newOrder events to each vendor
    for (const order of createdOrders) {
      try {
        const VendorProfile = (await import("../models/VendorProfile")).default;
        const vendorProfile = await VendorProfile.findOne({
          restaurantIds: order.restaurantId,
        });
        if (vendorProfile) {
          getIO()
            .to(`vendor:${vendorProfile.userId.toString()}`)
            .emit("newOrder", {
              _id: order._id.toString(),
              orderNumber: order.orderNumber,
              customerName: `${currentUser.firstName} ${currentUser.lastName}`,
              total: order.total,
              items: order.items.map((i: any) => ({
                name: i.name,
                quantity: i.quantity,
              })),
              status: order.status,
              createdAt: order.createdAt,
            });
        }
      } catch {
        // Non-blocking
      }
    }

    successResponse(
      res,
      { orders: createdOrders, groupOrderId },
      "Order placed successfully",
      201,
    );
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

    const [order, existingReview, existingDriverRating] = await Promise.all([
      Order.findOne({
        _id: orderId,
        customerId: authReq.user._id,
      }).populate("restaurantId", "name images.logo contactInfo"),
      Review.findOne({ orderId, customerId: authReq.user._id }),
      DriverRating.findOne({ orderId, customerId: authReq.user._id }),
    ]);

    if (!order) throw new NotFoundError("Order not found");

    successResponse(res, {
      order,
      review: existingReview,
      driverRating: existingDriverRating,
    });
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
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      note: reason,
    });
    await order.save();

    await createNotification({
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
      const isAvailable = menuItem.isAvailable && missingOptions.length === 0 && menuItem.stockStatus !== "hidden";

      if (!isAvailable) {
        hasUnavailableItems = true;
      }

      const trustedUnitPrice =
        menuItem.price +
        resolvedVariants.trusted.reduce((sum, option) => sum + option.price, 0) +
        resolvedAddons.trusted.reduce((sum, option) => sum + option.price, 0);

      const unavailableReason = menuItem.stockStatus === "out_of_stock"
        ? `${menuItem.name} is currently out of stock`
        : !menuItem.isAvailable || menuItem.stockStatus === "hidden"
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
