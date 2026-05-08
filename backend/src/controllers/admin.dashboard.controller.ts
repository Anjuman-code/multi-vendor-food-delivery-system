/**
 * Admin Dashboard Controller — KPI summary, analytics, and pending actions queue.
 */
import { NextFunction, Request, Response } from 'express';
import DriverProfile from '../models/DriverProfile';
import Order from '../models/Order';
import Restaurant from '../models/Restaurant';
import SupportTicket from '../models/SupportTicket';
import User from '../models/User';
import VendorProfile from '../models/VendorProfile';
import { successResponse } from '../utils/response.util';

const startOfDay = (d: Date): Date => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
};
const subDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
};

/** GET /api/admin/dashboard/stats */
export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const today = startOfDay(new Date());
    const yesterday = startOfDay(subDays(new Date(), 1));
    const weekAgo = startOfDay(subDays(new Date(), 7));
    const twoWeeksAgo = startOfDay(subDays(new Date(), 14));

    const [
      // Today's orders
      todayOrders,
      yesterdayOrders,
      // This week vs last week
      thisWeekOrders,
      lastWeekOrders,
      // New customers
      todayCustomers,
      yesterdayCustomers,
      // Pending queues
      pendingVendorApplications,
      pendingDriverApplications,
      pendingRestaurantApprovals,
      openSupportTickets,
      // Active orders (live)
      activeOrders,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: today } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            gmv: { $sum: '$total' },
            revenue: { $sum: { $multiply: ['$total', 0.15] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            avgValue: { $avg: '$total' },
          },
        },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: yesterday, $lt: today } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            gmv: { $sum: '$total' },
            revenue: { $sum: { $multiply: ['$total', 0.15] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        { $group: { _id: null, count: { $sum: 1 }, gmv: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } } },
        { $group: { _id: null, count: { $sum: 1 }, gmv: { $sum: '$total' } } },
      ]),
      User.countDocuments({ role: 'customer', createdAt: { $gte: today } }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: yesterday, $lt: today } }),
      VendorProfile.countDocuments({ isVerified: false }),
      DriverProfile.countDocuments({ isAvailable: false, completedDeliveries: 0 }),
      Restaurant.countDocuments({ approvalStatus: 'pending', deletedAt: null }),
      SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
      Order.aggregate([
        { $match: { status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'picked_up'] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const td = todayOrders[0] || { count: 0, gmv: 0, revenue: 0, cancelled: 0, delivered: 0, avgValue: 0 };
    const yd = yesterdayOrders[0] || { count: 0, gmv: 0, revenue: 0, cancelled: 0 };
    const tw = thisWeekOrders[0] || { count: 0, gmv: 0 };
    const lw = lastWeekOrders[0] || { count: 0, gmv: 0 };

    // Active orders by status map
    const activeByStatus: Record<string, number> = {};
    for (const entry of activeOrders) {
      activeByStatus[entry._id as string] = entry.count as number;
    }

    // Pending orders stuck for > 10 minutes
    const stuckPendingCount = await Order.countDocuments({
      status: 'pending',
      createdAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) },
    });

    const pct = (a: number, b: number) =>
      b === 0 ? null : Number((((a - b) / b) * 100).toFixed(1));

    successResponse(
      res,
      {
        today: {
          gmv: td.gmv,
          revenue: td.revenue,
          orders: td.count,
          cancelledOrders: td.cancelled,
          deliveredOrders: td.delivered,
          cancellationRate: td.count ? Number(((td.cancelled / td.count) * 100).toFixed(1)) : 0,
          avgOrderValue: td.avgValue,
          newCustomers: todayCustomers,
        },
        yesterday: {
          gmv: yd.gmv,
          revenue: yd.revenue,
          orders: yd.count,
          newCustomers: yesterdayCustomers,
        },
        changes: {
          gmvPct: pct(td.gmv, yd.gmv),
          ordersPct: pct(td.count, yd.count),
          customersPct: pct(todayCustomers, yesterdayCustomers),
        },
        thisWeek: { orders: tw.count, gmv: tw.gmv },
        lastWeek: { orders: lw.count, gmv: lw.gmv },
        weekChanges: {
          ordersPct: pct(tw.count, lw.count),
          gmvPct: pct(tw.gmv, lw.gmv),
        },
        liveOperations: {
          activeOrders: activeByStatus,
          stuckPendingOrders: stuckPendingCount,
        },
        pendingActions: {
          vendorApplications: pendingVendorApplications,
          driverApplications: pendingDriverApplications,
          restaurantApprovals: pendingRestaurantApprovals,
          openSupportTickets,
        },
      },
      'Dashboard stats loaded',
    );
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/dashboard/charts?range=7d|30d|90d */
export const getDashboardCharts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rangeMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = rangeMap[req.query.range as string] ?? 30;
    const since = startOfDay(subDays(new Date(), days));

    const [orderTimeSeries, userTimeSeries, topRestaurants, statusFunnel, cuisineDistribution] =
      await Promise.all([
        // Orders + GMV per day
        Order.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              orders: { $sum: 1 },
              gmv: { $sum: '$total' },
              cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        // New users per day by role
        User.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                role: '$role',
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.date': 1 } },
        ]),
        // Top 10 restaurants by revenue
        Order.aggregate([
          { $match: { createdAt: { $gte: since }, status: 'delivered' } },
          {
            $group: {
              _id: '$restaurantId',
              revenue: { $sum: '$total' },
              orders: { $sum: 1 },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'restaurants',
              localField: '_id',
              foreignField: '_id',
              as: 'restaurant',
            },
          },
          { $unwind: '$restaurant' },
          {
            $project: {
              name: '$restaurant.name',
              revenue: 1,
              orders: 1,
            },
          },
        ]),
        // Order status funnel (all time in range)
        Order.aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        // Cuisine distribution
        Restaurant.aggregate([
          { $match: { approvalStatus: 'approved', isActive: true, deletedAt: null } },
          { $unwind: '$cuisineType' },
          { $group: { _id: '$cuisineType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 12 },
        ]),
      ]);

    successResponse(
      res,
      {
        orderTimeSeries,
        userTimeSeries,
        topRestaurants,
        statusFunnel,
        cuisineDistribution,
      },
      'Dashboard charts loaded',
    );
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/dashboard/pending-actions */
export const getPendingActions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [stuckOrders, pendingRestaurants, urgentTickets] = await Promise.all([
      Order.find({
        status: 'pending',
        createdAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) },
      })
        .sort({ createdAt: 1 })
        .limit(10)
        .populate('restaurantId', 'name')
        .populate('customerId', 'firstName lastName email')
        .select('orderNumber total createdAt status restaurantId customerId'),
      Restaurant.find({ approvalStatus: 'pending', deletedAt: null })
        .sort({ createdAt: 1 })
        .limit(10)
        .select('name address.area createdAt'),
      SupportTicket.find({ status: 'open', priority: { $in: ['urgent', 'high'] } })
        .sort({ createdAt: 1 })
        .limit(10)
        .populate('userId', 'firstName lastName email')
        .select('subject priority type createdAt userId'),
    ]);

    successResponse(res, { stuckOrders, pendingRestaurants, urgentTickets }, 'Pending actions loaded');
  } catch (error) {
    next(error);
  }
};
