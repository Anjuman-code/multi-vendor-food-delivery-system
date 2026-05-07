/**
 * Campaign — platform-level promotional campaigns that auto-apply
 * without needing a coupon code. Supports free-delivery, discount,
 * BOGO, loyalty-boost, and vendor-sponsored campaign types.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export enum CampaignType {
  FREE_DELIVERY = "free_delivery",
  DISCOUNT = "discount",
  BOGO = "bogo",
  LOYALTY_BOOST = "loyalty_boost",
  VENDOR_SPONSORED = "vendor_sponsored",
}

export interface ICampaignRules {
  minOrderAmount: number;
  maxDiscount?: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  applicableRestaurants: Types.ObjectId[];
  applicableCategories: Types.ObjectId[];
  applicableCuisineTypes: string[];
  userTiers: string[];
  firstOrderOnly: boolean;
  maxRedemptions: number;
  maxPerUser: number;
}

export interface ICampaignRedemption {
  userId: Types.ObjectId;
  orderId: Types.ObjectId;
  discountAmount: number;
  redeemedAt: Date;
}

export interface ICampaign {
  name: string;
  type: CampaignType;
  rules: ICampaignRules;
  schedule: { start: Date; end: Date };
  isActive: boolean;
  budget: { total: number; used: number };
  redemptions: ICampaignRedemption[];
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignDocument = mongoose.HydratedDocument<ICampaign>;

const campaignRulesSchema = new Schema<ICampaignRules>(
  {
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    applicableRestaurants: {
      type: [{ type: Schema.Types.ObjectId, ref: "Restaurant" }],
      default: [],
    },
    applicableCategories: {
      type: [{ type: Schema.Types.ObjectId, ref: "MenuCategory" }],
      default: [],
    },
    applicableCuisineTypes: { type: [String], default: [] },
    userTiers: { type: [String], default: [] },
    firstOrderOnly: { type: Boolean, default: false },
    maxRedemptions: { type: Number, default: 0 },
    maxPerUser: { type: Number, default: 1 },
  },
  { _id: false },
);

const campaignRedemptionSchema = new Schema<ICampaignRedemption>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    discountAmount: { type: Number, required: true },
    redeemedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const campaignSchema = new Schema<ICampaign>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: {
      type: String,
      enum: Object.values(CampaignType),
      required: true,
    },
    rules: { type: campaignRulesSchema, required: true },
    schedule: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    isActive: { type: Boolean, default: true },
    budget: {
      total: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
    },
    redemptions: { type: [campaignRedemptionSchema], default: [] },
  },
  { timestamps: true },
);

campaignSchema.index({ isActive: 1, "schedule.start": 1, "schedule.end": 1 });

const Campaign: Model<ICampaign> = mongoose.model<ICampaign>("Campaign", campaignSchema);

export default Campaign;
