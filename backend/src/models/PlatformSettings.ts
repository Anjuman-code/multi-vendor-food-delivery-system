/**
 * PlatformSettings — singleton document for admin-controlled platform configuration.
 */
import mongoose, { Model, Schema, Types } from 'mongoose';

export interface IPlatformSettings {
  platformName: string;
  logoUrl?: string;
  faviconUrl?: string;
  contactEmail: string;
  defaultCommissionRate: number;
  defaultDeliveryFee: number;
  minimumOrderValue: number;
  maxDeliveryRadiusKm: number;
  currency: string;
  locale: string;

  // Payout
  payoutSchedule: 'weekly' | 'biweekly' | 'monthly';
  minimumPayoutThreshold: number;

  // Features
  featureFlags: {
    scheduledOrders: boolean;
    referralProgram: boolean;
    loyaltyTiers: boolean;
    campaignAutoApply: boolean;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    maintenanceWhitelistIPs: string[];
  };

  // Notification / email config status (references, not secrets)
  smtpConfigured: boolean;
  pushConfigured: boolean;

  // Audit
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
}

const platformSettingsSchema = new Schema<IPlatformSettings>(
  {
    platformName: { type: String, default: 'Food Rush', trim: true },
    logoUrl: { type: String },
    faviconUrl: { type: String },
    contactEmail: { type: String, default: 'admin@foodrush.app' },
    defaultCommissionRate: { type: Number, default: 15, min: 0, max: 100 },
    defaultDeliveryFee: { type: Number, default: 50, min: 0 },
    minimumOrderValue: { type: Number, default: 100, min: 0 },
    maxDeliveryRadiusKm: { type: Number, default: 20, min: 1 },
    currency: { type: String, default: 'BDT' },
    locale: { type: String, default: 'en-BD' },

    payoutSchedule: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly'],
      default: 'weekly',
    },
    minimumPayoutThreshold: { type: Number, default: 500 },

    featureFlags: {
      scheduledOrders: { type: Boolean, default: false },
      referralProgram: { type: Boolean, default: true },
      loyaltyTiers: { type: Boolean, default: true },
      campaignAutoApply: { type: Boolean, default: true },
      maintenanceMode: { type: Boolean, default: false },
      maintenanceMessage: {
        type: String,
        default: 'We are performing maintenance. Please check back soon.',
      },
      maintenanceWhitelistIPs: [{ type: String }],
    },

    smtpConfigured: { type: Boolean, default: false },
    pushConfigured: { type: Boolean, default: false },

    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

const PlatformSettings: Model<IPlatformSettings> =
  mongoose.model<IPlatformSettings>('PlatformSettings', platformSettingsSchema);

export default PlatformSettings;
