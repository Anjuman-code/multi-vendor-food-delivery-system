/**
 * DriverProfile Mongoose model – full driver profile with application lifecycle,
 * documents, earnings, and rating tracking.
 */
import mongoose, { Model, Schema } from 'mongoose';
import { VehicleType } from '../config/constants';
import { IDriverProfileDocument } from '../types/user.types';
import {
  BD_PHONE_ERROR_MESSAGE,
  normalizeBdPhoneNumber,
} from '../utils/phone.util';

const driverProfileSchema = new Schema<IDriverProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // ── Application lifecycle ──────────────────────────────────
    applicationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },

    // ── Vehicle & license ──────────────────────────────────────
    licenseNumber: { type: String, required: true },
    vehicleType: {
      type: String,
      enum: Object.values(VehicleType),
      required: true,
    },
    vehicleNumber: { type: String, required: true },

    // ── Documents ──────────────────────────────────────────────
    documents: {
      licensePhoto: { type: String },
      vehicleRegistrationPhoto: { type: String },
      insurancePhoto: { type: String },
    },

    // ── Availability & location ────────────────────────────────
    isAvailable: { type: Boolean, default: false },
    currentLocation: {
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
    },

    // ── Performance ────────────────────────────────────────────
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    totalDeliveries: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },

    // ── Bank / payout details ──────────────────────────────────
    bankDetails: {
      bankName: { type: String },
      accountNumber: { type: String },
      accountHolderName: { type: String },
      mobileMoneyNumber: {
        type: String,
        match: [/^\+8801[3-9]\d{8}$/, BD_PHONE_ERROR_MESSAGE],
      },
      mobileMoneyProvider: { type: String },
    },

    // ── Onboarding ─────────────────────────────────────────────
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

driverProfileSchema.pre('validate', function () {
  if (this.bankDetails?.mobileMoneyNumber) {
    this.bankDetails.mobileMoneyNumber = normalizeBdPhoneNumber(
      this.bankDetails.mobileMoneyNumber,
    );
  }
});

const DriverProfile: Model<IDriverProfileDocument> =
  mongoose.model<IDriverProfileDocument>('DriverProfile', driverProfileSchema);

export default DriverProfile;
