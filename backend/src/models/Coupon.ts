/**
 * Coupon Mongoose model – promo codes / discount coupons.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export enum CouponType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
}

export interface ICoupon {
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  maxDiscount?: number;
  validFrom: Date;
  validTo: Date;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  usedBy: { userId: Types.ObjectId; usedAt: Date }[];
  applicableRestaurants: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CouponDocument = mongoose.HydratedDocument<ICoupon>;

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    type: {
      type: String,
      enum: Object.values(CouponType),
      required: true,
    },
    value: {
      type: Number,
      required: [true, "Discount value is required"],
      min: 0,
    },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    usageLimit: { type: Number, default: 0 },
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    usedBy: {
      type: [
        {
          userId: { type: Schema.Types.ObjectId, ref: "User" },
          usedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
      _id: false,
    },
    applicableRestaurants: {
      type: [{ type: Schema.Types.ObjectId, ref: "Restaurant" }],
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

couponSchema.index({ isActive: 1, validTo: 1 });

const Coupon: Model<ICoupon> = mongoose.model<ICoupon>("Coupon", couponSchema);

export default Coupon;
