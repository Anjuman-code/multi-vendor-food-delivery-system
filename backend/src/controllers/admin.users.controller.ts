/**
 * Admin Users Controller — full management of customers, vendors, drivers, and admin team.
 * Every mutation writes to AuditLog.
 */
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { AdminTier, UserRole } from '../config/constants';
import AuditLog from '../models/AuditLog';
import CustomerProfile from '../models/CustomerProfile';
import DriverProfile from '../models/DriverProfile';
import DriverRating from '../models/DriverRating';
import LoyaltyTransaction from '../models/LoyaltyTransaction';
import { NotificationType } from '../models/Notification';
import { createNotification } from '../services/notification.service';
import Order from '../models/Order';
import Restaurant from '../models/Restaurant';
import User from '../models/User';
import VendorProfile from '../models/VendorProfile';
import type { AuthRequest } from '../types';
import { createAuditLog } from '../utils/audit.util';
import {
    AuthenticationError,
    NotFoundError,
    ValidationError
} from '../utils/errors';
import { successResponse } from '../utils/response.util';

// ── Helpers ──────────────────────────────────────────────────────

const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

// ────────────────────────────────────────────────────────────────
// CUSTOMERS
// ────────────────────────────────────────────────────────────────

/** GET /api/admin/users/customers */
export const listCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { role: UserRole.CUSTOMER, deletedAt: null };

    if (req.query.search) {
      const s = req.query.search as string;
      filter.$or = [
        { email: { $regex: s, $options: 'i' } },
        { firstName: { $regex: s, $options: 'i' } },
        { lastName: { $regex: s, $options: 'i' } },
        { phoneNumber: { $regex: s, $options: 'i' } },
      ];
    }
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.isBanned !== undefined) filter.isBanned = req.query.isBanned === 'true';
    if (req.query.isSuspended !== undefined) filter.isSuspended = req.query.isSuspended === 'true';
    if (req.query.isEmailVerified !== undefined)
      filter.isEmailVerified = req.query.isEmailVerified === 'true';
    if (req.query.from) filter.createdAt = { $gte: new Date(req.query.from as string) };
    if (req.query.to) {
      filter.createdAt = { ...(filter.createdAt as object), $lte: new Date(req.query.to as string) };
    }

    const sortField = (req.query.sort as string) || 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .select('-password -refreshToken -emailVerificationToken -passwordResetToken'),
      User.countDocuments(filter),
    ]);

    successResponse(res, { customers: users, pagination: buildPagination(page, limit, total) });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/users/customers/:id */
export const getCustomerDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      role: UserRole.CUSTOMER,
    }).select('-password -refreshToken');
    if (!user) throw new NotFoundError('Customer not found');

    const [customerProfile, recentOrders, loyaltyLog] = await Promise.all([
      CustomerProfile.findOne({ userId: user._id }),
      Order.find({ customerId: user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('orderNumber status total createdAt restaurantId')
        .populate('restaurantId', 'name'),
      LoyaltyTransaction.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(30),
    ]);

    successResponse(res, { user, customerProfile, recentOrders, loyaltyLog });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/admin/users/customers/:id */
export const updateCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const allowed = ['firstName', 'lastName', 'phoneNumber', 'isEmailVerified'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: UserRole.CUSTOMER },
      updates,
      { new: true, runValidators: true },
    ).select('-password -refreshToken');
    if (!user) throw new NotFoundError('Customer not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'customer.updated',
      resourceType: 'User',
      resourceId: user._id,
      changes: Object.entries(updates).map(([field, newValue]) => ({ field, newValue })),
    });

    successResponse(res, { user }, 'Customer updated');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/users/customers/:id/suspend */
export const suspendCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { reason, durationDays } = req.body as { reason: string; durationDays?: number };
    if (!reason) throw new ValidationError('Suspension reason is required');

    const suspendedUntil = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: UserRole.CUSTOMER },
      {
        isSuspended: true,
        suspendedReason: reason,
        suspendedUntil,
        suspendedBy: authReq.user._id,
        isActive: false,
      },
      { new: true },
    ).select('-password -refreshToken');
    if (!user) throw new NotFoundError('Customer not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'customer.suspended',
      resourceType: 'User',
      resourceId: user._id,
      changes: [
        { field: 'isSuspended', newValue: true },
        { field: 'suspendedReason', newValue: reason },
        { field: 'suspendedUntil', newValue: suspendedUntil },
      ],
      metadata: { reason, durationDays },
    });

    successResponse(res, { user }, 'Customer suspended');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/users/customers/:id/unsuspend */
