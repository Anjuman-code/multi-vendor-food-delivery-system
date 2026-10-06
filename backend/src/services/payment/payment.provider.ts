/**
 * Payment Provider Abstraction Layer
 * Defines the generic gateway interface (compatible with SSLCommerz, Stripe, etc.)
 * and implements LocalPaymentProvider — an enterprise-grade, 100% self-contained
 * local payment engine.
 */
import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import PaymentSession, {
  IPaymentSessionDocument,
  PaymentMethodName,
  PaymentPurpose,
} from '../../models/PaymentSession';
import PaymentTransaction from '../../models/PaymentTransaction';
import CustomerProfile from '../../models/CustomerProfile';
import WalletTransaction from '../../models/WalletTransaction';
import Order, { PaymentStatus } from '../../models/Order';
import { ValidationError, NotFoundError } from '../../utils/errors';

export interface CardDetailsInput {
  cardNumber: string;
  cardHolder: string;
  expiry: string; // MM/YY
  cvv: string;
}

export interface WalletDetailsInput {
  walletNumber: string;
  pin?: string;
}

export interface CreateSessionParams {
  userId: Types.ObjectId;
  userRole: string;
  orderId?: Types.ObjectId;
  purpose: PaymentPurpose;
  amount: number;
  method: PaymentMethodName;
  currency?: string;
  idempotencyKey?: string;
  cardDetails?: CardDetailsInput;
  walletDetails?: WalletDetailsInput;
  savedPaymentMethodId?: string;
}

export interface PaymentSessionResult {
  sessionId: string;
  status: string;
  amount: number;
  currency: string;
  method: string;
  requiresOtp: boolean;
  otpExpiresAt?: Date;
  resendCooldownSeconds?: number;
  transactionId?: string;
  maskedDetails?: Record<string, string>;
}

export interface OtpVerifyResult {
  success: boolean;
  message: string;
  sessionId: string;
  status: string;
  attemptsRemaining?: number;
}

export interface ProcessPaymentParams {
  sessionId: string;
  pin?: string;
  otp?: string;
}

export interface PaymentExecutionResult {
  success: boolean;
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  method: string;
  brand?: string;
  last4?: string;
  paidAt: Date;
  message: string;
  orderId?: string;
}

export interface IPaymentProvider {
  createSession(params: CreateSessionParams): Promise<PaymentSessionResult>;
  verifyOtp(sessionId: string, otp: string): Promise<OtpVerifyResult>;
  resendOtp(sessionId: string): Promise<{ success: boolean; resendCooldownUntil: Date }>;
  processPayment(params: ProcessPaymentParams): Promise<PaymentExecutionResult>;
  refund(transactionId: string, amount: number, reason: string): Promise<boolean>;
}

// ── Validation Helpers ──────────────────────────────────────────

export function detectCardBrand(num: string): string {
  const cleaned = num.replace(/\D/g, '');
  if (/^4/.test(cleaned)) return 'visa';
  if (/^(5[1-5]|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)/.test(cleaned)) return 'mastercard';
  if (/^3[47]/.test(cleaned)) return 'amex';
  if (/^(6011|65|64[4-9]|622)/.test(cleaned)) return 'discover';
  return 'card';
}

export function isValidLuhn(num: string): boolean {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function isValidBdWalletNumber(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+?8801|01)[3-9]\d{8}$/.test(cleaned);
}

export function normalizeBdWalletPhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+8801')) return cleaned.slice(3);
  if (cleaned.startsWith('8801')) return cleaned.slice(2);
  return cleaned;
}

// ── Local Payment Provider Implementation ───────────────────────

export class LocalPaymentProvider implements IPaymentProvider {
  /**
   * Generates a 6-digit numeric OTP.
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * DEV ONLY: Logs OTP to server terminal with high visibility.
   */
  private logDevOtp(sessionId: string, recipient: string, otp: string, amount: number, method: string) {
    /* ====================================================================== */
    /* DEV ONLY CODE PATH — SIMULATED SMS / 3DS OTP DISPATCH                   */
    /* ====================================================================== */
    console.log('\n======================================================================');
    console.log(`[DEV ONLY] FOOD RUSH PAYMENT GATEWAY OTP VERIFICATION`);
    console.log(`Session ID : ${sessionId}`);
    console.log(`Method     : ${method.toUpperCase()}`);
    console.log(`Recipient  : ${recipient}`);
    console.log(`Amount     : ৳${amount.toFixed(2)}`);
    console.log(`>>> OTP CODE : ${otp} <<< (Valid for 3 minutes)`);
    console.log('======================================================================\n');
  }

