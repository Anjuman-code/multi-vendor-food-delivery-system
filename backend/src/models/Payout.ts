/**
 * Payout — vendor settlement ledger. Each payout covers a batch of
 * completed orders within a date range, minus platform commission.
 */
import mongoose, { Model, Schema, Types } from 'mongoose';
import {
  BD_PHONE_ERROR_MESSAGE,
  normalizeBdPhoneNumber,
} from '../utils/phone.util';

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface IPayout {
  vendorId: Types.ObjectId;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
  status: PayoutStatus;
  method: string;
  bankSnapshot: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    routingNumber?: string;
    mobileMoneyNumber?: string;
    mobileMoneyProvider?: string;
  };
  orderCount: number;
  commissionTotal: number;
  transactionRef?: string;
  processedBy?: Types.ObjectId;
  processedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PayoutDocument = mongoose.HydratedDocument<IPayout>;

const payoutSchema = new Schema<IPayout>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(PayoutStatus),
      default: PayoutStatus.PENDING,
    },
    method: { type: String, required: true },
    bankSnapshot: {
      bankName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      accountName: { type: String, trim: true },
      routingNumber: { type: String, trim: true },
      mobileMoneyNumber: {
        type: String,
        trim: true,
        match: [/^\+8801[3-9]\d{8}$/, BD_PHONE_ERROR_MESSAGE],
      },
      mobileMoneyProvider: { type: String, trim: true },
    },
    orderCount: { type: Number, default: 0, min: 0 },
    commissionTotal: { type: Number, default: 0, min: 0 },
    transactionRef: { type: String, trim: true },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

payoutSchema.index({ vendorId: 1, createdAt: -1 });
payoutSchema.index({ status: 1 });

payoutSchema.pre('validate', function () {
  if (this.bankSnapshot?.mobileMoneyNumber) {
    this.bankSnapshot.mobileMoneyNumber = normalizeBdPhoneNumber(
      this.bankSnapshot.mobileMoneyNumber,
    );
  }
});

const Payout: Model<IPayout> = mongoose.model<IPayout>('Payout', payoutSchema);

export default Payout;
