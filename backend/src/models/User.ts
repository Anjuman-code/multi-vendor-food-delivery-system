/**
 * User Mongoose model – comprehensive schema for all user roles.
 *
 * Supports: customer, vendor, driver, admin, support.
 * Includes instance methods, static methods, pre-save hooks, and indexes.
 */
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { UserRole, AddressType, AUTH } from "../config/constants";
import {
  IUserDocument,
  IUserModel,
  IAddress,
  ICoordinates,
} from "../types/user.types";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.util";
import {
  generateVerificationToken,
  generateResetToken,
  generateOTP,
  hashToken,
} from "../utils/token.util";

// ── Sub-schemas ────────────────────────────────────────────────

const coordinatesSchema = new Schema<ICoordinates>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false },
);

const addressSchema = new Schema<IAddress>({
  type: {
    type: String,
    enum: Object.values(AddressType),
    required: true,
  },
  street: { type: String, required: true, trim: true },
  apartment: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  zipCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  coordinates: { type: coordinatesSchema, required: true },
  isDefault: { type: Boolean, default: false },
});

// ── Main User schema ───────────────────────────────────────────

const userSchema = new Schema<IUserDocument, IUserModel>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      default: UserRole.CUSTOMER,
    },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Profile
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      match: [/^\+?[\d\s\-()]+$/, "Please enter a valid phone number"],
    },
    isPhoneVerified: { type: Boolean, default: false },
    profileImage: { type: String },
    coverImage: { type: String },
    coverImagePosition: { type: Number, default: 50, min: 0, max: 100 },
    dateOfBirth: { type: Date },

    // Addresses
    addresses: { type: [addressSchema], default: [] },

    // Security
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    emailVerificationOTP: { type: String },
    emailVerificationOTPExpires: { type: Date },
    refreshToken: { type: [String], default: [], select: false },
    lastLogin: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    accountLockedUntil: { type: Date },

    // Soft delete
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ────────────────────────────────────────────────────

userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
// phoneNumber already has an index via `unique: true` on the field definition
userSchema.index({ emailVerificationToken: 1 }, { sparse: true });
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

// ── Pre-save hooks ─────────────────────────────────────────────

userSchema.pre("save", async function () {
  // Hash password if modified
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(AUTH.BCRYPT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Normalize email
  if (this.isModified("email")) {
    this.email = this.email.toLowerCase().trim();
  }

  // Normalize phone
  if (this.isModified("phoneNumber")) {
    this.phoneNumber = this.phoneNumber.trim();
  }
});

// ── Instance methods ───────────────────────────────────────────

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function (): {
  accessToken: string;
  refreshToken: string;
} {
  const userId = String(this._id);
  const accessToken = generateAccessToken(userId, this.role);
  const refreshToken = generateRefreshToken(userId);
  return { accessToken, refreshToken };
};

userSchema.methods.generateEmailVerificationToken = function (): {
  token: string;
  otp: string;
} {
  const token = generateVerificationToken();
  const otp = generateOTP();
  this.emailVerificationToken = hashToken(token);
  this.emailVerificationExpires = new Date(
    Date.now() + AUTH.EMAIL_VERIFICATION_EXPIRY_HR * 60 * 60 * 1000,
  );
  this.emailVerificationOTP = hashToken(otp);
  this.emailVerificationOTPExpires = new Date(
    Date.now() + AUTH.EMAIL_VERIFICATION_EXPIRY_HR * 60 * 60 * 1000,
  );
  return { token, otp };
};

userSchema.methods.generatePasswordResetToken = function (): string {
  const token = generateResetToken();
  this.passwordResetToken = hashToken(token);
  this.passwordResetExpires = new Date(
    Date.now() + AUTH.PASSWORD_RESET_EXPIRY_MIN * 60 * 1000,
  );
  return token;
};

userSchema.methods.incrementFailedLoginAttempts =
  async function (): Promise<void> {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= AUTH.MAX_LOGIN_ATTEMPTS) {
      this.accountLockedUntil = new Date(
        Date.now() + AUTH.ACCOUNT_LOCK_DURATION_MIN * 60 * 1000,
      );
    }
    await this.save({ validateBeforeSave: false });
  };

userSchema.methods.resetFailedLoginAttempts = async function (): Promise<void> {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = undefined;
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.isAccountLocked = function (): boolean {
  if (!this.accountLockedUntil) return false;
  return new Date() < this.accountLockedUntil;
};

// ── Static methods ─────────────────────────────────────────────

userSchema.statics.findByEmail = function (
  email: string,
): Promise<IUserDocument | null> {
  return this.findOne({ email: email.toLowerCase().trim() });
};

userSchema.statics.findByPhone = function (
  phoneNumber: string,
): Promise<IUserDocument | null> {
  return this.findOne({ phoneNumber: phoneNumber.trim() });
};

userSchema.statics.findActiveUsers = function (
  role?: UserRole,
): Promise<IUserDocument[]> {
  const query: Record<string, unknown> = { isActive: true, deletedAt: null };
  if (role) query.role = role;
  return this.find(query);
};

// ── Export ──────────────────────────────────────────────────────

const User = mongoose.model<IUserDocument, IUserModel>("User", userSchema);

export default User;
