import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import Reservation from '../models/Reservation';
import Restaurant from '../models/Restaurant';
import VendorProfile from '../models/VendorProfile';
import {
  calculateAvailability,
  createReservationWithCapacityCheck,
  getOnlineCapacity,
} from '../services/reservation.service';
import {
  createReservationSchema,
  createManualReservationSchema,
  getAvailabilityQuerySchema,
  updateReservationStatusSchema,
  customerCancelReservationSchema,
  updateVendorReservationSettingsSchema,
} from '../validations/reservation.validation';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { successResponse } from '../utils/response.util';
import type { AuthRequest } from '../types';
import { UserRole } from '../config/constants';
import { domainEvents } from '../services/domain-events/domain-events';

// ── Helpers ──────────────────────────────────────────────────────

const verifyVendorOwnership = async (
  userId: string | Types.ObjectId,
  restaurantId: string | Types.ObjectId,
): Promise<void> => {
  const profile = await VendorProfile.findOne({ userId });
  if (!profile) {
    throw new NotFoundError('Vendor profile not found');
  }
  const owns = profile.restaurantIds.some(
    (id) => id.toString() === restaurantId.toString(),
  );
  if (!owns) {
    throw new AuthorizationError(
      'You do not have permission to manage this restaurant',
    );
  }
};

// ── 1. Public Availability Engine ────────────────────────────────

export const getPublicAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const restaurantId = req.params.restaurantId as string;
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new ValidationError('Invalid restaurant ID');
    }

    const { date, partySize } = getAvailabilityQuerySchema.parse(req.query);

    const result = await calculateAvailability(
      restaurantId,
      date,
      partySize,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

// ── 2. Customer: Create Reservation ──────────────────────────────

export const createCustomerReservation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const input = createReservationSchema.parse(req.body);

    const reservation = await createReservationWithCapacityCheck({
      restaurantId: input.restaurantId,
      customerId: authReq.user._id,
      guestInfo: input.guestInfo,
      partySize: input.partySize,
      date: input.date,
      time: input.time,
      specialRequests: input.specialRequests,
      source: 'online',
    });

    const populated = await Reservation.findById(reservation._id)
      .populate('restaurantId', 'name address contactInfo images')
      .lean();

    domainEvents.onReservationCreated(reservation).catch((err) => {
      // Non-blocking
    });

    successResponse(
      res,
      {
        reservation: populated,
        requiresDeposit: reservation.deposit.required,
        depositAmount: reservation.deposit.amount,
      },
      'Reservation created successfully',
      201,
    );
  } catch (error) {
    next(error);
  }
};

// ── 3. Customer: List My Reservations ────────────────────────────

export const getCustomerReservations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { type } = req.query; // 'upcoming' | 'past' | undefined
    const now = new Date();

    const query: Record<string, unknown> = {
      customerId: authReq.user._id,
    };

    if (type === 'upcoming') {
      query.startDateTime = { $gte: now };
      query.status = { $in: ['pending', 'confirmed', 'seated'] };
    } else if (type === 'past') {
      query.$or = [
        { endDateTime: { $lt: now } },
        { status: { $in: ['completed', 'cancelled', 'rejected', 'no_show'] } },
      ];
    }

    const reservations = await Reservation.find(query)
      .populate('restaurantId', 'name slug address contactInfo images')
      .populate('reviewId', 'rating comment createdAt')
      .sort({ startDateTime: type === 'upcoming' ? 1 : -1 })
      .lean();

    successResponse(res, reservations, 'My reservations retrieved');
  } catch (error) {
    next(error);
  }
};

// ── 4. Customer: Get Single Reservation ──────────────────────────

export const getCustomerReservationById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid reservation ID');
    }

    const reservation = await Reservation.findOne({
      _id: id,
      customerId: authReq.user._id,
    })
      .populate(
        'restaurantId',
        'name slug address contactInfo images reservationSettings operatingHours',
      )
      .populate('reviewId', 'rating comment title createdAt')
      .lean();

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    successResponse(res, reservation);
  } catch (error) {
    next(error);
  }
};

// ── 5. Customer: Cancel Reservation ──────────────────────────────

