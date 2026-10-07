/**
 * Payment Controller — Unified payment engine across all platform roles.
 * Provides session-based payments (Cards with Luhn check and brand detection,
 * bKash, Nagad, Rocket, Upay, Cash on Delivery, and In-App Wallet),
 * OTP verification with rate limiting, wallet top-up, and COD remittance.
 */
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import Order, { PaymentStatus } from '../models/Order';
import Reservation from '../models/Reservation';
import Restaurant from '../models/Restaurant';
import CustomerProfile from '../models/CustomerProfile';
import { PaymentMethodType } from '../config/constants';
import WalletTransaction from '../models/WalletTransaction';
import PaymentSession from '../models/PaymentSession';
import PaymentTransaction from '../models/PaymentTransaction';
import PlatformSettings from '../models/PlatformSettings';
import DriverProfile from '../models/DriverProfile';
import { NotificationType } from '../models/Notification';
import { createNotification } from '../services/notification.service';
import { paymentProvider } from '../services/payment/payment.provider';
import type { AuthRequest } from '../types';
import { createAuditLog } from '../utils/audit.util';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { successResponse } from '../utils/response.util';
import { getIO } from '../socket';

// ── 1. Create Payment Session ───────────────────────────────────

/**
 * POST /api/payments/session
 * Initiates an interactive payment session with idempotency key and OTP dispatch.
 */
