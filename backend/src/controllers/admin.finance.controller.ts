/**
 * Admin Finance Controller — payout management, revenue reports, commission history.
 * Super-admin gated at route level.
 */
import { startOfDay, subDays } from 'date-fns';
import { NextFunction, Request, Response } from 'express';
import Order from '../models/Order';
import Payout, { PayoutStatus } from '../models/Payout';
import PlatformSettings from '../models/PlatformSettings';
import VendorProfile from '../models/VendorProfile';
import DriverProfile from '../models/DriverProfile';
import PaymentTransaction from '../models/PaymentTransaction';
import type { AuthRequest } from '../types';
import { createAuditLog } from '../utils/audit.util';
import { AuthenticationError, NotFoundError, ValidationError } from '../utils/errors';
import { successResponse } from '../utils/response.util';

/** Platform commission fraction sourced from settings (falls back to 15%). */
const getCommissionFraction = async (): Promise<number> => {
  const settings = await PlatformSettings.findOne().select('defaultCommissionRate');
  const rate = settings?.defaultCommissionRate ?? 15;
  return rate / 100;
};

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
    if (req.query.driverId) filter.driverId = req.query.driverId;
    if (req.query.recipientRole) filter.recipientRole = req.query.recipientRole;

    const [payouts, total] = await Promise.all([
      Payout.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('vendorId', 'firstName lastName email')
        .populate('driverId', 'firstName lastName email phone'),
      Payout.countDocuments(filter),
    ]);

    // Pending payout summaries for both vendors and drivers
    const [pendingVendors, pendingDrivers] = await Promise.all([
      VendorProfile.find({ pendingPayout: { $gt: 0 } })
        .populate('userId', 'firstName lastName email')
        .select('userId businessName pendingPayout totalEarnings')
        .sort({ pendingPayout: -1 }),
      DriverProfile.find({ pendingPayout: { $gt: 0 } })
        .populate('userId', 'firstName lastName email')
        .select('userId pendingPayout totalEarnings rating')
        .sort({ pendingPayout: -1 }),
    ]);

    const pendingVendorTotal = pendingVendors.reduce((sum, v) => sum + (v.pendingPayout ?? 0), 0);
    const pendingDriverTotal = pendingDrivers.reduce((sum, d) => sum + (d.pendingPayout ?? 0), 0);

    successResponse(res, {
      payouts,
      pagination: buildPagination(page, limit, total),
      pendingVendors,
      pendingDrivers,
      pendingTotal: pendingVendorTotal + pendingDriverTotal,
      pendingVendorTotal,
      pendingDriverTotal,
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/finance/payouts — initiate a payout for a vendor's pending balance */
export const createPayout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { vendorId, driverId, amount: amountOverride, notes } = req.body as {
      vendorId?: string;
      driverId?: string;
      amount?: number;
      notes?: string;
    };

    if (!vendorId && !driverId) {
      throw new ValidationError('Either Vendor ID or Driver ID is required');
    }

    let payout;

    if (driverId) {
      const profile = await DriverProfile.findOne({ userId: driverId });
      if (!profile) throw new NotFoundError('Driver not found');

      const pending = profile.pendingPayout ?? profile.totalEarnings ?? 0;
      const amount = amountOverride && amountOverride > 0 ? amountOverride : pending;
      if (amount <= 0) throw new ValidationError('Driver has no pending balance to pay out');
      if (amount > pending) throw new ValidationError('Amount exceeds driver pending balance');

      const bank = profile.bankDetails ?? {};
      const method = bank.mobileMoneyNumber ? 'mobile_money' : 'bank_transfer';

      payout = await Payout.create({
        recipientRole: 'driver',
        driverId,
        amount,
        periodStart: subDays(new Date(), 30),
        periodEnd: new Date(),
        status: PayoutStatus.PENDING,
        method,
        bankSnapshot: {
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          accountName: bank.accountHolderName,
          mobileMoneyNumber: bank.mobileMoneyNumber,
          mobileMoneyProvider: bank.mobileMoneyProvider,
        },
        notes: notes || 'Admin initiated rider payout',
      });

      profile.pendingPayout = Math.max(0, pending - amount);
      await profile.save();
    } else {
      const profile = await VendorProfile.findOne({ userId: vendorId });
      if (!profile) throw new NotFoundError('Vendor not found');

      const pending = profile.pendingPayout ?? 0;
      const amount = amountOverride && amountOverride > 0 ? amountOverride : pending;
      if (amount <= 0) throw new ValidationError('Vendor has no pending balance to pay out');
      if (amount > pending) throw new ValidationError('Amount exceeds vendor pending balance');

      const bank = profile.bankDetails ?? {};
      const method = bank.mobileMoneyNumber ? 'mobile_money' : 'bank_transfer';

      const lastPayout = await Payout.findOne({ vendorId }).sort({ periodEnd: -1 });
      const periodStart = lastPayout?.periodEnd ?? subDays(new Date(), 30);

      payout = await Payout.create({
        recipientRole: 'vendor',
        vendorId,
        amount,
        periodStart,
        periodEnd: new Date(),
        status: PayoutStatus.PENDING,
        method,
        bankSnapshot: {
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          accountName: bank.accountName,
          mobileMoneyNumber: bank.mobileMoneyNumber,
          mobileMoneyProvider: bank.mobileMoneyProvider,
        },
        notes,
      });

      // Deduct immediately so balance cannot be double-paid
      profile.pendingPayout -= amount;
      await profile.save();
    }

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'payout.created',
      resourceType: 'Payout',
      resourceId: payout._id,
      changes: [{ field: 'amount', newValue: payout.amount }],
      metadata: { vendorId, driverId },
    });

    successResponse(res, { payout }, 'Payout initiated', 201);
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/finance/payouts/batch-process — process several pending payouts at once */
export const batchProcessPayouts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { ids, transactionRef } = req.body as { ids: string[]; transactionRef?: string };
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('Provide an array of payout IDs to process');
    }

    const payouts = await Payout.find({ _id: { $in: ids }, status: { $ne: PayoutStatus.COMPLETED } });
    const processed: string[] = [];

    for (const payout of payouts) {
      payout.status = PayoutStatus.COMPLETED;
      payout.processedAt = new Date();
      payout.processedBy = authReq.user._id;
      if (transactionRef) payout.transactionRef = transactionRef;
      await payout.save();
      // Note: pendingPayout was already deducted when payout was created/requested.
      // Do not double-decrement.
      processed.push(payout._id.toString());
    }

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'payout.batch_processed',
      resourceType: 'Payout',
      resourceId: authReq.user._id,
      changes: [{ field: 'count', newValue: processed.length }],
      metadata: { ids: processed, transactionRef },
    });

    successResponse(res, { processed, count: processed.length }, `${processed.length} payouts processed`);
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
    const payout = await Payout.findById(req.params.id)
      .populate('vendorId', 'firstName lastName email')
      .populate('driverId', 'firstName lastName email phone');
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

    const { transactionRef, status = PayoutStatus.COMPLETED, notes } = req.body as {
      transactionRef?: string;
      status?: PayoutStatus;
      notes?: string;
    };

    const payout = await Payout.findById(req.params.id);
    if (!payout) throw new NotFoundError('Payout not found');
    if (payout.status === PayoutStatus.COMPLETED) {
      throw new ValidationError('Payout already completed');
    }

    const previousStatus = payout.status;
    payout.status = status;
    payout.processedAt = new Date();
    payout.processedBy = authReq.user._id;
    if (transactionRef) payout.transactionRef = transactionRef;
    if (notes) payout.notes = notes;
    await payout.save();

    // If payout failed or was rejected, restore the pending balance
    if (status === PayoutStatus.FAILED) {
      if (payout.recipientRole === 'driver' || payout.driverId) {
        await DriverProfile.findOneAndUpdate(
          { userId: payout.driverId || payout.vendorId },
          { $inc: { pendingPayout: payout.amount } },
        );
      } else if (payout.vendorId) {
        await VendorProfile.findOneAndUpdate(
          { userId: payout.vendorId },
          { $inc: { pendingPayout: payout.amount } },
        );
      }
    }

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: `payout.${status}`,
      resourceType: 'Payout',
      resourceId: payout._id,
      changes: [{ field: 'status', oldValue: previousStatus, newValue: status }],
      metadata: { transactionRef, amount: payout.amount },
    });

    successResponse(res, { payout }, `Payout ${status}`);
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/finance/cod-reconciliation — monitor driver collected COD vs remitted cash */
export const getCodReconciliation = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const codOrders = await Order.find({
      paymentMethod: 'cash_on_delivery',
      status: 'delivered',
    })
      .select('orderNumber driverId total codCollected codRemitted actualDeliveryTime createdAt')
      .populate('driverId', 'firstName lastName email phone')
      .sort({ actualDeliveryTime: -1 });

    const remittances = await PaymentTransaction.find({
      purpose: 'cod_remittance',
      status: 'success',
    })
      .populate('payerId', 'firstName lastName email phone')
      .sort({ createdAt: -1 });

    const totalCollected = codOrders.reduce(
      (sum, o) => sum + (o.codCollected ? (o.total ?? 0) : 0),
      0,
    );
    const totalRemitted = remittances.reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const outstandingCod = Math.max(0, Math.round((totalCollected - totalRemitted) * 100) / 100);

    successResponse(res, {
      summary: {
        totalOrders: codOrders.length,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalRemitted: Math.round(totalRemitted * 100) / 100,
        outstandingCod,
      },
      codOrders: codOrders.slice(0, 50),
      remittances: remittances.slice(0, 50),
    });
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
    const commission = await getCommissionFraction();

    const [revenue, byPaymentMethod, refunds, topRestaurants] = await Promise.all([
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
      // Refunded revenue per day, so the chart can plot it.
      Order.aggregate([
        { $match: { createdAt: { $gte: since }, paymentStatus: 'refunded' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            refunded: { $sum: '$total' },
            count: { $sum: 1 },
          },
        },
      ]),
      // Top revenue-generating restaurants for the period.
      Order.aggregate([
        { $match: { createdAt: { $gte: since }, status: 'delivered' } },
        { $group: { _id: '$restaurantId', gmv: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { gmv: -1 } },
        { $limit: 10 },
        {
          $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'restaurant' },
        },
        {
          $project: {
            gmv: 1,
            orders: 1,
            name: { $ifNull: [{ $arrayElemAt: ['$restaurant.name', 0] }, 'Unknown'] },
          },
        },
      ]),
    ]);

    const refundByDay = new Map<string, number>(
      refunds.map((r) => [r._id as string, r.refunded as number]),
    );

    const totals = revenue.reduce(
      (acc, day) => ({
        gmv: acc.gmv + (day.gmv as number),
        orders: acc.orders + (day.orders as number),
      }),
      { gmv: 0, orders: 0 },
    );

    const timeSeries = revenue.map((d) => ({
      date: d._id,
      gmv: d.gmv,
      orders: d.orders,
      revenue: Math.round(d.gmv * commission),
      refunded: refundByDay.get(d._id) ?? 0,
    }));

    const byPaymentMethodMapped = byPaymentMethod.map((pm) => ({
      method: pm._id,
      total: pm.total,
      count: pm.count,
    }));

    const totalRefunded = refunds.reduce((s, r) => s + (r.refunded as number), 0);
    const platformRevenue = Math.round(totals.gmv * commission);

    successResponse(res, {
      timeSeries,
      totals: {
        ...totals,
        platformRevenue,
        refunded: totalRefunded,
        netRevenue: platformRevenue - totalRefunded,
        commissionRate: Math.round(commission * 100),
      },
      byPaymentMethod: byPaymentMethodMapped,
      topRestaurants,
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
