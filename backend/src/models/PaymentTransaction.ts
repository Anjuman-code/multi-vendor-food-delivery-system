import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type TransactionStatus = 'pending' | 'success' | 'failed' | 'refunded';

export interface IPaymentTransaction {
  transactionId: string;
  sessionId?: string;
  orderId?: Types.ObjectId;
  payerId: Types.ObjectId;
  payerRole: string;
  recipientId?: Types.ObjectId;
  purpose: 'order_payment' | 'wallet_topup' | 'cod_remittance' | 'payout';
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentBrand?: string;
  last4?: string;
  status: TransactionStatus;
  gatewayRef: string;
  gatewayResponse?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  refundedAmount: number;
  refundReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentTransactionDocument
  extends Omit<Document, '_id'>, IPaymentTransaction {
  _id: Types.ObjectId;
}

const paymentTransactionSchema = new Schema<IPaymentTransactionDocument>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    payerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    payerRole: {
      type: String,
      required: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    purpose: {
      type: String,
      enum: ['order_payment', 'wallet_topup', 'cod_remittance', 'payout'],
      required: true,
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
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentBrand: {
      type: String,
    },
    last4: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    gatewayRef: {
      type: String,
      required: true,
    },
    gatewayResponse: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundReason: {
      type: String,
    },
  },
  { timestamps: true },
);

paymentTransactionSchema.index({ createdAt: -1 });
paymentTransactionSchema.index({ paymentMethod: 1, status: 1 });

const PaymentTransaction: Model<IPaymentTransactionDocument> =
  mongoose.model<IPaymentTransactionDocument>(
    'PaymentTransaction',
    paymentTransactionSchema,
  );

export default PaymentTransaction;
