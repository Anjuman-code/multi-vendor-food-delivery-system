/**
 * Driver controller — full rider lifecycle:
 * profile management, availability, order assignment, delivery flow, earnings.
 */
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import DriverLocationEvent from '../models/DriverLocationEvent';
import DriverProfile from '../models/DriverProfile';
import DriverRating from '../models/DriverRating';
import Notification, { NotificationType } from '../models/Notification';
import Order, { OrderStatus, PaymentStatus } from '../models/Order';
import { getIO } from '../socket';
import type { AuthRequest } from '../types';
import { createAuditLog } from '../utils/audit.util';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { successResponse } from '../utils/response.util';

// ── Helpers ────────────────────────────────────────────────────

const driverOnly = (req: Request): AuthRequest => {
  const authReq = req as AuthRequest;
  if (!authReq.user) throw new AuthenticationError();
  return authReq;
};

// ── Profile ────────────────────────────────────────────────────

/** GET /api/driver/profile */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);
    const profile = await DriverProfile.findOne({ userId: user._id });
    if (!profile) throw new NotFoundError('Driver profile not found');
    successResponse(res, { profile });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/driver/profile — update bank details and vehicle info */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);
    const allowed = [
      'bankDetails',
      'vehicleNumber',
      'vehicleType',
      'licenseNumber',
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const profile = await DriverProfile.findOneAndUpdate(
      { userId: user._id },
      updates,
      { new: true, runValidators: true },
    );
    if (!profile) throw new NotFoundError('Driver profile not found');
    successResponse(res, { profile }, 'Profile updated');
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/driver/availability — toggle available/unavailable */
export const updateAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);
    const { isAvailable } = req.body as { isAvailable: boolean };
    if (typeof isAvailable !== 'boolean')
      throw new ValidationError('isAvailable must be a boolean');

    const profile = await DriverProfile.findOneAndUpdate(
      { userId: user._id, applicationStatus: 'approved' },
      { isAvailable },
      { new: true },
    );
    if (!profile) throw new NotFoundError('Approved driver profile not found');

    // Notify admin channel
    try {
      getIO().to('admin:room').emit('driver:availabilityChanged', {
        driverId: user._id.toString(),
        isAvailable,
      });
    } catch {
      /* non-blocking */
    }

    successResponse(
      res,
      { isAvailable: profile.isAvailable },
      'Availability updated',
    );
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/driver/onboarding — mark onboarding as completed */
export const completeDriverOnboarding = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);
    const profile = await DriverProfile.findOneAndUpdate(
      { userId: user._id },
      { onboardingCompleted: true },
      { new: true },
    );
    if (!profile) throw new NotFoundError('Driver profile not found');
    successResponse(res, { profile }, 'Onboarding completed');
  } catch (error) {
    next(error);
  }
};

// ── Available Orders ───────────────────────────────────────────

/** GET /api/driver/orders/available — orders in READY status awaiting a rider */
export const getAvailableOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);

    // Verify driver is approved and available
    const profile = await DriverProfile.findOne({
      userId: user._id,
      applicationStatus: 'approved',
    });
    if (!profile) throw new NotFoundError('Approved driver profile not found');

    const orders = await Order.find({
      status: OrderStatus.READY,
      driverId: { $exists: false },
    })
      .sort({ createdAt: 1 })
      .limit(20)
      .populate('restaurantId', 'name address')
      .select(
        'orderNumber restaurantId deliveryAddress.area deliveryAddress.district ' +
          'items deliveryFee tipAmount total createdAt estimatedDeliveryTime',
      );

    successResponse(res, { orders });
  } catch (error) {
    next(error);
  }
};

/** POST /api/driver/orders/:orderId/accept — atomic order acceptance */
export const acceptOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);
    const { orderId } = req.params;

    const profile = await DriverProfile.findOne({
      userId: user._id,
      applicationStatus: 'approved',
    });
    if (!profile) throw new NotFoundError('Approved driver profile not found');

    // Atomic: only claim if still unassigned and in READY status
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: OrderStatus.READY,
        driverId: { $exists: false },
      },
      {
        driverId: user._id,
        status: OrderStatus.PICKED_UP,
        $push: {
          statusHistory: {
            status: OrderStatus.PICKED_UP,
            timestamp: new Date(),
            actorId: user._id,
            actorRole: user.role,
            note: 'Driver assigned and en route to restaurant',
          },
        },
      },
      { new: true },
    ).populate('restaurantId', 'name address contactInfo');

    if (!order) throw new ConflictError('Order is no longer available');

    // Set driver unavailable while on a delivery
    await DriverProfile.updateOne({ userId: user._id }, { isAvailable: false });

    try {
      const io = getIO();
      // Notify customer
      io.to(`user:${order.customerId.toString()}`).emit('orderStatusUpdate', {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        newStatus: OrderStatus.PICKED_UP,
        previousStatus: OrderStatus.READY,
        updatedAt: order.updatedAt,
        driverId: user._id.toString(),
      });
      // Notify vendor
      io.to(`vendor:${order.restaurantId.toString()}`).emit(
        'orderStatusUpdate',
        {
          _id: order._id.toString(),
          orderNumber: order.orderNumber,
          newStatus: OrderStatus.PICKED_UP,
          updatedAt: order.updatedAt,
        },
      );
    } catch {
      /* non-blocking */
    }

    // Notify customer
    await Notification.create({
      userId: order.customerId,
      type: NotificationType.ORDER_UPDATE,
      title: 'Driver assigned',
      message: `A driver is on the way to pick up your order ${order.orderNumber}.`,
      data: { orderId: order._id.toString() },
    });

    await createAuditLog({
      actorId: user._id,
      actorRole: user.role,
      action: 'driver.order_accepted',
      resourceType: 'Order',
      resourceId: order._id as mongoose.Types.ObjectId,
      changes: [{ field: 'driverId', newValue: user._id.toString() }],
    });

    successResponse(res, { order }, 'Order accepted');
  } catch (error) {
    next(error);
  }
};

