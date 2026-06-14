/**
 * Driver controller — full rider lifecycle:
 * profile management, availability, order assignment, delivery flow, earnings.
 */
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import DriverLocationEvent from '../models/DriverLocationEvent';
import DriverProfile from '../models/DriverProfile';
import DriverRating from '../models/DriverRating';
import { NotificationType } from '../models/Notification';
import { createNotification } from '../services/notification.service';
import Order, { DeliveryStage, OrderStatus, PaymentStatus } from '../models/Order';
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
import { removeLocalFile, uploadImageToCloud } from '../middleware/uploads/upload.middleware';

// ── Helpers ────────────────────────────────────────────────────

type AuthedRequest = AuthRequest & { user: NonNullable<AuthRequest['user']> };

const driverOnly = (req: Request): AuthedRequest => {
  const authReq = req as AuthRequest;
  if (!authReq.user) throw new AuthenticationError();
  return authReq as AuthedRequest;
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

    // Can't go back online while a delivery is still in progress.
    if (isAvailable) {
      const active = await Order.findOne({
        driverId: user._id,
        status: { $in: [OrderStatus.READY, OrderStatus.PICKED_UP] },
      }).select('_id');
      if (active)
        throw new ConflictError(
          'Finish your active delivery before going back online',
        );
    }

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

/** POST /api/driver/documents/upload — upload a driver document (license, registration, insurance) */
export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);
    const { documentType } = req.body as { documentType: string };

    const allowedTypes = ['licensePhoto', 'vehicleRegistrationPhoto', 'insurancePhoto'];
    if (!allowedTypes.includes(documentType)) {
      throw new ValidationError('documentType must be one of: licensePhoto, vehicleRegistrationPhoto, insurancePhoto');
    }

    const file = req.file;
    if (!file) throw new ValidationError('Document file is required');

    let fileUrl = `/uploads/driver-docs/${file.filename}`;

    // Attempt Cloudinary upload (falls back to local on failure)
    try {
      const cloudUrl = await uploadImageToCloud(file.path, 'driver-docs', user._id.toString());
      if (cloudUrl) {
        fileUrl = cloudUrl;
        removeLocalFile(file.path);
      }
    } catch {
      // Keep local file
    }

    const profile = await DriverProfile.findOneAndUpdate(
      { userId: user._id },
      { $set: { [`documents.${documentType}`]: fileUrl } },
      { new: true },
    );
    if (!profile) throw new NotFoundError('Driver profile not found');

    successResponse(res, { documentUrl: fileUrl, documentType, profile }, `${documentType} uploaded`);
  } catch (error) {
    next(error);
  }
};

