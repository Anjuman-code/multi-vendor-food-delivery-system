/**
 * DeliverySettings — singleton document for platform-level delivery fee
 * configuration, routing parameters, and service area constraints.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export interface IServiceAreaPolygon {
  type: "Polygon";
  coordinates: number[][][]; // GeoJSON [[[lng, lat], ...]]
}

export interface IDeliverySettings {
  minFee: number;
  includedKm: number;
  includedDistanceFee: number;
  perKmRate: number;
  maxFee?: number;
  maxDeliveryDistanceKm: number;
  detourFactor: number;
  serviceArea: IServiceAreaPolygon;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeliverySettingsModel extends Model<IDeliverySettings> {
  getSettings(): Promise<mongoose.HydratedDocument<IDeliverySettings>>;
}

// Bounding box covering all of Bangladesh (approx 20.5°N - 26.7°N, 88.0°E - 92.7°E)
export const BANGLADESH_BOUNDING_BOX: IServiceAreaPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [88.0, 20.5],
      [92.7, 20.5],
      [92.7, 26.7],
      [88.0, 26.7],
      [88.0, 20.5],
    ],
  ],
};

export const DEFAULT_DELIVERY_SETTINGS = {
  minFee: 10,
  includedKm: 1.0,
  includedDistanceFee: 10,
  perKmRate: 10,
  maxFee: undefined,
  maxDeliveryDistanceKm: 15.0,
  detourFactor: 1.3,
  serviceArea: BANGLADESH_BOUNDING_BOX,
};

const serviceAreaSchema = new Schema<IServiceAreaPolygon>(
  {
    type: { type: String, enum: ["Polygon"], default: "Polygon" },
    coordinates: {
      type: [[[Number]]],
      required: true,
      default: BANGLADESH_BOUNDING_BOX.coordinates,
    },
  },
  { _id: false },
);

const deliverySettingsSchema = new Schema<IDeliverySettings, IDeliverySettingsModel>(
  {
    minFee: {
      type: Number,
      required: true,
      default: 10,
      min: [10, "Minimum delivery fee cannot be less than ৳10"],
    },
    includedKm: {
      type: Number,
      required: true,
      default: 1.0,
      min: [0, "Included km cannot be negative"],
    },
    includedDistanceFee: {
      type: Number,
      required: true,
      default: 10,
      min: [0, "Included distance fee cannot be negative"],
    },
    perKmRate: {
      type: Number,
      required: true,
      default: 10,
      min: [0, "Per km rate cannot be negative"],
    },
    maxFee: {
      type: Number,
      min: [10, "Max fee must be at least ৳10 if specified"],
    },
    maxDeliveryDistanceKm: {
      type: Number,
      required: true,
      default: 15.0,
      min: [1, "Max delivery distance must be at least 1 km"],
    },
    detourFactor: {
      type: Number,
      required: true,
      default: 1.3,
      min: [1.0, "Detour factor must be at least 1.0"],
      max: [3.0, "Detour factor cannot exceed 3.0"],
    },
    serviceArea: {
      type: serviceAreaSchema,
      required: true,
      default: () => ({ ...BANGLADESH_BOUNDING_BOX }),
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

deliverySettingsSchema.statics.getSettings = async function (): Promise<
  mongoose.HydratedDocument<IDeliverySettings>
> {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(DEFAULT_DELIVERY_SETTINGS);
  }
  return settings;
};

const DeliverySettings = mongoose.model<IDeliverySettings, IDeliverySettingsModel>(
  "DeliverySettings",
  deliverySettingsSchema,
);

export default DeliverySettings;