/** GET /api/driver/orders/active — current active delivery */
export const getActiveDelivery = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);

    const order = await Order.findOne({
      driverId: user._id,
      status: {
        $in: [
          OrderStatus.PICKED_UP,
          OrderStatus.CONFIRMED,
          OrderStatus.PREPARING,
          OrderStatus.READY,
        ],
      },
    })
      .populate('restaurantId', 'name address contactInfo')
      .populate('customerId', 'firstName lastName phoneNumber');

    successResponse(res, { order: order ?? null });
  } catch (error) {
    next(error);
  }
};

// ── Location Update ────────────────────────────────────────────

/** POST /api/driver/location — Record a location ping and relay to customer */
export const updateLocation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);
    const {
      orderId,
      latitude,
      longitude,
      heading,
      speed,
      accuracy,
      batteryLevel,
    } = req.body;

    const event = await DriverLocationEvent.create({
      driverId: user._id,
      orderId,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      heading,
      speed,
      accuracy,
      batteryLevel,
      timestamp: new Date(),
    });

    // Update driver's last known location
    await DriverProfile.updateOne(
      { userId: user._id },
      { currentLocation: { latitude, longitude } },
    );

    try {
      const order = await Order.findById(orderId).select('customerId');
      if (order) {
        getIO()
          .to(`user:${order.customerId.toString()}`)
          .emit('driver:locationUpdate', {
            driverId: user._id.toString(),
            orderId,
            latitude,
            longitude,
            heading,
            speed,
            timestamp: event.timestamp.toISOString(),
          });
      }
    } catch {
      /* non-blocking */
    }

    successResponse(res, null, 'Location updated');
  } catch (error) {
    next(error);
  }
};

// ── Delivery Status ────────────────────────────────────────────