export const unsuspendCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { reason } = req.body as { reason: string };
    if (!reason) throw new ValidationError('Reason is required');

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: UserRole.CUSTOMER },
      {
        isSuspended: false,
        suspendedReason: undefined,
        suspendedUntil: undefined,
        suspendedBy: undefined,
        isActive: true,
      },
      { new: true },
    ).select('-password -refreshToken');
    if (!user) throw new NotFoundError('Customer not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'customer.unsuspended',
      resourceType: 'User',
      resourceId: user._id,
      changes: [{ field: 'isSuspended', newValue: false }],
      metadata: { reason },
    });

    successResponse(res, { user }, 'Customer unsuspended');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/users/customers/:id/ban */
export const banCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { reason } = req.body as { reason: string };
    if (!reason) throw new ValidationError('Ban reason is required');

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: UserRole.CUSTOMER },
      {
        isBanned: true,
        bannedReason: reason,
        bannedAt: new Date(),
        bannedBy: authReq.user._id,
        isActive: false,
        isSuspended: false,
      },
      { new: true },
    ).select('-password -refreshToken');
    if (!user) throw new NotFoundError('Customer not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'customer.banned',
      resourceType: 'User',
      resourceId: user._id,
      changes: [
        { field: 'isBanned', newValue: true },
        { field: 'bannedReason', newValue: reason },
      ],
      metadata: { reason },
    });

    successResponse(res, { user }, 'Customer banned');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/users/customers/:id/unban */
export const unbanCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { reason } = req.body as { reason: string };
    if (!reason) throw new ValidationError('Reason is required');

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: UserRole.CUSTOMER },
      {
        isBanned: false,
        bannedReason: undefined,
        bannedAt: undefined,
        bannedBy: undefined,
        isActive: true,
      },
      { new: true },
    ).select('-password -refreshToken');
    if (!user) throw new NotFoundError('Customer not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'customer.unbanned',
      resourceType: 'User',
      resourceId: user._id,
      changes: [{ field: 'isBanned', newValue: false }],
      metadata: { reason },
    });

    successResponse(res, { user }, 'Customer unbanned');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/users/customers/:id/loyalty */
export const adjustLoyaltyPoints = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { points, reason } = req.body as { points: number; reason: string };
    if (points === undefined || points === 0) throw new ValidationError('Points value is required and cannot be zero');
    if (!reason) throw new ValidationError('Reason is required');

    const profile = await CustomerProfile.findOneAndUpdate(
      { userId: req.params.id },
      { $inc: { loyaltyPoints: points } },
      { new: true },
    );
    if (!profile) throw new NotFoundError('Customer profile not found');

    await LoyaltyTransaction.create({
      userId: req.params.id,
      points,
      type: points > 0 ? 'credit' : 'debit',
      description: `Admin adjustment: ${reason}`,
      referenceId: authReq.user._id,
      referenceType: 'AdminAdjustment',
    });

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'customer.loyalty_adjusted',
      resourceType: 'User',
      resourceId: new mongoose.Types.ObjectId(req.params.id),
      changes: [{ field: 'loyaltyPoints', newValue: points }],
      metadata: { reason },
    });

    successResponse(res, { profile }, 'Loyalty points adjusted');
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// VENDORS
// ────────────────────────────────────────────────────────────────

/** GET /api/admin/users/vendors */
export const listVendors = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { role: UserRole.VENDOR, deletedAt: null };

    if (req.query.search) {
      const s = req.query.search as string;
      filter.$or = [
        { email: { $regex: s, $options: 'i' } },
        { firstName: { $regex: s, $options: 'i' } },
        { lastName: { $regex: s, $options: 'i' } },
      ];
    }
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.isBanned !== undefined) filter.isBanned = req.query.isBanned === 'true';
    if (req.query.isSuspended !== undefined) filter.isSuspended = req.query.isSuspended === 'true';

    // `isVerified` lives on the VendorProfile, so resolve matching user ids first.
    if (req.query.isVerified !== undefined) {
      const verifiedProfiles = await VendorProfile.find({
        isVerified: req.query.isVerified === 'true',
      }).select('userId');
      filter._id = { $in: verifiedProfiles.map((p) => p.userId) };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password -refreshToken'),
      User.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const profiles = await VendorProfile.find({ userId: { $in: userIds } }).select(
      'userId businessName commissionRate isVerified totalEarnings pendingPayout restaurantIds',
    );
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    const enriched = users.map((u) => ({
      ...u.toObject(),
      vendorProfile: profileMap.get(u._id.toString()) ?? null,
    }));

    successResponse(res, { vendors: enriched, pagination: buildPagination(page, limit, total) });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/users/vendors/:id */
export const getVendorDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: UserRole.VENDOR }).select(
      '-password -refreshToken',
    );
    if (!user) throw new NotFoundError('Vendor not found');

    const vendorProfile = await VendorProfile.findOne({ userId: user._id });

    const restaurantIds = vendorProfile?.restaurantIds ?? [];
    const ownedRestaurants = await Restaurant.find({ _id: { $in: restaurantIds } }).select(
      'name approvalStatus isActive rating totalOrders',
    );

    const auditHistory = await AuditLog.find({ resourceId: user._id })
      .sort({ timestamp: -1 })
      .limit(20);

    successResponse(res, { user, vendorProfile, restaurants: ownedRestaurants, auditHistory });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/users/vendors/:id/verify */