export const cancelCustomerReservation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid reservation ID');
    }

    const { reason } = customerCancelReservationSchema.parse(req.body);

    const reservation = await Reservation.findOne({
      _id: id,
      customerId: authReq.user._id,
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    if (['completed', 'cancelled', 'rejected', 'no_show'].includes(reservation.status)) {
      throw new ValidationError(
        `Reservation is already ${reservation.status} and cannot be cancelled`,
      );
    }

    // Check cancellation window policy
    const restaurant = await Restaurant.findById(reservation.restaurantId);
    const cancelWindowHours =
      restaurant?.reservationSettings?.cancellationWindowHours ?? 2;

    const now = new Date();
    const deadlineMs = cancelWindowHours * 60 * 60 * 1000;
    if (reservation.startDateTime.getTime() - now.getTime() < deadlineMs) {
      throw new ValidationError(
        `Free cancellation is only allowed up to ${cancelWindowHours} hour(s) before your reservation time`,
      );
    }

    reservation.status = 'cancelled';
    reservation.cancellationReason = reason || 'Cancelled by guest';
    reservation.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      updatedBy: authReq.user._id,
      reason: reason || 'Cancelled by customer',
    });

    if (reservation.deposit.status === 'paid') {
      reservation.deposit.status = 'refunded';
    }

    await reservation.save();

    domainEvents
      .onReservationStatusChanged(reservation, reason || 'Cancelled by guest')
      .catch((err) => {
        // Non-blocking
      });

    successResponse(res, reservation, 'Reservation cancelled successfully');
  } catch (error) {
    next(error);
  }
};

// ── 6. Vendor: List Reservations with Occupancy Stats ─────────────

export const getVendorReservations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { restaurantId, date, status, search } = req.query;

    const profile = await VendorProfile.findOne({ userId: authReq.user._id });
    if (!profile) throw new NotFoundError('Vendor profile not found');

    const allowedRestaurantIds = profile.restaurantIds.map((id) =>
      id.toString(),
    );

    let targetRestaurantId: string;
    if (restaurantId && typeof restaurantId === 'string') {
      if (!allowedRestaurantIds.includes(restaurantId)) {
        throw new AuthorizationError(
          'You do not have access to this restaurant',
        );
      }
      targetRestaurantId = restaurantId;
    } else if (allowedRestaurantIds.length > 0) {
      targetRestaurantId = allowedRestaurantIds[0];
    } else {
      successResponse(res, {
        reservations: [],
        stats: {
          todayBookings: 0,
          expectedGuests: 0,
          seatedGuests: 0,
          occupancyRate: 0,
          pendingApprovals: 0,
        },
      });
      return;
    }

    const query: Record<string, unknown> = {
      restaurantId: new Types.ObjectId(targetRestaurantId),
    };

    if (date && typeof date === 'string') {
      query.date = date;
    }

    if (status && typeof status === 'string' && status !== 'all') {
      query.status = status;
    }

    if (search && typeof search === 'string') {
      query.$or = [
        { reservationNumber: { $regex: search, $options: 'i' } },
        { 'guestInfo.name': { $regex: search, $options: 'i' } },
        { 'guestInfo.phone': { $regex: search, $options: 'i' } },
      ];
    }

    const reservations = await Reservation.find(query)
      .populate('customerId', 'firstName lastName email phoneNumber')
      .populate('reviewId', 'rating comment')
      .sort({ startDateTime: 1 })
      .lean();

    // Compute stats for today
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    const todayReservations = await Reservation.find({
      restaurantId: new Types.ObjectId(targetRestaurantId),
      date: todayStr,
      status: { $in: ['confirmed', 'seated', 'completed', 'pending'] },
    }).lean();

    const restaurant = await Restaurant.findById(targetRestaurantId);
    const totalCapacity =
      restaurant?.reservationSettings?.totalSeats || 40;

    const todayBookings = todayReservations.length;
    const expectedGuests = todayReservations.reduce(
      (sum, r) => sum + r.partySize,
      0,
    );
    const seatedGuests = todayReservations
      .filter((r) => r.status === 'seated')
      .reduce((sum, r) => sum + r.partySize, 0);
    const pendingApprovals = todayReservations.filter(
      (r) => r.status === 'pending',
    ).length;
    const occupancyRate = Math.min(
      100,
      Math.round((expectedGuests / (totalCapacity || 1)) * 100),
    );

    successResponse(res, {
      reservations,
      stats: {
        todayBookings,
        expectedGuests,
        seatedGuests,
        occupancyRate,
        pendingApprovals,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── 7. Vendor: Update Reservation Status ──────────────────────────

export const updateReservationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid reservation ID');
    }

    const { status, reason, assignedTables } =
      updateReservationStatusSchema.parse(req.body);

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    if (authReq.user.role === UserRole.VENDOR) {
      await verifyVendorOwnership(authReq.user._id, reservation.restaurantId);
    } else if (authReq.user.role !== UserRole.ADMIN) {
      throw new AuthorizationError('Unauthorized');
    }

    reservation.status = status;
    if (assignedTables) {
      reservation.assignedTables = assignedTables;
    }
    if (status === 'cancelled' || status === 'rejected') {
      reservation.cancellationReason = reason;
    }

    reservation.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: authReq.user._id,
      reason,
    });

    await reservation.save();

    domainEvents
      .onReservationStatusChanged(reservation, reason)
      .catch((err) => {
        // Non-blocking
      });

    successResponse(
      res,
      reservation,
      `Reservation updated to ${status}`,
    );
  } catch (error) {
    next(error);
  }
};

