/**
 * RouteCache — persistent TTL cache for road routing queries.
 * Coordinates are rounded to 5 decimal places (~1.1m precision).
 */
import mongoose, { Model, Schema } from "mongoose";

export interface IRouteCache {
  originKey: string; // "lat,lng" rounded to 5 decimals
  destinationKey: string; // "lat,lng" rounded to 5 decimals
  distanceMeters: number;
  durationSeconds: number;
  routeProvider: string; // "osrm" | "haversine_fallback"
  isEstimate: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export type RouteCacheDocument = mongoose.HydratedDocument<IRouteCache>;

const routeCacheSchema = new Schema<IRouteCache>(
  {
    originKey: {
      type: String,
      required: true,
      index: true,
    },
    destinationKey: {
      type: String,
      required: true,
      index: true,
    },
    distanceMeters: {
      type: Number,
      required: true,
      min: 0,
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: 0,
    },
    routeProvider: {
      type: String,
      required: true,
    },
    isEstimate: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index on expiresAt
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

routeCacheSchema.index({ originKey: 1, destinationKey: 1 }, { unique: true });

const RouteCache: Model<IRouteCache> = mongoose.model<IRouteCache>(
  "RouteCache",
  routeCacheSchema,
);

export default RouteCache;
