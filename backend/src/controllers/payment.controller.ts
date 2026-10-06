/**
 * Payment Controller — 100% self-contained local payment gateway.
 * Processes interactive mock payments for bKash, Nagad, and Card (Visa/Mastercard)
 * with zero reliance on third-party backend servers.
 */
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import Order, { PaymentStatus } from '../models/Order';
import Restaurant from '../models/Restaurant';
import { NotificationType } from '../models/Notification';
import { createNotification } from '../services/notification.service';
import type { AuthRequest } from '../types';
import { createAuditLog } from '../utils/audit.util';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { successResponse } from '../utils/response.util';
import { getIO } from '../socket';

/** Validates Luhn algorithm for card numbers */
function isValidCardNumber(cardNumber: string): boolean {
  const sanitized = cardNumber.replace(/\D/g, '');
  if (sanitized.length < 13 || sanitized.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/** Validates Bangladesh mobile wallet format (01[3-9]XXXXXXXX or +8801[3-9]XXXXXXXX) */
function isValidWalletNumber(number: string): boolean {
  const cleaned = number.replace(/\s+/g, '');
  return /^(\+?8801|01)[3-9]\d{8}$/.test(cleaned);
}

/**
 * POST /api/payments/process
 * Processes local payment for an existing order.
 */
export const processPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const {
      orderId,
      method,
      walletNumber,
      otp,
      pin,
      cardNumber,
      cardHolder,
      expiry,
      cvv,
    } = req.body;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      throw new ValidationError('A valid order ID is required');
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Verify the customer owns this order (or user is admin)
    if (
      authReq.user.role !== 'admin' &&
      order.customerId.toString() !== authReq.user._id.toString()
    ) {
      throw new ValidationError('You are not authorized to pay for this order');
    }

    // Check if already paid
    if (order.paymentStatus === PaymentStatus.PAID) {
      successResponse(res, {
        order,
        transactionId: order.transactionId,
        alreadyPaid: true,
      }, 'Order has already been paid');
      return;
    }

    let transactionId = '';

    // Validate based on payment method
    if (method === 'bkash') {
      if (!walletNumber || !isValidWalletNumber(walletNumber)) {
        throw new ValidationError('Please enter a valid bKash mobile number');
      }
      if (!otp || otp.length < 4) {
        throw new ValidationError('A valid OTP verification code is required');
      }
      if (!pin || pin.length < 4) {
        throw new ValidationError('Please enter your 5-digit bKash PIN');
      }
      transactionId = `TXN-BK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    } else if (method === 'nagad') {
      if (!walletNumber || !isValidWalletNumber(walletNumber)) {
        throw new ValidationError('Please enter a valid Nagad mobile number');
      }
      if (!otp || otp.length < 4) {
        throw new ValidationError('A valid OTP verification code is required');
      }
      if (!pin || pin.length < 4) {
        throw new ValidationError('Please enter your 4-digit Nagad PIN');
      }
      transactionId = `TXN-NG-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    } else if (method === 'card') {
      if (!cardNumber || !isValidCardNumber(cardNumber)) {
        throw new ValidationError('Please enter a valid card number');
      }
      if (!cardHolder || cardHolder.trim().length < 2) {
        throw new ValidationError('Cardholder name is required');
      }
      if (!expiry || !/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(expiry.trim())) {
        throw new ValidationError('Valid card expiry (MM/YY) is required');
      }
      if (!cvv || cvv.length < 3 || cvv.length > 4) {
        throw new ValidationError('Valid 3 or 4 digit CVV/CVC is required');
      }
      transactionId = `TXN-CARD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    } else {
      throw new ValidationError(`Unsupported payment method: ${method}`);
    }

    // Update order with paid status
    order.paymentStatus = PaymentStatus.PAID;
    order.paymentMethod = method;
    order.transactionId = transactionId;
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      note: `Online payment received via ${method.toUpperCase()} (Ref: ${transactionId})`,
    });

    await order.save();

    // Create notifications
    await createNotification({
      userId: order.customerId,
      title: 'Payment Successful',
      message: `Your payment of ৳${order.total.toFixed(2)} for order #${order.orderNumber} was confirmed. Transaction ID: ${transactionId}`,
      type: NotificationType.ORDER_UPDATE,
      data: { orderId: order._id },
    });

    // Notify restaurant owner
    const restaurant = await Restaurant.findById(order.restaurantId);

    // Emit real-time socket events
    try {
      const io = getIO();
      io.to(`order_${order._id}`).emit('order:paid', {
        orderId: order._id,
        paymentStatus: PaymentStatus.PAID,
        transactionId,
        paymentMethod: method,
      });

      if (restaurant) {
        io.to(`restaurant_${restaurant._id}`).emit('order:payment_update', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: PaymentStatus.PAID,
          total: order.total,
        });
      }
    } catch {
      // Socket emission is best-effort
    }

    // Audit log
    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'order.payment_completed',
      resourceType: 'Order',
      resourceId: order._id,
      changes: [
        { field: 'paymentStatus', oldValue: 'pending', newValue: 'paid' },
        { field: 'transactionId', newValue: transactionId },
        { field: 'paymentMethod', newValue: method },
      ],
      metadata: { method, transactionId, total: order.total },
    });

    successResponse(
      res,
      {
        order,
        transactionId,
        paymentMethod: method,
        paidAt: new Date(),
      },
      'Payment processed successfully',
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/verify/:transactionId
 * Verifies a transaction reference.
 */
export const verifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { transactionId } = req.params;
    const order = await Order.findOne({ transactionId })
      .select('orderNumber total paymentStatus paymentMethod createdAt restaurantId')
      .populate('restaurantId', 'name');

    if (!order) {
      throw new NotFoundError('Transaction reference not found');
    }

    successResponse(res, {
      transactionId,
      valid: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};
