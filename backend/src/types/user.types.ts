/**
 * User-related TypeScript type definitions for the multivendor food delivery system.
 */
import { Document, Model, Types } from 'mongoose';
import {
    AddressType,
    AdminTier,
    CustomerTier,
    PaymentMethodType,
    UserRole,
} from '../config/constants';

// ────────────────────────────────────────────────────────────────
// Address
// ────────────────────────────────────────────────────────────────

export interface ICoordinates {
  latitude: number;
  longitude: number;
}

export interface IAddress {
  _id?: Types.ObjectId;
  type: AddressType;
  street: string;
  apartment?: string;
  area: string;
  district: string;
  coordinates: ICoordinates;
  isDefault: boolean;
}

// ────────────────────────────────────────────────────────────────
// User
// ────────────────────────────────────────────────────────────────

export interface IUser {
  email: string;
  password?: string;
  googleId?: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;

  // Admin sub-tier
  adminTier?: AdminTier | null;

  // Suspension / ban
  isSuspended: boolean;
  suspendedReason?: string;
  suspendedUntil?: Date | null;
  suspendedBy?: Types.ObjectId;
  isBanned: boolean;
  bannedReason?: string;
  bannedAt?: Date;
  bannedBy?: Types.ObjectId;

  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isPhoneVerified: boolean;
  profileImage?: string;
  coverImage?: string;
  coverImagePosition?: number;
  dateOfBirth?: Date;
  onboardingCompleted?: boolean;

  addresses: IAddress[];

  // Security
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  emailVerificationOTP?: string;
  emailVerificationOTPExpires?: Date;
  refreshToken: string[];
  lastLogin?: Date;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/** Instance methods on User documents */
export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): { accessToken: string; refreshToken: string };
  generateEmailVerificationToken(): { token: string; otp: string };
  generatePasswordResetToken(): string;
  incrementFailedLoginAttempts(): Promise<void>;
  resetFailedLoginAttempts(): Promise<void>;
  isAccountLocked(): boolean;
}

/** Hydrated User document type (includes Mongoose Document + instance methods) */
export interface IUserDocument
  extends Omit<Document, '_id'>, IUser, IUserMethods {
  _id: Types.ObjectId;
}

/** Static methods on the User model */
export interface IUserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
  findByPhone(phoneNumber: string): Promise<IUserDocument | null>;
  findActiveUsers(role?: UserRole): Promise<IUserDocument[]>;
}

// ────────────────────────────────────────────────────────────────
// Customer Profile
// ────────────────────────────────────────────────────────────────

export interface IPaymentMethod {
  _id?: Types.ObjectId;
  type: PaymentMethodType;
  provider: string;
  token: string;
  last4: string;
  isDefault: boolean;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface INotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  orderUpdates: boolean;
  promotions: boolean;
}

export interface ICustomerProfile {
  userId: Types.ObjectId;
  dietaryPreferences: string[];
  favoriteRestaurants: Types.ObjectId[];
  paymentMethods: IPaymentMethod[];
  loyaltyPoints: number;
  tier: CustomerTier;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  referredBy?: Types.ObjectId;
  notifications: INotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerProfileDocument
  extends Omit<Document, '_id'>, ICustomerProfile {
  _id: Types.ObjectId;
}

// ────────────────────────────────────────────────────────────────
// Vendor Profile (placeholder)
// ────────────────────────────────────────────────────────────────

export interface IVendorNotificationSettings {
  emailOnNewOrder: boolean;
  lowStockAlerts: boolean;
  reviewAlerts: boolean;
  promotionPerformance: boolean;
}

export interface ICommissionRateEntry {
  rate: number;
  effectiveFrom: Date;
  setBy: Types.ObjectId;
  reason?: string;
}

export interface IVendorBankDetails {
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  branchName?: string;
  routingNumber?: string;
  mobileMoneyNumber?: string;  // bKash, Nagad, Rocket
  mobileMoneyProvider?: string;
}

export interface IVendorVerificationDocument {
  type: 'nid' | 'trade_license' | 'tin' | 'vat_certificate' | 'other';
  url: string;
  uploadedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

export interface IVendorProfile {
  userId: Types.ObjectId;
  restaurantIds: Types.ObjectId[];
  businessName: string;
  businessLicense: string;
  taxId: string;
  bankDetails: IVendorBankDetails;
  commissionRate: number;
  commissionHistory: ICommissionRateEntry[];
  isVerified: boolean;
  verificationDocuments: IVendorVerificationDocument[];
  autoAcceptOrders: boolean;
  notificationSettings: IVendorNotificationSettings;
  // Analytics (denormalized for dashboard speed)
  totalOrders: number;
  totalEarnings: number;
  pendingPayout: number;
  averageRating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVendorProfileDocument
  extends Omit<Document, '_id'>, IVendorProfile {
  _id: Types.ObjectId;
}

// ────────────────────────────────────────────────────────────────
// Driver Profile (placeholder)
// ────────────────────────────────────────────────────────────────

export interface IDriverProfile {
  userId: Types.ObjectId;
  licenseNumber: string;
  vehicleType: string;
  vehicleNumber: string;
  isAvailable: boolean;
  currentLocation: ICoordinates;
  rating: number;
  completedDeliveries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDriverProfileDocument
  extends Omit<Document, '_id'>, IDriverProfile {
  _id: Types.ObjectId;
}

// ────────────────────────────────────────────────────────────────
// Auth / Token helpers
// ────────────────────────────────────────────────────────────────

export interface TokenPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}