  /**
   * Creates a payment session with idempotency protection and OTP dispatch.
   */
  async createSession(params: CreateSessionParams): Promise<PaymentSessionResult> {
    const {
      userId,
      userRole,
      orderId,
      purpose,
      amount,
      method: initialMethod,
      currency = 'BDT',
      idempotencyKey,
      cardDetails,
      walletDetails,
      savedPaymentMethodId,
    } = params;

    let method = initialMethod;

    if (amount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero');
    }

    // Idempotency check: if key already processed, return existing session
    if (idempotencyKey) {
      const existingSession = await PaymentSession.findOne({
        idempotencyKey,
        userId,
        status: { $in: ['pending', 'otp_required', 'processing', 'success'] },
      });
      if (existingSession) {
        return {
          sessionId: existingSession.sessionId,
          status: existingSession.status,
          amount: existingSession.amount,
          currency: existingSession.currency,
          method: existingSession.method,
          requiresOtp: existingSession.status === 'otp_required',
          otpExpiresAt: existingSession.otpExpiresAt,
          transactionId: existingSession.transactionId,
          maskedDetails: existingSession.paymentDetails as Record<string, string>,
        };
      }
    }

    // Validate details according to payment method
    let brand = '';
    let last4 = '';
    let walletNumber = '';
    let cardHolder = '';
    let expiry = '';

    if (savedPaymentMethodId) {
      const profile = await CustomerProfile.findOne({ userId });
      const savedPm = profile?.paymentMethods.find(
        (p: any) => p._id.toString() === savedPaymentMethodId,
      );
      if (!savedPm) throw new ValidationError('Saved payment method not found');

      method = savedPm.type === 'card' ? 'card' : (savedPm.provider.toLowerCase() as any);
      brand = savedPm.provider.toLowerCase();
      last4 = savedPm.last4;
      if (savedPm.expiryMonth && savedPm.expiryYear) {
        expiry = `${String(savedPm.expiryMonth).padStart(2, '0')}/${String(savedPm.expiryYear).slice(-2)}`;
      }
      walletNumber = savedPm.type === 'wallet' ? `017****${savedPm.last4}` : '';
    } else if (method === 'card') {
      if (!cardDetails) throw new ValidationError('Card details are required');
      const cleanNum = cardDetails.cardNumber.replace(/\D/g, '');
      if (!isValidLuhn(cleanNum)) {
        throw new ValidationError('Invalid card number. Please check digits.');
      }
      brand = detectCardBrand(cleanNum);
      last4 = cleanNum.slice(-4);
      cardHolder = cardDetails.cardHolder.trim();
      expiry = cardDetails.expiry.trim();

      if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(expiry)) {
        throw new ValidationError('Invalid expiry format (MM/YY)');
      }
      const cvvClean = cardDetails.cvv.replace(/\D/g, '');
      if (brand === 'amex' ? cvvClean.length !== 4 : cvvClean.length !== 3) {
        throw new ValidationError(brand === 'amex' ? 'Amex requires a 4-digit CVV' : 'Valid 3-digit CVV required');
      }
    } else if (['bkash', 'nagad', 'rocket', 'upay'].includes(method)) {
      if (!walletDetails || !walletDetails.walletNumber) {
        throw new ValidationError(`Mobile number is required for ${method.toUpperCase()}`);
      }
      if (!isValidBdWalletNumber(walletDetails.walletNumber)) {
        throw new ValidationError('Please enter a valid Bangladeshi mobile number (e.g. 01712345678)');
      }
      walletNumber = normalizeBdWalletPhone(walletDetails.walletNumber);
    } else if (method === 'wallet') {
      // In-app wallet balance check
      const profile = await CustomerProfile.findOne({ userId });
      if (!profile || profile.walletBalance < amount) {
        throw new ValidationError(
          `Insufficient Food Rush Wallet balance (Available: ৳${(profile?.walletBalance ?? 0).toFixed(2)})`,
        );
      }
    }

