/**
 * Review Mongoose model – customer reviews on restaurants.
 */
import mongoose, { Schema, Model, Types } from "mongoose";

export interface IReview {
  customerId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  orderId?: Types.ObjectId;
  reservationId?: Types.ObjectId;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  helpfulVotes: number;
  unhelpfulVotes: number;
  reply?: {
    text: string;
    repliedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = mongoose.HydratedDocument<IReview>;

const reviewSchema = new Schema<IReview>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      index: true,
      sparse: true,
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: "Reservation",
      index: true,
      sparse: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    title: { type: String, trim: true, maxlength: 100 },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
      maxlength: 1000,
    },
    images: { type: [String], default: [] },
    helpfulVotes: { type: Number, default: 0 },
    unhelpfulVotes: { type: Number, default: 0 },
    reply: {
      text: { type: String },
      repliedAt: { type: Date },
    },
  },
  { timestamps: true },
);

// One review per order or per reservation
reviewSchema.index({ customerId: 1, orderId: 1 }, { unique: true, sparse: true });
reviewSchema.index({ customerId: 1, reservationId: 1 }, { unique: true, sparse: true });
reviewSchema.index({ restaurantId: 1, createdAt: -1 });

const Review: Model<IReview> = mongoose.model<IReview>("Review", reviewSchema);

export default Review;
