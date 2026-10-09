/**
 * GeocodeCache — persistent TTL cache for forward and reverse geocoding results
 * to comply strictly with Nominatim's Acceptable Use Policy.
 */
import mongoose, { Model, Schema } from "mongoose";

export interface IGeocodeCache {
  cacheKey: string; // e.g. "reverse:24.89650,91.87680" or "search:zinda bazar sylhet"
  queryType: "search" | "reverse";
  data: Record<string, unknown> | Array<Record<string, unknown>>;
  isNegative: boolean; // true if no results were found (cached briefly, e.g. 1 hour)
  expiresAt: Date;
  createdAt: Date;
}

export type GeocodeCacheDocument = mongoose.HydratedDocument<IGeocodeCache>;

const geocodeCacheSchema = new Schema<IGeocodeCache>(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    queryType: {
      type: String,
      enum: ["search", "reverse"],
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    isNegative: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const GeocodeCache: Model<IGeocodeCache> = mongoose.model<IGeocodeCache>(
  "GeocodeCache",
  geocodeCacheSchema,
);

export default GeocodeCache;
