/**
 * DeliveryCampaign — admin-created free delivery promotions.
 *
 * Rules:
 * - Free delivery is evaluated per sub-order on that restaurant's items subtotal.
 * - Out of all matching active campaigns, the best one applies (largest waiver).
 * - No stacking.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export interface IDeliveryCampaign {
  name: string;
  label: string;
  description?: string;
  minSubtotal: number;
  restaurantIds: Types.ObjectId[];
  maxDistanceKm?: number;
  maxWaivedAmount?: number;
  startsAt?: Date;
  endsAt?: Date;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type DeliveryCampaignDocument = mongoose.HydratedDocument<IDeliveryCampaign>;

const deliveryCampaignSchema = new Schema<IDeliveryCampaign>(
  {
    name: {
      type: String,
      required: [true, "Campaign name is required"],
      trim: true,
      maxlength: [100, "Campaign name cannot exceed 100 characters"],
    },
    label: {
      type: String,
      required: [true, "Customer-facing label is required"],
      trim: true,
      maxlength: [120, "Label cannot exceed 120 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    minSubtotal: {
      type: Number,
      required: [true, "Minimum subtotal is required"],
      min: [1, "Minimum subtotal must be greater than 0"],
    },
    restaurantIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Restaurant" }],
      default: [],
    },
    maxDistanceKm: {
      type: Number,
      min: [0.1, "Max distance must be at least 0.1 km"],
    },
    maxWaivedAmount: {
      type: Number,
      min: [1, "Max waived amount must be at least ৳1"],
    },
    startsAt: {
      type: Date,
    },
    endsAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

deliveryCampaignSchema.index({ isActive: 1, isDeleted: 1, minSubtotal: 1 });
deliveryCampaignSchema.index({ restaurantIds: 1 });

const DeliveryCampaign: Model<IDeliveryCampaign> = mongoose.model<IDeliveryCampaign>(
  "DeliveryCampaign",
  deliveryCampaignSchema,
);

export default DeliveryCampaign;
