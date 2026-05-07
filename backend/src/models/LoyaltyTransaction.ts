/**
 * LoyaltyTransaction — immutable ledger of every loyalty-points mutation.
 * Every change to CustomerProfile.loyaltyPoints must have a corresponding
 * entry here so customers can view their points history and the platform
 * can audit points issuance / redemption.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export enum LoyaltyTransactionType {
  ORDER_EARNED = "order_earned",
  BONUS = "bonus",
  REDEEMED = "redeemed",
  EXPIRED = "expired",
  ADMIN_ADJUSTMENT = "admin_adjustment",
}

export interface ILoyaltyTransaction {
  customerId: Types.ObjectId;
  amount: number;
  type: LoyaltyTransactionType;
  referenceId?: Types.ObjectId;
  description: string;
  balanceAfter: number;
  createdAt: Date;
}

export type LoyaltyTransactionDocument =
  mongoose.HydratedDocument<ILoyaltyTransaction>;

const loyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: Object.values(LoyaltyTransactionType),
      required: true,
    },
    referenceId: { type: Schema.Types.ObjectId },
    description: { type: String, required: true, trim: true },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

loyaltyTransactionSchema.index({ customerId: 1, createdAt: -1 });

const LoyaltyTransaction: Model<ILoyaltyTransaction> =
  mongoose.model<ILoyaltyTransaction>(
    "LoyaltyTransaction",
    loyaltyTransactionSchema,
  );

export default LoyaltyTransaction;
