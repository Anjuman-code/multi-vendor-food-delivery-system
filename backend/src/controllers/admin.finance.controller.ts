/**
 * Admin Finance Controller — payout management, revenue reports, commission history.
 * Super-admin gated at route level.
 */
import { startOfDay, subDays } from 'date-fns';
import { NextFunction, Request, Response } from 'express';
import Order from '../models/Order';
import Payout from '../models/Payout';
import VendorProfile from '../models/VendorProfile';
import type { AuthRequest } from '../types';
import { createAuditLog } from '../utils/audit.util';
import { AuthenticationError, NotFoundError, ValidationError } from '../utils/errors';
import { successResponse } from '../utils/response.util';

const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

/** GET /api/admin/finance/payouts */
export const listPayouts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.vendorId) filter.vendorId = req.query.vendorId;

    const [payouts, total] = await Promise.all([
      Payout.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('vendorId', 'firstName lastName email'),
      Payout.countDocuments(filter),
    ]);

    // Pending payout summary
    const pendingVendors = await VendorProfile.find({ pendingPayout: { $gt: 0 } })
      .populate('userId', 'firstName lastName email')
      .select('userId businessName pendingPayout totalEarnings')
      .sort({ pendingPayout: -1 });

    successResponse(res, {
      payouts,
      pagination: buildPagination(page, limit, total),
      pendingVendors,
      pendingTotal: pendingVendors.reduce((sum, v) => sum + v.pendingPayout, 0),
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/finance/payouts/:id */
export const getPayoutDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const payout = await Payout.findById(req.params.id).populate(
      'vendorId',
      'firstName lastName email',
    );
    if (!payout) throw new NotFoundError('Payout not found');

    successResponse(res, { payout });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/finance/payouts/:id/process */
export const processPayout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { transactionRef } = req.body as { transactionRef?: string };

    const payout = await Payout.findById(req.params.id);
    if (!payout) throw new NotFoundError('Payout not found');
    if (payout.status === 'completed') throw new ValidationError('Payout already completed');

    payout.status = 'completed';
    payout.processedAt = new Date();
    if (transactionRef) payout.transactionRef = transactionRef;
    await payout.save();

    // Deduct from vendor's pendingPayout
    await VendorProfile.findOneAndUpdate(
      { userId: payout.vendorId },
      { $inc: { pendingPayout: -payout.amount } },
    );

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'payout.processed',
      resourceType: 'Payout',
      resourceId: payout._id,
      changes: [{ field: 'status', oldValue: 'pending', newValue: 'completed' }],
      metadata: { transactionRef, amount: payout.amount },
    });

    successResponse(res, { payout }, 'Payout processed');
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/finance/revenue */
export const getRevenueStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rangeMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
    const days = rangeMap[req.query.range as string] ?? 30;
    const since = startOfDay(subDays(new Date(), days));

    const [revenue, byPaymentMethod, refunds] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: since }, status: 'delivered' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            gmv: { $sum: '$total' },
            orders: { $sum: 1 },
            tips: { $sum: '$tipAmount' },
            discounts: { $sum: '$discount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: since }, paymentStatus: 'refunded' } },
        { $group: { _id: null, totalRefunded: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
    ]);

    const totals = revenue.reduce(
      (acc, day) => ({
        gmv: acc.gmv + (day.gmv as number),
        orders: acc.orders + (day.orders as number),
      }),
      { gmv: 0, orders: 0 },
    );

    successResponse(res, {
      timeSeries: revenue,
      totals: {
        ...totals,
        platformRevenue: totals.gmv * 0.15,
        refunded: refunds[0]?.totalRefunded ?? 0,
        netRevenue: totals.gmv * 0.15 - (refunds[0]?.totalRefunded ?? 0),
      },
      byPaymentMethod,
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/finance/commission-history */
export const getCommissionHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const profiles = await VendorProfile.find({ 'commissionHistory.0': { $exists: true } })
      .populate('userId', 'firstName lastName email')
      .select('userId businessName commissionRate commissionHistory');

    const allHistory = profiles.flatMap((p) =>
      p.commissionHistory.map((h) => ({
        vendorId: p.userId,
        businessName: p.businessName,
        rate: h.rate,
        effectiveFrom: h.effectiveFrom,
        setBy: h.setBy,
        reason: h.reason,
      })),
    );

    // Sort by date desc
    allHistory.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

    successResponse(res, { history: allHistory, count: allHistory.length });
  } catch (error) {
    next(error);
  }
};