export const initiatePaymentSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const {
      orderId,
      reservationId,
      purpose = 'order_payment',
      amount: manualAmount,
      method,
      cardDetails,
      walletDetails,
      savedPaymentMethodId,
      idempotencyKey,
    } = req.body;

    if (!method && !savedPaymentMethodId) {
      throw new ValidationError('Payment method is required');
    }

    let finalAmount = manualAmount;
    let orderObjectId: Types.ObjectId | undefined;
    let reservationObjectId: Types.ObjectId | undefined;

    if (purpose === 'order_payment') {
      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
        throw new ValidationError('A valid order ID is required');
      }
      const order = await Order.findById(orderId);
      if (!order) throw new NotFoundError('Order not found');

      if (
        authReq.user.role !== 'admin' &&
        order.customerId.toString() !== authReq.user._id.toString()
      ) {
        throw new ValidationError('You are not authorized to pay for this order');
      }

      if (order.paymentStatus === PaymentStatus.PAID) {
        successResponse(
          res,
          {
            alreadyPaid: true,
            transactionId: order.transactionId,
            order,
          },
          'Order has already been paid',
        );
        return;
      }

      finalAmount = order.total;
      orderObjectId = order._id as Types.ObjectId;
    } else if (purpose === 'reservation_deposit') {
      if (!reservationId || !mongoose.Types.ObjectId.isValid(reservationId)) {
        throw new ValidationError('A valid reservation ID is required');
      }
      const reservation = await Reservation.findById(reservationId);
      if (!reservation) throw new NotFoundError('Reservation not found');

      if (
        authReq.user.role !== 'admin' &&
        reservation.customerId &&
        reservation.customerId.toString() !== authReq.user._id.toString()
      ) {
        throw new ValidationError(
          'You are not authorized to pay for this reservation',
        );
      }

      if (reservation.deposit.status === 'paid') {
        successResponse(
          res,
          {
            alreadyPaid: true,
            transactionId: reservation.deposit.transactionId,
            reservation,
          },
          'Reservation deposit has already been paid',
        );
        return;
      }

      finalAmount = reservation.deposit.amount;
      reservationObjectId = reservation._id as Types.ObjectId;
    } else if (purpose === 'wallet_topup') {
      if (!manualAmount || manualAmount < 10) {
        throw new ValidationError('Minimum wallet top-up amount is ৳10');
      }
      finalAmount = manualAmount;
    } else if (purpose === 'cod_remittance') {
      if (!manualAmount || manualAmount <= 0) {
        throw new ValidationError('Remittance amount must be greater than zero');
      }
      finalAmount = manualAmount;
    }

    const sessionResult = await paymentProvider.createSession({
      userId: authReq.user._id,
      userRole: authReq.user.role,
      orderId: orderObjectId,
      reservationId: reservationObjectId,
      purpose,
      amount: finalAmount,
      method,
      idempotencyKey,
      cardDetails,
      walletDetails,
      savedPaymentMethodId,
    });

    successResponse(res, sessionResult, 'Payment session initialized', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to finalize post-payment processing:
 * updates order to PAID, saves customer payment method, dispatches sockets and notifications.
 */
const finalizePaymentFulfillment = async (
  session: any,
  execResult: any,
  authReq: AuthRequest,
) => {
  if (!session) return null;

  // Auto-save payment method to customer profile for fast future checkout
  try {
    const profile = await CustomerProfile.findOne({ userId: session.userId });
    if (profile && session.paymentDetails?.last4) {
      const isCard = session.method === 'card';
      const providerName = isCard
        ? (session.paymentDetails.brand || 'card').toUpperCase()
        : session.method.toUpperCase();
      const last4 = session.paymentDetails.last4;

      const alreadyExists = profile.paymentMethods.some(
        (pm) => pm.provider.toUpperCase() === providerName && pm.last4 === last4,
      );

      if (!alreadyExists) {
        let expiryMonth: number | undefined;
        let expiryYear: number | undefined;
        if (session.paymentDetails.expiry && session.paymentDetails.expiry.includes('/')) {
          const [m, y] = session.paymentDetails.expiry.split('/');
          expiryMonth = parseInt(m, 10);
          expiryYear = 2000 + parseInt(y, 10);
        }

        profile.paymentMethods.push({
          type: isCard ? PaymentMethodType.CARD : PaymentMethodType.WALLET,
          provider: providerName,
          token: `tok_${isCard ? 'card' : 'mw'}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          last4,
          expiryMonth,
          expiryYear,
          isDefault: profile.paymentMethods.length === 0,
        } as any);
        await profile.save();
      }
    }
  } catch {
    // Best-effort auto-save
  }

  // Handle wallet top-up purpose
  if (session.purpose === 'wallet_topup') {
    const profile = await CustomerProfile.findOne({ userId: session.userId });
    if (profile) {
      const balanceBefore = profile.walletBalance ?? 0;
      profile.walletBalance = Math.round((balanceBefore + session.amount) * 100) / 100;
      await profile.save();

      await WalletTransaction.create({
        userId: session.userId,
        amount: session.amount,
        type: 'topup',
        status: 'completed',
        paymentSessionId: session.sessionId,
        transactionRef: execResult.transactionId,
        description: `Top-up via ${session.method.toUpperCase()} (Ref: ${execResult.transactionId})`,
        balanceBefore,
        balanceAfter: profile.walletBalance,
      });

      await createNotification({
        userId: session.userId,
        title: 'Wallet Top-Up Successful',
        message: `৳${session.amount.toFixed(2)} added to your Food Rush Wallet. Balance: ৳${profile.walletBalance.toFixed(2)}`,
        type: NotificationType.ORDER_UPDATE,
      });
    }
  }

  // Handle COD Remittance by Driver
  if (session.purpose === 'cod_remittance') {
    await createNotification({
      userId: session.userId,
      title: 'COD Remittance Received',
      message: `৳${session.amount.toFixed(2)} in cash collection has been successfully remitted.`,
      type: NotificationType.ORDER_UPDATE,
    });
  }

  // Handle Order payment notifications and sockets
  let updatedOrder: any = null;
  if (session.orderId) {
    const order = await Order.findById(session.orderId);
    if (order) {
      order.paymentStatus = PaymentStatus.PAID;
      order.paymentMethod = session.method;
      order.transactionId = execResult.transactionId;
      await order.save();
      updatedOrder = order;

      // Customer notification
      await createNotification({
        userId: order.customerId,
        title: 'Payment Successful',
        message: `Your payment of ৳${order.total.toFixed(2)} for order #${order.orderNumber} was confirmed. Transaction ID: ${execResult.transactionId}`,
        type: NotificationType.ORDER_UPDATE,
        data: { orderId: order._id },
      });

      // Socket events
      try {
        const io = getIO();
        io.to(`order_${order._id}`).emit('order:paid', {
          orderId: order._id,
          paymentStatus: PaymentStatus.PAID,
          transactionId: execResult.transactionId,
          paymentMethod: session.method,
        });

        const restaurant = await Restaurant.findById(order.restaurantId);
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
      if (authReq.user) {
        await createAuditLog({
          actorId: authReq.user._id,
          actorRole: authReq.user.role,
          action: 'order.payment_completed',
          resourceType: 'Order',
          resourceId: order._id,
          changes: [
            { field: 'paymentStatus', oldValue: 'pending', newValue: 'paid' },
            { field: 'transactionId', newValue: execResult.transactionId },
            { field: 'paymentMethod', newValue: session.method },
          ],
          metadata: {
            method: session.method,
            transactionId: execResult.transactionId,
            total: order.total,
          },
        });
      }
    }
  }

  // Handle Reservation deposit confirmation
  if (session.reservationId) {
    const reservation = await Reservation.findById(session.reservationId);
    if (reservation) {
      reservation.deposit.status = 'paid';
      reservation.deposit.transactionId = execResult.transactionId;
      reservation.deposit.paidAt = new Date();
      if (reservation.status === 'pending') {
        reservation.status = 'confirmed';
      }
      reservation.statusHistory.push({
        status: reservation.status,
        timestamp: new Date(),
        updatedBy: session.userId,
        reason: `Deposit of ৳${execResult.amount} confirmed via ${session.method}`,
      });
      await reservation.save();

      if (reservation.customerId) {
        await createNotification({
          userId: reservation.customerId,
          title: 'Deposit Paid - Reservation Confirmed',
          message: `Your deposit of ৳${execResult.amount} for reservation #${reservation.reservationNumber} was confirmed.`,
          type: NotificationType.SYSTEM,
          data: { reservationId: reservation._id },
        });
      }
    }
  }

  return updatedOrder;
};

// ── 2. Verify OTP ───────────────────────────────────────────────

/**
 * POST /api/payments/verify-otp
 * Verifies the short-lived OTP for a payment session and executes payment fulfillment.
 */
export const verifyPaymentOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { sessionId, otp } = req.body;
    if (!sessionId) throw new ValidationError('Session ID is required');
    if (!otp) throw new ValidationError('OTP code is required');

    // 1. Verify OTP
    await paymentProvider.verifyOtp(sessionId, otp);

    // 2. Process and finalize payment execution
    const execResult = await paymentProvider.processPayment({
      sessionId,
      otp,
    });

    // 3. Complete fulfillment (mark order paid, emit sockets, save payment method)
    const session = await PaymentSession.findOne({ sessionId });
    const order = await finalizePaymentFulfillment(session, execResult, authReq);

    successResponse(
      res,
      {
        ...execResult,
        order,
      },
      'Payment verified and completed successfully',
    );
  } catch (error) {
    next(error);
  }
};

// ── 3. Resend OTP ───────────────────────────────────────────────

/**
 * POST /api/payments/resend-otp
 * Requests a new OTP code if cooldown has passed.
 */
export const resendPaymentOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { sessionId } = req.body;
    if (!sessionId) throw new ValidationError('Session ID is required');

    const result = await paymentProvider.resendOtp(sessionId);
    successResponse(res, result, 'New verification code dispatched');
  } catch (error) {
    next(error);
  }
};

