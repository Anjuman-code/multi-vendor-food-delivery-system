import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type WalletTxnType = 'topup' | 'order_payment' | 'refund' | 'adjustment';
export type WalletTxnStatus = 'pending' | 'completed' | 'failed';

export interface IWalletTransaction {
  userId: Types.ObjectId;
  amount: number; // positive for credit (topup, refund), negative for debit (order_payment)
  type: WalletTxnType;
  status: WalletTxnStatus;
  orderId?: Types.ObjectId;
  paymentSessionId?: string;
  transactionRef?: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletTransactionDocument
  extends Omit<Document, '_id'>, IWalletTransaction {
  _id: Types.ObjectId;
}

const walletTransactionSchema = new Schema<IWalletTransactionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['topup', 'order_payment', 'refund', 'adjustment'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    paymentSessionId: {
      type: String,
      trim: true,
    },
    transactionRef: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

const WalletTransaction: Model<IWalletTransactionDocument> =
  mongoose.model<IWalletTransactionDocument>('WalletTransaction', walletTransactionSchema);

export default WalletTransaction;
