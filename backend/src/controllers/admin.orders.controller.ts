/**
 * Admin Orders Controller — full order management, refunds, status overrides.
 * Every mutation writes to AuditLog.
 */
import { NextFunction, Request, Response } from 'express';
import Order, { OrderStatus } from '../models/Order';
import User from '../models/User';
import type { AuthRequest } from '../types';
import { createAuditLog } from '../utils/audit.util';
import { AuthenticationError, NotFoundError, ValidationError } from '../utils/errors';
import { successResponse } from '../utils/response.util';
import { reverseOrderEarnings } from '../utils/vendor-stats.util';

const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];

/** GET /api/admin/orders */
export const listOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (req.query.search) {
      filter.$or = [{ orderNumber: { $regex: req.query.search, $options: 'i' } }];
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.restaurantId) filter.restaurantId = req.query.restaurantId;
    if (req.query.customerId) filter.customerId = req.query.customerId;
    if (req.query.driverId) filter.driverId = req.query.driverId;
    if (req.query.from) filter.createdAt = { $gte: new Date(req.query.from as string) };
    if (req.query.to) {
      filter.createdAt = {
        ...(filter.createdAt as object),
        $lte: new Date(req.query.to as string),
      };
    }
    if (req.query.minTotal) filter.total = { $gte: parseFloat(req.query.minTotal as string) };
    if (req.query.maxTotal) {
      filter.total = { ...(filter.total as object), $lte: parseFloat(req.query.maxTotal as string) };
    }
    if (req.query.hasCoupon === 'true') filter.couponCode = { $exists: true, $ne: null };
    if (req.query.hasRefund === 'true') filter['refundLineItems.0'] = { $exists: true };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'firstName lastName email')
        .populate('restaurantId', 'name')
        .populate('driverId', 'firstName lastName')
        .select('-items'),
      Order.countDocuments(filter),
    ]);

    successResponse(res, { orders, pagination: buildPagination(page, limit, total) });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/orders/:id */
export const getOrderDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'firstName lastName email phoneNumber')
      .populate('restaurantId', 'name address contactInfo')
      .populate('driverId', 'firstName lastName phoneNumber');
    if (!order) throw new NotFoundError('Order not found');

    // Audit trail for this order
    const auditHistory = await (await import('../models/AuditLog')).default
      .find({ resourceType: 'Order', resourceId: order._id })
      .sort({ timestamp: -1 });

    successResponse(res, { order, auditHistory });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/admin/orders/:id/status */
export const overrideOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { status, reason } = req.body as { status: string; reason: string };
    if (!VALID_STATUSES.includes(status)) throw new ValidationError('Invalid status');
    if (!reason) throw new ValidationError('Reason is required for manual status override');

    const order = await Order.findById(req.params.id);
    if (!order) throw new NotFoundError('Order not found');

    const oldStatus = order.status;
    order.status = status as typeof order.status;
    order.statusHistory.push({
      status: status as typeof order.status,
      timestamp: new Date(),
      note: `Admin override: ${reason}`,
    });
    await order.save();

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'order.status_overridden',
      resourceType: 'Order',
      resourceId: order._id,
      changes: [{ field: 'status', oldValue: oldStatus, newValue: status }],
      metadata: { reason },
    });

    successResponse(res, { order }, 'Order status updated');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/orders/:id/cancel */
export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { reason } = req.body as { reason: string };
    if (!reason) throw new ValidationError('Cancellation reason is required');

    const order = await Order.findById(req.params.id);
    if (!order) throw new NotFoundError('Order not found');

    if (order.status === 'cancelled') throw new ValidationError('Order is already cancelled');
    if (order.status === 'delivered') throw new ValidationError('Cannot cancel a delivered order');

    const oldStatus = order.status;
    order.status = 'cancelled';
    order.cancelReason = `Admin: ${reason}`;
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: `Cancelled by admin: ${reason}`,
    });
    await order.save();

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'order.cancelled_by_admin',
      resourceType: 'Order',
      resourceId: order._id,
      changes: [{ field: 'status', oldValue: oldStatus, newValue: 'cancelled' }],
      metadata: { reason },
    });

    successResponse(res, { order }, 'Order cancelled');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/orders/:id/refund */
export const issueRefund = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { amount, reason, lineItems } = req.body as {
      amount: number;
      reason: string;
      lineItems?: Array<{ menuItemId: string; name: string; quantity: number; amount: number }>;
    };

    if (!amount || amount <= 0) throw new ValidationError('Refund amount must be positive');
    if (!reason) throw new ValidationError('Refund reason is required');

    const order = await Order.findById(req.params.id);
    if (!order) throw new NotFoundError('Order not found');
    if (amount > order.total) throw new ValidationError('Refund amount exceeds order total');

    // Record refund line items
    if (lineItems?.length) {
      order.refundLineItems.push(
        ...lineItems.map((li) => ({
          menuItemId: li.menuItemId,
          name: li.name,
          quantity: li.quantity,
          refundAmount: li.amount,
          reason,
        })),
      );
    }

    order.paymentStatus = amount >= order.total ? 'refunded' : order.paymentStatus;
    await order.save();

    // Claw back the vendor's net share of the refund — only if the order was
    // delivered (earnings are accrued on delivery). Best-effort.
    if (order.status === OrderStatus.DELIVERED) {
      try {
        await reverseOrderEarnings(order.restaurantId, amount);
      } catch (statErr) {
        console.error('[vendor-stats] reverseOrderEarnings failed', statErr);
      }
    }

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'order.refund_issued',
      resourceType: 'Order',
      resourceId: order._id,
      changes: [{ field: 'refundAmount', newValue: amount }],
      metadata: { reason, lineItems },
    });

    successResponse(res, { order }, `Refund of ${amount} issued`);
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/orders/:id/reassign-driver */
export const reassignDriver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { driverId, reason } = req.body as { driverId: string; reason: string };
    if (!driverId) throw new ValidationError('Driver ID is required');
    if (!reason) throw new ValidationError('Reason is required');

    const [order, driver] = await Promise.all([
      Order.findById(req.params.id),
      User.findOne({ _id: driverId, role: 'driver' }),
    ]);
    if (!order) throw new NotFoundError('Order not found');
    if (!driver) throw new NotFoundError('Driver not found');

    const oldDriverId = order.driverId;
    order.driverId = driver._id;
    await order.save();

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'order.driver_reassigned',
      resourceType: 'Order',
      resourceId: order._id,
      changes: [{ field: 'driverId', oldValue: oldDriverId, newValue: driverId }],
      metadata: { reason },
    });

    successResponse(res, { order }, 'Driver reassigned');
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/orders/disputes */
export const getDisputeQueue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Orders with open support tickets or refund requests
    const SupportTicket = (await import('../models/SupportTicket')).default;

    const openTickets = await SupportTicket.find({
      status: { $in: ['open', 'in_progress'] },
      orderId: { $exists: true, $ne: null },
    })
      .sort({ createdAt: 1 })
      .populate('orderId', 'orderNumber status total createdAt')
      .populate('userId', 'firstName lastName email')
      .limit(50);

    successResponse(res, { disputes: openTickets, count: openTickets.length });
  } catch (error) {
    next(error);
  }
};