export const verifyVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { action, reason } = req.body as { action: 'approve' | 'reject'; reason?: string };
    if (!action) throw new ValidationError('Action (approve | reject) is required');
    if (action === 'reject' && !reason) throw new ValidationError('Rejection reason is required');

    const profile = await VendorProfile.findOneAndUpdate(
      { userId: req.params.id },
      { isVerified: action === 'approve' },
      { new: true },
    );
    if (!profile) throw new NotFoundError('Vendor profile not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: `vendor.${action}d`,
      resourceType: 'VendorProfile',
      resourceId: profile._id,
      changes: [{ field: 'isVerified', newValue: action === 'approve' }],
      metadata: { reason },
    });

    successResponse(res, { profile }, `Vendor ${action}d successfully`);
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/users/vendors/:id/commission
 *  super_admin only — enforced at route level */
export const changeVendorCommission = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { rate, reason } = req.body as { rate: number; reason: string };
    if (rate === undefined || rate < 0 || rate > 100) throw new ValidationError('Rate must be 0–100');
    if (!reason) throw new ValidationError('Reason is required');

    const profile = await VendorProfile.findOne({ userId: req.params.id });
    if (!profile) throw new NotFoundError('Vendor profile not found');

    const oldRate = profile.commissionRate;
    profile.commissionRate = rate;
    profile.commissionHistory.push({
      rate,
      effectiveFrom: new Date(),
      setBy: authReq.user._id,
      reason,
    });
    await profile.save();

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'vendor.commission_changed',
      resourceType: 'VendorProfile',
      resourceId: profile._id,
      changes: [{ field: 'commissionRate', oldValue: oldRate, newValue: rate }],
      metadata: { reason },
    });

    successResponse(res, { profile }, 'Commission rate updated');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/users/vendors/:id/suspend */
export const suspendVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { reason, durationDays } = req.body as { reason: string; durationDays?: number };
    if (!reason) throw new ValidationError('Reason is required');

    const suspendedUntil = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: UserRole.VENDOR },
      { isSuspended: true, suspendedReason: reason, suspendedUntil, isActive: false, suspendedBy: authReq.user._id },
      { new: true },
    ).select('-password -refreshToken');
    if (!user) throw new NotFoundError('Vendor not found');

    // Cascade: temporarily close all their restaurants
    await Restaurant.updateMany(
      { _id: { $in: (await VendorProfile.findOne({ userId: req.params.id }))?.restaurantIds ?? [] } },
      { isTemporarilyClosed: true, closureReason: `Vendor account suspended: ${reason}` },
    );

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'vendor.suspended',
      resourceType: 'User',
      resourceId: user._id,
      changes: [{ field: 'isSuspended', newValue: true }],
      metadata: { reason, durationDays },
    });

    successResponse(res, { user }, 'Vendor suspended');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/users/vendors/:id/unsuspend */
export const unsuspendVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { reason } = req.body as { reason: string };
    if (!reason) throw new ValidationError('Reason is required');

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: UserRole.VENDOR },
      { isSuspended: false, suspendedReason: undefined, suspendedUntil: undefined, suspendedBy: undefined, isActive: true },
      { new: true },
    ).select('-password -refreshToken');
    if (!user) throw new NotFoundError('Vendor not found');

    // Cascade: reopen the restaurants closed by the suspension
    await Restaurant.updateMany(
      { _id: { $in: (await VendorProfile.findOne({ userId: req.params.id }))?.restaurantIds ?? [] } },
      { isTemporarilyClosed: false, closureReason: undefined },
    );

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'vendor.unsuspended',
      resourceType: 'User',
      resourceId: user._id,
      changes: [{ field: 'isSuspended', newValue: false }],
      metadata: { reason },
    });

    successResponse(res, { user }, 'Vendor unsuspended');
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// DRIVERS
// ────────────────────────────────────────────────────────────────

