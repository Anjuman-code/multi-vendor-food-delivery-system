/**
 * CustomerProfile Mongoose model – customer-specific data linked 1:1 to User.
 */
import mongoose, { Schema, Model } from "mongoose";
import { PaymentMethodType, CustomerTier } from "../config/constants";
import {
  ICustomerProfileDocument,
  IPaymentMethod,
  INotificationPreferences,
} from "../types/user.types";

// ── Sub-schemas ────────────────────────────────────────────────

const paymentMethodSchema = new Schema<IPaymentMethod>(
  {
    type: {
      type: String,
      enum: Object.values(PaymentMethodType),
      required: true,
    },
    provider: { type: String, required: true },
    token: { type: String, required: true },
    last4: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    expiryMonth: { type: Number },
    expiryYear: { type: Number },
  },
  { _id: true },
);

const notificationPrefSchema = new Schema<INotificationPreferences>(
  {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false },
  },
  { _id: false },
);

// ── Main schema ────────────────────────────────────────────────

const customerProfileSchema = new Schema<ICustomerProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Preferences
    dietaryPreferences: { type: [String], default: [] },
    favoriteRestaurants: {
      type: [{ type: Schema.Types.ObjectId, ref: "Restaurant" }],
      default: [],
    },

    // Payment
    paymentMethods: { type: [paymentMethodSchema], default: [] },

    // Loyalty
    loyaltyPoints: { type: Number, default: 0 },
    tier: {
      type: String,
      enum: Object.values(CustomerTier),
      default: CustomerTier.BRONZE,
    },

    // Statistics
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },

    // Notifications
    notifications: {
      type: notificationPrefSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
);

const CustomerProfile: Model<ICustomerProfileDocument> =
  mongoose.model<ICustomerProfileDocument>(
    "CustomerProfile",
    customerProfileSchema,
  );

export default CustomerProfile;
