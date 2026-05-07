/**
 * DeliveryZone — defines where a restaurant delivers and at what cost.
 * Supports radius, polygon, and district-based zones with tiered fees.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export type ZoneType = "radius" | "polygon" | "district";

export interface IFeeTier {
  maxDistanceKm: number;
  fee: number;
  minOrderForFree?: number;
}

export interface IDeliveryZone {
  restaurantId: Types.ObjectId;
  type: ZoneType;
  center?: {
    type: "Point";
    coordinates: [number, number];
  };
  radiusKm?: number;
  polygon?: {
    type: "Polygon";
    coordinates: [number, number][][];
  };
  districts?: string[];
  feeTiers: IFeeTier[];
  isActive: boolean;
  minimumOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type DeliveryZoneDocument = mongoose.HydratedDocument<IDeliveryZone>;

const feeTierSchema = new Schema<IFeeTier>(
  {
    maxDistanceKm: { type: Number, required: true, min: 0 },
    fee: { type: Number, required: true, min: 0 },
    minOrderForFree: { type: Number, min: 0 },
  },
  { _id: false },
);

const deliveryZoneSchema = new Schema<IDeliveryZone>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["radius", "polygon", "district"],
      required: true,
    },
    center: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] },
    },
    radiusKm: { type: Number, min: 0 },
    polygon: {
      type: { type: String, enum: ["Polygon"] },
      coordinates: { type: [[[Number]]] },
    },
    districts: { type: [String], default: [] },
    feeTiers: { type: [feeTierSchema], default: [] },
    isActive: { type: Boolean, default: true },
    minimumOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

deliveryZoneSchema.index({ restaurantId: 1 }, { unique: true });

const DeliveryZone: Model<IDeliveryZone> = mongoose.model<IDeliveryZone>(
  "DeliveryZone",
  deliveryZoneSchema,
);

export default DeliveryZone;