// ── 4. Confirm Payment ──────────────────────────────────────────

/**
 * POST /api/payments/confirm
 * Confirms payment for a session (with PIN / card completion).
 */
export const confirmPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { sessionId, pin, otp } = req.body;
    if (!sessionId) throw new ValidationError('Session ID is required');

    const session = await PaymentSession.findOne({ sessionId });
    if (!session) throw new NotFoundError('Payment session not found');

    if (
      authReq.user.role !== 'admin' &&
      session.userId.toString() !== authReq.user._id.toString()
    ) {
      throw new ValidationError('Unauthorized to confirm this payment');
    }

    const execResult = await paymentProvider.processPayment({
      sessionId,
      pin,
      otp,
    });

    const order = await finalizePaymentFulfillment(session, execResult, authReq);

    successResponse(res, { ...execResult, order }, 'Payment confirmed successfully');
  } catch (error) {
    next(error);
  }
};

// ── 5. Backward Compatible /api/payments/process ─────────────────

/**
 * POST /api/payments/process
 * Backward compatible endpoint for existing frontend callers.
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
    if (!order) throw new NotFoundError('Order not found');

    if (order.paymentStatus === PaymentStatus.PAID) {
      successResponse(
        res,
        {
          order,
          transactionId: order.transactionId,
          alreadyPaid: true,
        },
        'Order has already been paid',
      );
      return;
    }

    // Step 1: Create session
    const sessionRes = await paymentProvider.createSession({
      userId: authReq.user._id,
      userRole: authReq.user.role,
      orderId: order._id as Types.ObjectId,
      purpose: 'order_payment',
      amount: order.total,
      method,
      cardDetails: method === 'card' ? { cardNumber, cardHolder, expiry, cvv } : undefined,
      walletDetails: ['bkash', 'nagad', 'rocket', 'upay'].includes(method)
        ? { walletNumber }
        : undefined,
    });

    // Step 2: Confirm session
    const execResult = await paymentProvider.processPayment({
      sessionId: sessionRes.sessionId,
      pin,
      otp,
    });

    const updatedOrder = await Order.findById(orderId);

    // Audit log
    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'order.payment_completed',
      resourceType: 'Order',
      resourceId: order._id,
      changes: [
        { field: 'paymentStatus', oldValue: 'pending', newValue: 'paid' },
        { field: 'transactionId', newValue: execResult.transactionId },
        { field: 'paymentMethod', newValue: method },
      ],
      metadata: { method, transactionId: execResult.transactionId, total: order.total },
    });

    successResponse(
      res,
      {
        order: updatedOrder,
        transactionId: execResult.transactionId,
        paymentMethod: method,
        paidAt: execResult.paidAt,
      },
      'Payment processed successfully',
    );
  } catch (error) {
    next(error);
  }
};

// ── 6. Verify Transaction Reference ──────────────────────────────

/**
 * GET /api/payments/verify/:transactionId
 */