    const sessionId = `sess_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min session TTL

    const requiresOtp = ['bkash', 'nagad', 'rocket', 'upay', 'card'].includes(method);
    let otp: string | undefined;
    let otpExpiresAt: Date | undefined;
    let resendCooldownUntil: Date | undefined;

    if (requiresOtp) {
      otp = this.generateOtp();
      otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes OTP TTL
      resendCooldownUntil = new Date(Date.now() + 60 * 1000); // 60 seconds cooldown
    }

    const session = await PaymentSession.create({
      sessionId,
      idempotencyKey,
      userId,
      userRole,
      orderId,
      purpose,
      amount,
      currency,
      method,
      status: requiresOtp ? 'otp_required' : 'pending',
      otp,
      otpExpiresAt,
      otpAttempts: 0,
      maxOtpAttempts: 3,
      resendCooldownUntil,
      paymentDetails: {
        brand: brand || undefined,
        last4: last4 || (walletNumber ? walletNumber.slice(-4) : undefined),
        cardHolder: cardHolder || undefined,
        expiry: expiry || undefined,
        walletNumber: walletNumber || undefined,
      },
      expiresAt,
    });

    if (requiresOtp && otp) {
      const recipient = walletNumber || `${brand.toUpperCase()} ****${last4}`;
      this.logDevOtp(sessionId, recipient, otp, amount, method);
    }

    return {
      sessionId: session.sessionId,
      status: session.status,
      amount: session.amount,
      currency: session.currency,
      method: session.method,
      requiresOtp,
      otpExpiresAt,
      resendCooldownSeconds: requiresOtp ? 60 : undefined,
      maskedDetails: session.paymentDetails as Record<string, string>,
    };
  }

  /**
   * Verifies OTP code with attempt limiting and expiry check.
   */
  async verifyOtp(sessionId: string, inputOtp: string): Promise<OtpVerifyResult> {
    const session = await PaymentSession.findOne({ sessionId });
    if (!session) throw new NotFoundError('Payment session not found');

    if (session.status !== 'otp_required') {
      if (session.status === 'success') {
        return { success: true, message: 'Payment already completed', sessionId, status: session.status };
      }
      throw new ValidationError(`Session is not awaiting OTP (Status: ${session.status})`);
    }

    if (session.otpExpiresAt && new Date() > session.otpExpiresAt) {
      session.status = 'failed';
      session.failureReason = 'OTP expired';
      await session.save();
      throw new ValidationError('Verification code has expired. Please request a new code.');
    }

    if (session.otpAttempts >= session.maxOtpAttempts) {
      session.status = 'failed';
      session.failureReason = 'Maximum OTP attempts exceeded';
      await session.save();
      throw new ValidationError('Maximum OTP verification attempts exceeded. Please restart payment.');
    }

    if (!session.otp || session.otp !== inputOtp.trim()) {
      session.otpAttempts += 1;
      await session.save();
      const attemptsLeft = session.maxOtpAttempts - session.otpAttempts;
      throw new ValidationError(
        attemptsLeft > 0
          ? `Incorrect OTP. ${attemptsLeft} attempt(s) remaining.`
          : 'Incorrect OTP. Maximum attempts exceeded.',
      );
    }

    // OTP verified: transition to processing
    session.status = 'processing';
    await session.save();

    return {
      success: true,
      message: 'OTP verified successfully',
      sessionId,
      status: session.status,
    };
  }

  /**
   * Resends a fresh OTP if cooldown period has elapsed.
   */
  async resendOtp(sessionId: string): Promise<{ success: boolean; resendCooldownUntil: Date }> {
    const session = await PaymentSession.findOne({ sessionId });
    if (!session) throw new NotFoundError('Payment session not found');

    if (session.status !== 'otp_required') {
      throw new ValidationError('Cannot resend OTP for this session');
    }

    if (session.resendCooldownUntil && new Date() < session.resendCooldownUntil) {
      const waitSec = Math.ceil((session.resendCooldownUntil.getTime() - Date.now()) / 1000);
      throw new ValidationError(`Please wait ${waitSec} seconds before requesting a new code.`);
    }

    const newOtp = this.generateOtp();
    session.otp = newOtp;
    session.otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000);
    session.resendCooldownUntil = new Date(Date.now() + 60 * 1000);
    session.otpAttempts = 0;
    await session.save();

    const recipient = session.paymentDetails?.walletNumber || `Card ****${session.paymentDetails?.last4 || ''}`;
    this.logDevOtp(session.sessionId, recipient, newOtp, session.amount, session.method);

    return {
      success: true,
      resendCooldownUntil: session.resendCooldownUntil,
    };
  }

  /**
   * Executes payment, updates order/wallet balance, and generates immutable transaction record.
   */
  async processPayment(params: ProcessPaymentParams): Promise<PaymentExecutionResult> {
    const { sessionId, pin, otp } = params;

    const session = await PaymentSession.findOne({ sessionId });
    if (!session) throw new NotFoundError('Payment session not found');

    if (session.status === 'success' && session.transactionId) {
      return {
        success: true,
        transactionId: session.transactionId,
        status: 'success',
        amount: session.amount,
        currency: session.currency,
        method: session.method,
        brand: session.paymentDetails?.brand,
        last4: session.paymentDetails?.last4,
        paidAt: session.updatedAt,
        message: 'Payment was already processed successfully',
        orderId: session.orderId?.toString(),
      };
    }

    // If session required OTP and hasn't transitioned to processing yet, verify it now
    if (session.status === 'otp_required') {
      if (!otp) throw new ValidationError('OTP verification is required');
      await this.verifyOtp(sessionId, otp);
    }

    // Wallets require PIN verification step only if not already verified via OTP/processing
    if (session.status !== 'processing' && ['bkash', 'nagad', 'rocket', 'upay'].includes(session.method)) {
      if (!pin || pin.length < 4 || pin.length > 5) {
        throw new ValidationError('Please enter a valid 4 or 5-digit PIN');
      }
    }

    // Execute in-app wallet balance deduction
    if (session.method === 'wallet') {
      const profile = await CustomerProfile.findOne({ userId: session.userId });
      if (!profile || profile.walletBalance < session.amount) {
        session.status = 'failed';
        session.failureReason = 'Insufficient wallet balance';
        await session.save();
        throw new ValidationError('Insufficient wallet balance');
      }

      const balanceBefore = profile.walletBalance;
      profile.walletBalance = Math.round((profile.walletBalance - session.amount) * 100) / 100;
      await profile.save();

      await WalletTransaction.create({
        userId: session.userId,
        amount: -session.amount,
        type: 'order_payment',
        status: 'completed',
        orderId: session.orderId,
        paymentSessionId: session.sessionId,
        description: `Payment for Order #${session.orderId}`,
        balanceBefore,
        balanceAfter: profile.walletBalance,
      });
    }

    // Generate unique transaction reference
    const prefix = session.method.toUpperCase().slice(0, 4);
    const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const transactionId = `TXN-${prefix}-${dateCode}-${randCode}`;

    // Mark session completed
    session.status = 'success';
    session.transactionId = transactionId;
    await session.save();

    // Create immutable platform transaction ledger entry
    await PaymentTransaction.create({
      transactionId,
      sessionId: session.sessionId,
      orderId: session.orderId,
      payerId: session.userId,
      payerRole: session.userRole,
      purpose: session.purpose,
      amount: session.amount,
      currency: session.currency,
      paymentMethod: session.method,
      paymentBrand: session.paymentDetails?.brand,
      last4: session.paymentDetails?.last4,
      status: 'success',
      gatewayRef: `GW-${randCode}`,
      metadata: {
        walletNumber: session.paymentDetails?.walletNumber,
        cardHolder: session.paymentDetails?.cardHolder,
      },
    });

    // If tied to an order, update the Order document
    if (session.orderId) {
      const order = await Order.findById(session.orderId);
      if (order) {
        order.paymentStatus = PaymentStatus.PAID;
        order.paymentMethod = session.method;
        order.transactionId = transactionId;
        order.statusHistory.push({
          status: order.status,
          timestamp: new Date(),
          actorId: session.userId,
          actorRole: session.userRole,
          note: `Payment confirmed via ${session.method.toUpperCase()} (Ref: ${transactionId})`,
        });
        await order.save();
      }
    }

    return {
      success: true,
      transactionId,
      status: 'success',
      amount: session.amount,
      currency: session.currency,
      method: session.method,
      brand: session.paymentDetails?.brand,
      last4: session.paymentDetails?.last4,
      paidAt: new Date(),
      message: 'Payment processed successfully',
      orderId: session.orderId?.toString(),
    };
  }

  /**
   * Issues refund against a transaction.
   */
  async refund(transactionId: string, amount: number, reason: string): Promise<boolean> {
    const txn = await PaymentTransaction.findOne({ transactionId });
    if (!txn) throw new NotFoundError('Transaction not found');

    if (amount <= 0 || amount > txn.amount - txn.refundedAmount) {
      throw new ValidationError('Invalid refund amount');
    }

    txn.refundedAmount += amount;
    if (txn.refundedAmount >= txn.amount) {
      txn.status = 'refunded';
    }
    txn.refundReason = reason;
    await txn.save();

    // If payment was made with wallet, refund directly back to customer's wallet balance
    if (txn.paymentMethod === 'wallet') {
      const profile = await CustomerProfile.findOne({ userId: txn.payerId });
      if (profile) {
        const balanceBefore = profile.walletBalance;
        profile.walletBalance = Math.round((profile.walletBalance + amount) * 100) / 100;
        await profile.save();

        await WalletTransaction.create({
          userId: txn.payerId,
          amount,
          type: 'refund',
          status: 'completed',
          orderId: txn.orderId,
          transactionRef: transactionId,
          description: `Refund for Transaction ${transactionId}: ${reason}`,
          balanceBefore,
          balanceAfter: profile.walletBalance,
        });
      }
    }

    return true;
  }
}

export const paymentProvider = new LocalPaymentProvider();