/** GET /api/admin/users/drivers */
export const listDrivers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { role: UserRole.DRIVER, deletedAt: null };

    if (req.query.search) {
      const s = req.query.search as string;
      filter.$or = [
        { email: { $regex: s, $options: 'i' } },
        { firstName: { $regex: s, $options: 'i' } },
        { lastName: { $regex: s, $options: 'i' } },
      ];
    }
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.isBanned !== undefined) filter.isBanned = req.query.isBanned === 'true';

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password -refreshToken'),
      User.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const profiles = await DriverProfile.find({ userId: { $in: userIds } });
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    const enriched = users.map((u) => ({
      ...u.toObject(),
      driverProfile: profileMap.get(u._id.toString()) ?? null,
    }));

    successResponse(res, { drivers: enriched, pagination: buildPagination(page, limit, total) });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/users/drivers/:id */
export const getDriverDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: UserRole.DRIVER }).select(
      '-password -refreshToken',
    );
    if (!user) throw new NotFoundError('Driver not found');

    const [driverProfile, recentDeliveries] = await Promise.all([
      DriverProfile.findOne({ userId: user._id }),
      Order.find({ driverId: user._id, status: 'delivered' })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('orderNumber total tipAmount createdAt restaurantId')
        .populate('restaurantId', 'name'),
    ]);

    successResponse(res, { user, driverProfile, recentDeliveries });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/users/drivers/:id/suspend */
export const suspendDriver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { reason, durationDays } = req.body as { reason: string; durationDays?: number };
    if (!reason) throw new ValidationError('Reason is required');

    const suspendedUntil = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: UserRole.DRIVER },
      { isSuspended: true, suspendedReason: reason, suspendedUntil, isActive: false, suspendedBy: authReq.user._id },
      { new: true },
    ).select('-password -refreshToken');
    if (!user) throw new NotFoundError('Driver not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'driver.suspended',
      resourceType: 'User',
      resourceId: user._id,
      changes: [{ field: 'isSuspended', newValue: true }],
      metadata: { reason, durationDays },
    });

    successResponse(res, { user }, 'Driver suspended');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/users/drivers/:id/unsuspend */
export const unsuspendDriver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { reason } = req.body as { reason: string };
    if (!reason) throw new ValidationError('Reason is required');

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: UserRole.DRIVER },
      { isSuspended: false, suspendedReason: undefined, suspendedUntil: undefined, suspendedBy: undefined, isActive: true },
      { new: true },
    ).select('-password -refreshToken');
    if (!user) throw new NotFoundError('Driver not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'driver.unsuspended',
      resourceType: 'User',
      resourceId: user._id,
      changes: [{ field: 'isSuspended', newValue: false }],
      metadata: { reason },
    });

    successResponse(res, { user }, 'Driver unsuspended');
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/users/drivers/applications — pending driver applications */
export const listDriverApplications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const profiles = await DriverProfile.find({ applicationStatus: 'pending' })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const userIds = profiles.map((p) => p.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('-password -refreshToken');
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const total = await DriverProfile.countDocuments({ applicationStatus: 'pending' });

    const applications = profiles.map((p) => ({
      ...p.toObject(),
      user: userMap.get(p.userId.toString()) ?? null,
    }));

    successResponse(res, { applications, pagination: buildPagination(page, limit, total) });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/users/drivers/:id/approve */
export const approveDriver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { welcomeNote } = req.body as { welcomeNote?: string };

    const profile = await DriverProfile.findOneAndUpdate(
      { userId: req.params.id, applicationStatus: 'pending' },
      {
        applicationStatus: 'approved',
        approvedBy: authReq.user._id,
        approvedAt: new Date(),
      },
      { new: true },
    );
    if (!profile) throw new NotFoundError('Pending driver application not found');

    await User.updateOne({ _id: req.params.id }, { isActive: true });

    // Notify driver
    await createNotification({
      userId: String(req.params.id),
      type: NotificationType.SYSTEM,
      title: 'Application approved!',
      message: welcomeNote || 'Your driver application has been approved. You can now start accepting deliveries.',
      data: { action: 'driver_approved' },
    });

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'driver.approved',
      resourceType: 'DriverProfile',
      resourceId: profile._id,
      changes: [{ field: 'applicationStatus', newValue: 'approved' }],
    });

    successResponse(res, { profile }, 'Driver application approved');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/users/drivers/:id/reject */
