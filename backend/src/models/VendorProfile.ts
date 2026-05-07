/**
 * VendorProfile Mongoose model – placeholder for vendor-specific data.
 * Structure defined; full implementation deferred.
 */
import mongoose, { Model, Schema } from "mongoose";
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
    bankDetails: {
      bankName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      accountName: { type: String, trim: true },
      branchName: { type: String, trim: true },
      routingNumber: { type: String, trim: true },
      mobileMoneyNumber: { type: String, trim: true },
      mobileMoneyProvider: { type: String, trim: true },
    },
    commissionRate: { type: Number, default: 0 },
    commissionHistory: {
      type: [
        {
          rate: { type: Number, required: true },
          effectiveFrom: { type: Date, required: true, default: Date.now },
          setBy: { type: Schema.Types.ObjectId, ref: "User" },
          reason: { type: String, trim: true },
        },
      ],
      default: [],
      _id: false,
    },
    isVerified: { type: Boolean, default: false },
    verificationDocuments: [
      {
        type: { type: String, enum: ['nid', 'trade_license', 'tin', 'vat_certificate', 'other'] },
        url: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      },
    ],
    autoAcceptOrders: { type: Boolean, default: false },
    notificationSettings: {
      emailOnNewOrder: { type: Boolean, default: true },
      lowStockAlerts: { type: Boolean, default: false },
      reviewAlerts: { type: Boolean, default: true },
      promotionPerformance: { type: Boolean, default: false },
    },
    // Denormalized analytics for dashboard speed
    totalOrders: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 },
    averageRating: { type: Number, min: 0, max: 5, default: 0 },
  },
  { timestamps: true },
);

const VendorProfile: Model<IVendorProfileDocument> =
  mongoose.model<IVendorProfileDocument>("VendorProfile", vendorProfileSchema);

export default VendorProfile;