export const verifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { transactionId } = req.params;

    const [order, txn] = await Promise.all([
      Order.findOne({ transactionId })
        .select('orderNumber total paymentStatus paymentMethod createdAt restaurantId')
        .populate('restaurantId', 'name'),
      PaymentTransaction.findOne({ transactionId }),
    ]);

    if (!order && !txn) {
      throw new NotFoundError('Transaction reference not found');
    }

    successResponse(res, {
      transactionId,
      valid: true,
      order: order ?? null,
      transaction: txn ?? null,
    });
  } catch (error) {
    next(error);
  }
};

// ── 7. Get Customer Wallet Balance & History ─────────────────────

/**
 * GET /api/payments/wallet
 */
export const getCustomerWallet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const profile = await CustomerProfile.findOne({ userId: authReq.user._id });
    const balance = profile?.walletBalance ?? 0;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    const [transactions, total] = await Promise.all([
      WalletTransaction.find({ userId: authReq.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      WalletTransaction.countDocuments({ userId: authReq.user._id }),
    ]);

    successResponse(res, {
      walletBalance: balance,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── 8. Driver Remit COD Cash ────────────────────────────────────

/**
 * POST /api/payments/driver/cod-remit
 * Rider remits physically collected COD cash to the platform via online payment.
 */
export const remitDriverCodCash = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { amount, method, cardDetails, walletDetails } = req.body;
    if (!amount || amount <= 0) {
      throw new ValidationError('Valid remittance amount is required');
    }

    const sessionResult = await paymentProvider.createSession({
      userId: authReq.user._id,
      userRole: 'driver',
      purpose: 'cod_remittance',
      amount,
      method,
      cardDetails,
      walletDetails,
    });

    successResponse(res, sessionResult, 'Remittance session initialized', 201);
  } catch (error) {
    next(error);
  }
};

// ── 9. Gateway Settings & Available Methods ─────────────────────

/**
 * GET /api/payments/methods
 * Returns platform-enabled payment methods and configurations.
 */
export const getAvailablePaymentMethods = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const settings = await PlatformSettings.findOne().select('paymentGatewaySettings currency');
    const config = settings?.paymentGatewaySettings ?? {
      cardsEnabled: true,
      bkashEnabled: true,
      nagadEnabled: true,
      rocketEnabled: true,
      upayEnabled: true,
      walletEnabled: true,
      codEnabled: true,
      otpExpiryMinutes: 3,
      sandboxMode: true,
    };

    const methods = [
      { id: 'card', name: 'Credit or Debit Card', brands: ['Visa', 'Mastercard', 'Amex'], enabled: config.cardsEnabled },
      { id: 'bkash', name: 'bKash Mobile Wallet', enabled: config.bkashEnabled },
      { id: 'nagad', name: 'Nagad Mobile Wallet', enabled: config.nagadEnabled },
      { id: 'rocket', name: 'Rocket (DBBL)', enabled: config.rocketEnabled },
      { id: 'upay', name: 'Upay (UCB)', enabled: config.upayEnabled },
      { id: 'wallet', name: 'Food Rush Wallet', enabled: config.walletEnabled },
      { id: 'cash_on_delivery', name: 'Cash on Delivery', enabled: config.codEnabled },
    ];

    successResponse(res, {
      methods,
      config: {
        currency: settings?.currency || 'BDT',
        otpExpiryMinutes: config.otpExpiryMinutes,
        sandboxMode: config.sandboxMode,
      },
    });
  } catch (error) {
    next(error);
  }
};