// ── 8. Vendor: Manual / Walk-in Booking ───────────────────────────

export const createVendorManualReservation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const input = createManualReservationSchema.parse(req.body);

    if (authReq.user.role === UserRole.VENDOR) {
      await verifyVendorOwnership(authReq.user._id, input.restaurantId);
    } else if (authReq.user.role !== UserRole.ADMIN) {
      throw new AuthorizationError('Unauthorized');
    }

    const reservation = await createReservationWithCapacityCheck({
      restaurantId: input.restaurantId,
      customerId: undefined,
      guestInfo: input.guestInfo,
      partySize: input.partySize,
      date: input.date,
      time: input.time,
      specialRequests: input.specialRequests,
      source: input.source,
      statusOverride: input.status,
      assignedTables: input.assignedTables,
    });

    successResponse(
      res,
      reservation,
      `${input.source === 'walk_in' ? 'Walk-in' : 'Manual'} reservation created successfully`,
      201,
    );
  } catch (error) {
    next(error);
  }
};

// ── 9. Vendor: Get Settings ──────────────────────────────────────

export const getVendorReservationSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const restaurantId = req.params.restaurantId as string;
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new ValidationError('Invalid restaurant ID');
    }

    if (authReq.user.role === UserRole.VENDOR) {
      await verifyVendorOwnership(authReq.user._id, restaurantId);
    } else if (authReq.user.role !== UserRole.ADMIN) {
      throw new AuthorizationError('Unauthorized');
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    const settings = restaurant.reservationSettings || {
      isEnabled: false,
      totalSeats: 40,
      tables: [],
      walkInAllocationType: 'percentage',
      walkInAllocationValue: 20,
      minPartySize: 1,
      maxPartySize: 10,
      slotDurationMinutes: 90,
      slotIntervalMinutes: 30,
      maxAdvanceDays: 30,
      minLeadTimeHours: 2,
      closedDates: [],
      autoConfirm: true,
      cancellationWindowHours: 2,
      noShowGracePeriodMinutes: 15,
      depositRequired: false,
      depositAmountPerGuest: 0,
    };

    successResponse(res, {
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      settings,
      onlineCapacity: getOnlineCapacity(settings),
    });
  } catch (error) {
    next(error);
  }
};

// ── 10. Vendor: Update Settings ──────────────────────────────────

export const updateVendorReservationSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const restaurantId = req.params.restaurantId as string;
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new ValidationError('Invalid restaurant ID');
    }

    if (authReq.user.role === UserRole.VENDOR) {
      await verifyVendorOwnership(authReq.user._id, restaurantId);
    } else if (authReq.user.role !== UserRole.ADMIN) {
      throw new AuthorizationError('Unauthorized');
    }

    const input = updateVendorReservationSettingsSchema.parse(req.body);

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    restaurant.reservationSettings = input;

    // Ensure 'dine-in' is in serviceOptions if reservations are enabled
    if (input.isEnabled && !restaurant.serviceOptions.includes('dine-in')) {
      restaurant.serviceOptions.push('dine-in');
    }

    await restaurant.save();

    successResponse(
      res,
      {
        restaurantId: restaurant._id,
        settings: restaurant.reservationSettings,
        onlineCapacity: getOnlineCapacity(input),
      },
      'Reservation settings updated successfully',
    );
  } catch (error) {
    next(error);
  }
};

// ── 11. Admin: Platform Reservations Oversight ───────────────────

export const getAdminReservations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== UserRole.ADMIN) {
      throw new AuthorizationError('Admin access required');
    }

    const { restaurantId, status, date, page = '1', limit = '20', search } =
      req.query;

    const query: Record<string, unknown> = {};

    if (restaurantId && typeof restaurantId === 'string') {
      query.restaurantId = new Types.ObjectId(restaurantId);
    }

    if (status && typeof status === 'string' && status !== 'all') {
      query.status = status;
    }

    if (date && typeof date === 'string') {
      query.date = date;
    }

    if (search && typeof search === 'string') {
      query.$or = [
        { reservationNumber: { $regex: search, $options: 'i' } },
        { 'guestInfo.name': { $regex: search, $options: 'i' } },
        { 'guestInfo.phone': { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [total, reservations] = await Promise.all([
      Reservation.countDocuments(query),
      Reservation.find(query)
        .populate('restaurantId', 'name slug address contactInfo')
        .populate('customerId', 'firstName lastName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    successResponse(res, {
      reservations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};
