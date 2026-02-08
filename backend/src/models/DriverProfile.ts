/**
 * DriverProfile Mongoose model – placeholder for driver-specific data.
 * Structure defined; full implementation deferred.
 */
import mongoose, { Schema, Model } from "mongoose";
import { VehicleType } from "../config/constants";
import { IDriverProfileDocument } from "../types/user.types";

const driverProfileSchema = new Schema<IDriverProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    licenseNumber: { type: String, required: true },
    vehicleType: {
      type: String,
      enum: Object.values(VehicleType),
      required: true,
    },
    vehicleNumber: { type: String, required: true },
    isAvailable: { type: Boolean, default: false },
    currentLocation: {
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
    },
    rating: { type: Number, default: 0 },
    completedDeliveries: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const DriverProfile: Model<IDriverProfileDocument> =
  mongoose.model<IDriverProfileDocument>("DriverProfile", driverProfileSchema);

export default DriverProfile;
