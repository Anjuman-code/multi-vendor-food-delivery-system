/**
 * DriverRating – individual delivery ratings submitted by customers.
 * Prevents duplicate ratings (one per order) and supports aggregate recalculation.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export interface IDriverRating {
  driverId: Types.ObjectId;
  customerId: Types.ObjectId;
  orderId: Types.ObjectId;
  rating: number; // 1–5
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DriverRatingDocument = mongoose.HydratedDocument<IDriverRating>;

const driverRatingSchema = new Schema<IDriverRating>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true, // one rating per order
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);

driverRatingSchema.index({ driverId: 1, createdAt: -1 });

const DriverRating: Model<IDriverRating> = mongoose.model<IDriverRating>(
  "DriverRating",
  driverRatingSchema,
);

export default DriverRating;