export const rejectDriver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { reason } = req.body as { reason: string };
    if (!reason) throw new ValidationError('Rejection reason is required');

    const profile = await DriverProfile.findOneAndUpdate(
      { userId: req.params.id },
      { applicationStatus: 'rejected', rejectionReason: reason },
      { new: true },
    );
    if (!profile) throw new NotFoundError('Driver profile not found');

    // Notify driver
    await createNotification({
      userId: String(req.params.id),
      type: NotificationType.SYSTEM,
      title: 'Application not approved',
      message: `Your driver application was not approved. Reason: ${reason}. You may resubmit after correcting the issues.`,
      data: { action: 'driver_rejected', reason },
    });

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'driver.rejected',
      resourceType: 'DriverProfile',
      resourceId: profile._id,
      changes: [{ field: 'applicationStatus', newValue: 'rejected' }, { field: 'rejectionReason', newValue: reason }],
      metadata: { reason },
    });

    successResponse(res, { profile }, 'Driver application rejected');
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/users/drivers/:id/ratings */
export const getDriverRatings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      DriverRating.find({ driverId: req.params.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('orderId', 'orderNumber')
        .populate('customerId', 'firstName lastName'),
      DriverRating.countDocuments({ driverId: req.params.id }),
    ]);

    successResponse(res, { ratings, pagination: buildPagination(page, limit, total) });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// ADMIN TEAM (super_admin only — enforced at route level)
// ────────────────────────────────────────────────────────────────

/** GET /api/admin/team */
export const listAdmins = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const admins = await User.find({ role: { $in: [UserRole.ADMIN, UserRole.SUPPORT] } }).select(
      '-password -refreshToken',
    );
    successResponse(res, { admins });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/team */
export const createAdminUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { email, firstName, lastName, adminTier, password } = req.body as {
      email: string;
      firstName: string;
      lastName: string;
      adminTier: AdminTier;
      password: string;
    };

    if (!Object.values(AdminTier).includes(adminTier)) {
      throw new ValidationError('Invalid admin tier');
    }

    const role = adminTier === AdminTier.SUPPORT ? UserRole.SUPPORT : UserRole.ADMIN;

    const existing = await User.findOne({ email });
    if (existing) throw new ValidationError('Email already in use');

    const newAdmin = await User.create({
      email,
      firstName,
      lastName,
      password,
      role,
      adminTier,
      isEmailVerified: true,
      isActive: true,
    });

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'admin_user.created',
      resourceType: 'User',
      resourceId: newAdmin._id,
      changes: [
        { field: 'role', newValue: role },
        { field: 'adminTier', newValue: adminTier },
      ],
    });

    successResponse(
      res,
      { admin: { ...newAdmin.toObject(), password: undefined } },
      'Admin user created',
      201,
    );
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/admin/team/:id */
export const updateAdminUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { adminTier, isActive } = req.body as {
      adminTier?: AdminTier;
      isActive?: boolean;
    };

    const update: Record<string, unknown> = {};
    const changes: Array<{ field: string; newValue?: unknown }> = [];

    if (adminTier !== undefined) {
      if (!Object.values(AdminTier).includes(adminTier)) {
        throw new ValidationError('Invalid admin tier');
      }
      update.adminTier = adminTier;
      update.role = adminTier === AdminTier.SUPPORT ? UserRole.SUPPORT : UserRole.ADMIN;
      changes.push({ field: 'adminTier', newValue: adminTier });
    }

    if (isActive !== undefined) {
      update.isActive = isActive;
      changes.push({ field: 'isActive', newValue: isActive });
    }

    if (changes.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    const admin = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: [UserRole.ADMIN, UserRole.SUPPORT] } },
      update,
      { new: true },
    ).select('-password -refreshToken');
    if (!admin) throw new NotFoundError('Admin user not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action:
        adminTier !== undefined && isActive === undefined
          ? 'admin_user.tier_changed'
          : 'admin_user.updated',
      resourceType: 'User',
      resourceId: admin._id,
      changes,
    });

    successResponse(res, { admin }, 'Admin user updated');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/team/:id/deactivate */
export const deactivateAdminUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    // Cannot deactivate yourself
    if (req.params.id === authReq.user._id.toString()) {
      throw new ValidationError('You cannot deactivate your own account');
    }

    const admin = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: [UserRole.ADMIN, UserRole.SUPPORT] } },
      { isActive: false },
      { new: true },
    ).select('-password -refreshToken');
    if (!admin) throw new NotFoundError('Admin user not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'admin_user.deactivated',
      resourceType: 'User',
      resourceId: admin._id,
      changes: [{ field: 'isActive', newValue: false }],
    });

    successResponse(res, { admin }, 'Admin user deactivated');
  } catch (error) {
    next(error);
  }
};
