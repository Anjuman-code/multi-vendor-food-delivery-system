/**
 * VendorProfile Mongoose model – placeholder for vendor-specific data.
 * Structure defined; full implementation deferred.
 */
import mongoose, { Schema, Model } from "mongoose";
import { IVendorProfileDocument } from "../types/user.types";

const vendorProfileSchema = new Schema<IVendorProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    restaurantIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Restaurant" }],
      default: [],
    },
    businessName: { type: String, required: true, trim: true },
    businessLicense: { type: String, required: true },
    taxId: { type: String, required: true },
    bankDetails: { type: Schema.Types.Mixed, default: {} },
    commissionRate: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    verificationDocuments: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true },
);

const VendorProfile: Model<IVendorProfileDocument> =
  mongoose.model<IVendorProfileDocument>("VendorProfile", vendorProfileSchema);

export default VendorProfile;
