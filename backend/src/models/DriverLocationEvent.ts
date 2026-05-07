/**
 * DriverLocationEvent — time-series collection for driver location pings
 * during active deliveries. Supports real-time tracking and route replay.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export interface IDriverLocationEvent {
  driverId: Types.ObjectId;
  orderId: Types.ObjectId;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  heading?: number;
  speed?: number;
  accuracy?: number;
  batteryLevel?: number;
  timestamp: Date;
}

export type DriverLocationEventDocument =
  mongoose.HydratedDocument<IDriverLocationEvent>;

const driverLocationEventSchema = new Schema<IDriverLocationEvent>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    heading: { type: Number },
    speed: { type: Number },
    accuracy: { type: Number },
    batteryLevel: { type: Number, min: 0, max: 100 },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    timeseries: {
      timeField: "timestamp",
      metaField: "driverId",
      granularity: "seconds",
    },
  },
);

driverLocationEventSchema.index({ location: "2dsphere" });
driverLocationEventSchema.index({ orderId: 1, timestamp: -1 });

const DriverLocationEvent: Model<IDriverLocationEvent> =
  mongoose.model<IDriverLocationEvent>(
    "DriverLocationEvent",
    driverLocationEventSchema,
  );

export default DriverLocationEvent;