/** PATCH /api/driver/orders/:orderId/status — update delivery status */
export const updateDeliveryStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);
    const { orderId } = req.params;
    const { status, deliveryProof, codCollected } = req.body as {
      status: OrderStatus;
      deliveryProof?: { photoUrl: string; note?: string };
      codCollected?: boolean;
    };

    const order = await Order.findOne({ _id: orderId, driverId: user._id });
    if (!order)
      throw new NotFoundError('Order not found or not assigned to you');

    const previousStatus = order.status;
    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      actorId: user._id,
      actorRole: user.role,
    });

    if (status === OrderStatus.DELIVERED) {
      order.actualDeliveryTime = new Date();
      if (deliveryProof) {
        order.deliveryProof = {
          photoUrl: deliveryProof.photoUrl,
          timestamp: new Date(),
          note: deliveryProof.note,
        };
      }

      // Handle COD payment confirmation
      if (order.paymentMethod === 'cash_on_delivery') {
        order.codCollected = codCollected === true;
        if (order.codCollected) {
          order.paymentStatus = PaymentStatus.PAID;
        }
      } else {
        // For non-COD orders, mark payment as paid on delivery
        order.paymentStatus = PaymentStatus.PAID;
      }

      // Update driver stats
      const deliveryEarnings = order.deliveryFee + (order.tipAmount ?? 0);
      await DriverProfile.updateOne(
        { userId: user._id },
        {
          isAvailable: true,
          $inc: { totalDeliveries: 1, totalEarnings: deliveryEarnings },
        },
      );

      // Notify customer
      await Notification.create({
        userId: order.customerId,
        type: NotificationType.ORDER_UPDATE,
        title: 'Order delivered!',
        message: `Your order ${order.orderNumber} has been delivered. Enjoy your meal!`,
        data: { orderId: order._id.toString() },
      });
    }

    await order.save();

    try {
      const io = getIO();
      io.to(`user:${order.customerId.toString()}`).emit('orderStatusUpdate', {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        newStatus: status,
        previousStatus,
        updatedAt: order.updatedAt,
      });
      io.to(`vendor:${order.restaurantId.toString()}`).emit(
        'orderStatusUpdate',
        {
          _id: order._id.toString(),
          orderNumber: order.orderNumber,
          newStatus: status,
          previousStatus,
          updatedAt: order.updatedAt,
        },
      );
    } catch {
      /* non-blocking */
    }

    successResponse(res, { order }, `Order status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

// ── Earnings & History ─────────────────────────────────────────

/** GET /api/driver/earnings — earnings breakdown */
export const getEarnings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [profile, allDeliveries] = await Promise.all([
      DriverProfile.findOne({ userId: user._id }),
      Order.find({ driverId: user._id, status: OrderStatus.DELIVERED })
        .sort({ actualDeliveryTime: -1 })
        .select(
          'orderNumber restaurantId deliveryAddress.area deliveryFee tipAmount actualDeliveryTime createdAt',
        )
        .populate('restaurantId', 'name'),
    ]);

    const calcPeriod = (from: Date) =>
      allDeliveries
        .filter((o) => o.actualDeliveryTime && o.actualDeliveryTime >= from)
        .reduce(
          (acc, o) => ({
            earnings: acc.earnings + (o.deliveryFee ?? 0) + (o.tipAmount ?? 0),
            deliveries: acc.deliveries + 1,
            fees: acc.fees + (o.deliveryFee ?? 0),
            tips: acc.tips + (o.tipAmount ?? 0),
          }),
          { earnings: 0, deliveries: 0, fees: 0, tips: 0 },
        );

    // Day-by-day breakdown for the current week
    const dailyMap: Record<string, { earnings: number; deliveries: number }> =
      {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dailyMap[d.toISOString().slice(0, 10)] = { earnings: 0, deliveries: 0 };
    }
    allDeliveries
      .filter(
        (o) => o.actualDeliveryTime && o.actualDeliveryTime >= startOfWeek,
      )
      .forEach((o) => {
        const key = o.actualDeliveryTime!.toISOString().slice(0, 10);
        if (dailyMap[key]) {
          dailyMap[key].earnings += (o.deliveryFee ?? 0) + (o.tipAmount ?? 0);
          dailyMap[key].deliveries += 1;
        }
      });

    successResponse(res, {
      today: calcPeriod(startOfDay),
      thisWeek: calcPeriod(startOfWeek),
      thisMonth: calcPeriod(startOfMonth),
      allTime: {
        earnings: profile?.totalEarnings ?? 0,
        deliveries: profile?.totalDeliveries ?? 0,
      },
      weeklyBreakdown: Object.entries(dailyMap).map(([date, data]) => ({
        date,
        ...data,
      })),
      recentDeliveries: allDeliveries.slice(0, 20),
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/driver/deliveries — paginated delivery history */
export const getDeliveryHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const [deliveries, total] = await Promise.all([
      Order.find({ driverId: user._id, status: OrderStatus.DELIVERED })
        .sort({ actualDeliveryTime: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          'orderNumber restaurantId deliveryAddress.area deliveryFee tipAmount actualDeliveryTime',
        )
        .populate('restaurantId', 'name'),
      Order.countDocuments({
        driverId: user._id,
        status: OrderStatus.DELIVERED,
      }),
    ]);

    successResponse(res, {
      deliveries,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ── Customer rates driver ──────────────────────────────────────

/** POST /api/driver/ratings — customer submits a rating for the driver */
export const submitDriverRating = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { orderId, rating, comment } = req.body as {
      orderId: string;
      rating: number;
      comment?: string;
    };

    // Verify the order belongs to this customer and was delivered
    const order = await Order.findOne({
      _id: orderId,
      customerId: authReq.user._id,
      status: OrderStatus.DELIVERED,
    });
    if (!order) throw new NotFoundError('Delivered order not found');
    if (!order.driverId)
      throw new ValidationError('No driver was assigned to this order');

    // One rating per order (unique index on orderId)
    const existing = await DriverRating.findOne({ orderId });
    if (existing)
      throw new ConflictError(
        'You have already rated the driver for this order',
      );

    await DriverRating.create({
      driverId: order.driverId,
      customerId: authReq.user._id,
      orderId,
      rating,
      comment,
    });

    // Recalculate aggregate rating
    const agg = await DriverRating.aggregate<{ avg: number; count: number }>([
      { $match: { driverId: order.driverId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (agg.length > 0) {
      await DriverProfile.updateOne(
        { userId: order.driverId },
        {
          rating: {
            average: Math.round(agg[0].avg * 10) / 10,
            count: agg[0].count,
          },
        },
      );
    }

    successResponse(res, null, 'Rating submitted');
  } catch (error) {
    next(error);
  }
};
