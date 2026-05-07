/**
 * Referral — tracks user-to-user referrals and reward fulfilment.
 * Rewards are credited when the referred user completes their first order.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export enum ReferralStatus {
  PENDING = "pending",
  SIGNED_UP = "signed_up",
  COMPLETED = "completed",
}

export type ReferralRewardType = "credit" | "points";

export interface IReferral {
  referrerId: Types.ObjectId;
  referredUserId?: Types.ObjectId;
  referralCode: string;
  status: ReferralStatus;
  rewardType: ReferralRewardType;
  rewardAmount: number;
  referrerRewarded: boolean;
  referredRewarded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ReferralDocument = mongoose.HydratedDocument<IReferral>;

const referralSchema = new Schema<IReferral>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    referralCode: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: Object.values(ReferralStatus),
      default: ReferralStatus.PENDING,
    },
    rewardType: {
      type: String,
      enum: ["credit", "points"],
      default: "points",
    },
    rewardAmount: { type: Number, default: 0 },
    referrerRewarded: { type: Boolean, default: false },
    referredRewarded: { type: Boolean, default: false },
  },
  { timestamps: true },
);

referralSchema.index({ referralCode: 1 });

const Referral: Model<IReferral> = mongoose.model<IReferral>("Referral", referralSchema);

export default Referral;
