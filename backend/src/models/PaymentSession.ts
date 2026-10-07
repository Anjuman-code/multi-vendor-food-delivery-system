import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type PaymentSessionStatus =
  | 'pending'
  | 'otp_required'
  | 'processing'
  | 'success'
  | 'failed'
  | 'refunded';

export type PaymentMethodName =
  | 'card'
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'upay'
  | 'wallet'
  | 'cash_on_delivery';

export type PaymentPurpose =
  | 'order_payment'
  | 'wallet_topup'
  | 'cod_remittance'
  | 'reservation_deposit';

export interface IPaymentSession {
  sessionId: string;
  idempotencyKey?: string;
  userId: Types.ObjectId;
  userRole: string;
  orderId?: Types.ObjectId;
  reservationId?: Types.ObjectId;
  purpose: PaymentPurpose;
  amount: number;
  currency: string;
  method: PaymentMethodName;
  status: PaymentSessionStatus;
  otp?: string;
  otpExpiresAt?: Date;
  otpAttempts: number;
  maxOtpAttempts: number;
  resendCooldownUntil?: Date;
  transactionId?: string;
  paymentDetails?: {
    brand?: string;
    last4?: string;
    cardHolder?: string;
    expiry?: string;
    walletNumber?: string;
  };
  failureReason?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentSessionDocument
  extends Omit<Document, '_id'>, IPaymentSession {
  _id: Types.ObjectId;
}

const paymentSessionSchema = new Schema<IPaymentSessionDocument>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      index: true,
    },
    purpose: {
      type: String,
      enum: [
        'order_payment',
        'wallet_topup',
        'cod_remittance',
        'reservation_deposit',
      ],
      default: 'order_payment',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'BDT',
    },
    method: {
      type: String,
      enum: ['card', 'bkash', 'nagad', 'rocket', 'upay', 'wallet', 'cash_on_delivery'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'otp_required', 'processing', 'success', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    maxOtpAttempts: {
      type: Number,
      default: 3,
    },
    resendCooldownUntil: {
      type: Date,
    },
    transactionId: {
      type: String,
      index: true,
      sparse: true,
    },
    paymentDetails: {
      brand: { type: String },
      last4: { type: String },
      cardHolder: { type: String },
      expiry: { type: String },
      walletNumber: { type: String },
    },
    failureReason: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index auto-cleans old expired sessions
    },
  },
  { timestamps: true },
);

paymentSessionSchema.index({ userId: 1, createdAt: -1 });

const PaymentSession: Model<IPaymentSessionDocument> =
  mongoose.model<IPaymentSessionDocument>('PaymentSession', paymentSessionSchema);

export default PaymentSession;