/** POST /api/driver/onboarding/complete — complete onboarding with bank details */
export const completeOnboardingWithDetails = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);
    const {
      bankName,
      accountNumber,
      accountHolderName,
      mobileMoneyNumber,
      mobileMoneyProvider,
    } = req.body as {
      bankName?: string;
      accountNumber?: string;
      accountHolderName?: string;
      mobileMoneyNumber?: string;
      mobileMoneyProvider?: string;
    };

    const updateData: Record<string, unknown> = {
      onboardingCompleted: true,
    };

    if (bankName) updateData['bankDetails.bankName'] = bankName;
    if (accountNumber) updateData['bankDetails.accountNumber'] = accountNumber;
    if (accountHolderName) updateData['bankDetails.accountHolderName'] = accountHolderName;
    if (mobileMoneyNumber) updateData['bankDetails.mobileMoneyNumber'] = mobileMoneyNumber;
    if (mobileMoneyProvider) updateData['bankDetails.mobileMoneyProvider'] = mobileMoneyProvider;

    const profile = await DriverProfile.findOneAndUpdate(
      { userId: user._id },
      { $set: updateData },
      { new: true },
    );
    if (!profile) throw new NotFoundError('Driver profile not found');

    // Also update User onboarding flag
    const User = mongoose.model('User');
    await User.updateOne({ _id: user._id }, { onboardingCompleted: true });

    await createAuditLog({
      actorId: user._id,
      actorRole: user.role,
      action: 'driver.onboarding_completed',
      resourceType: 'DriverProfile',
      resourceId: profile._id as mongoose.Types.ObjectId,
    });

    successResponse(res, { profile }, 'Onboarding completed successfully');
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
      .populate('restaurantId', 'name address location')
      .select(
        'orderNumber restaurantId deliveryAddress items deliveryFee tipAmount ' +
          'total paymentMethod createdAt estimatedDeliveryTime',
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

    // Block a rider from juggling two deliveries at once.
    const existingActive = await Order.findOne({
      driverId: user._id,
      status: { $in: [OrderStatus.READY, OrderStatus.PICKED_UP] },
    }).select('_id');
    if (existingActive)
      throw new ConflictError(
        'Finish your current delivery before accepting a new one',
      );

    // Atomic: only claim if still unassigned and in READY status. The order
    // stays READY (the food is still at the restaurant) — we only attach the
    // driver and start the courier's `deliveryStage`. The status advances to
    // PICKED_UP later, when the rider actually collects the food.
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: OrderStatus.READY,
        driverId: { $exists: false },
      },
      {
        driverId: user._id,
        deliveryStage: DeliveryStage.HEADING_TO_STORE,
      },
      { new: true },
    ).populate('restaurantId', 'name address contactInfo');

    if (!order) throw new ConflictError('Order is no longer available');

    // Set driver unavailable while on a delivery
    await DriverProfile.updateOne({ userId: user._id }, { isAvailable: false });

    try {
      const io = getIO();
      const payload = {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        driverId: user._id.toString(),
        deliveryStage: DeliveryStage.HEADING_TO_STORE,
        updatedAt: order.updatedAt,
      };
      // Tell the customer a rider is assigned and en route to the restaurant.
      io.to(`user:${order.customerId.toString()}`).emit('order:riderAssigned', payload);
      io.to(`vendor:${order.restaurantId.toString()}`).emit('order:riderAssigned', payload);
    } catch {
      /* non-blocking */
    }

    // Notify customer
    await createNotification({
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

/** Ordered courier stages — index defines the only legal forward path. */
const STAGE_SEQUENCE: DeliveryStage[] = [
  DeliveryStage.HEADING_TO_STORE,
  DeliveryStage.AT_STORE,
  DeliveryStage.PICKED_UP,
  DeliveryStage.HEADING_TO_CUSTOMER,
  DeliveryStage.ARRIVED,
];

/**
 * PATCH /api/driver/orders/:orderId/stage — advance the courier stage by one
 * step. When the rider reaches PICKED_UP the order's `OrderStatus` flips to
 * PICKED_UP (the food has physically left the restaurant).
 */
export const advanceDeliveryStage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);
    const { orderId } = req.params;
    const { deliveryStage } = req.body as { deliveryStage: DeliveryStage };

    if (!STAGE_SEQUENCE.includes(deliveryStage))
      throw new ValidationError('Invalid delivery stage');

    const order = await Order.findOne({ _id: orderId, driverId: user._id });
    if (!order)
      throw new NotFoundError('Order not found or not assigned to you');
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    )
      throw new ConflictError('This delivery is already closed');

    const currentIdx = order.deliveryStage
      ? STAGE_SEQUENCE.indexOf(order.deliveryStage)
      : -1;
    const targetIdx = STAGE_SEQUENCE.indexOf(deliveryStage);
    if (targetIdx !== currentIdx + 1)
      throw new ValidationError('Delivery stages must advance one step at a time');

    order.deliveryStage = deliveryStage;

    // Crossing into PICKED_UP is the real "food collected" moment.
    const justPickedUp = deliveryStage === DeliveryStage.PICKED_UP;
    if (justPickedUp && order.status === OrderStatus.READY) {
      order.status = OrderStatus.PICKED_UP;
      order.statusHistory.push({
        status: OrderStatus.PICKED_UP,
        timestamp: new Date(),
        actorId: user._id,
        actorRole: user.role,
        note: 'Rider collected the order from the restaurant',
      });
    }

    await order.save();

    try {
      const io = getIO();
      const base = {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        deliveryStage,
        updatedAt: order.updatedAt,
      };
      io.to(`user:${order.customerId.toString()}`).emit('order:stageUpdate', base);
      if (justPickedUp) {
        io.to(`user:${order.customerId.toString()}`).emit('orderStatusUpdate', {
          ...base,
          newStatus: OrderStatus.PICKED_UP,
          previousStatus: OrderStatus.READY,
        });
        io.to(`vendor:${order.restaurantId.toString()}`).emit('orderStatusUpdate', {
          ...base,
          newStatus: OrderStatus.PICKED_UP,
          previousStatus: OrderStatus.READY,
        });
      }
    } catch {
      /* non-blocking */
    }

    if (justPickedUp) {
      await createNotification({
        userId: order.customerId,
        type: NotificationType.ORDER_UPDATE,
        title: 'Order picked up',
        message: `Your order ${order.orderNumber} is on the way!`,
        data: { orderId: order._id.toString() },
      });
    }

    successResponse(res, { order }, 'Delivery stage updated');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/driver/orders/:orderId/proof — upload a proof-of-delivery photo.
 * Returns the stored URL; the rider then attaches it when marking delivered.
 */
export const uploadDeliveryProof = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = driverOnly(req);
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, driverId: user._id }).select(
      '_id',
    );
    if (!order)
      throw new NotFoundError('Order not found or not assigned to you');

    const file = req.file;
    if (!file) throw new ValidationError('Proof photo is required');

    let fileUrl = `/uploads/driver-docs/${file.filename}`;
    try {
      const cloudUrl = await uploadImageToCloud(
        file.path,
        'driver-docs',
        String(orderId),
      );
      if (cloudUrl) {
        fileUrl = cloudUrl;
        removeLocalFile(file.path);
      }
    } catch {
      // Keep local file
    }

    successResponse(res, { photoUrl: fileUrl }, 'Proof uploaded');
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
      order.deliveryStage = undefined;
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
      await createNotification({
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
          'orderNumber restaurantId deliveryAddress.area deliveryFee tipAmount ' +
            'total paymentMethod codCollected actualDeliveryTime createdAt',
        )
        .populate('restaurantId', 'name'),
    ]);

    const isCodCash = (o: (typeof allDeliveries)[number]) =>
      o.paymentMethod === 'cash_on_delivery' && o.codCollected === true;

    const calcPeriod = (from: Date) =>
      allDeliveries
        .filter((o) => o.actualDeliveryTime && o.actualDeliveryTime >= from)
        .reduce(
          (acc, o) => ({
            earnings: acc.earnings + (o.deliveryFee ?? 0) + (o.tipAmount ?? 0),
            deliveries: acc.deliveries + 1,
            fees: acc.fees + (o.deliveryFee ?? 0),
            tips: acc.tips + (o.tipAmount ?? 0),
            // Cash the rider physically collected on COD orders (owed to the
            // platform, net of their own earnings).
            cashCollected: acc.cashCollected + (isCodCash(o) ? o.total ?? 0 : 0),
          }),
          { earnings: 0, deliveries: 0, fees: 0, tips: 0, cashCollected: 0 },
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
