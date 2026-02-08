/**
 * Application-wide constants, enumerations, and configuration values.
 */

// ── User Roles ─────────────────────────────────────────────────
export enum UserRole {
  CUSTOMER = "customer",
  VENDOR = "vendor",
  DRIVER = "driver",
  ADMIN = "admin",
  SUPPORT = "support",
}

// ── Address Types ──────────────────────────────────────────────
export enum AddressType {
  HOME = "home",
  WORK = "work",
  OTHER = "other",
}

// ── Payment Method Types ───────────────────────────────────────
export enum PaymentMethodType {
  CARD = "card",
  UPI = "upi",
  WALLET = "wallet",
}

// ── Customer Tiers ─────────────────────────────────────────────
export enum CustomerTier {
  BRONZE = "bronze",
  SILVER = "silver",
  GOLD = "gold",
  PLATINUM = "platinum",
}

// ── Vehicle Types (Driver) ─────────────────────────────────────
export enum VehicleType {
  BICYCLE = "bicycle",
  MOTORCYCLE = "motorcycle",
  CAR = "car",
  VAN = "van",
}

// ── Auth Constants ─────────────────────────────────────────────
export const AUTH = {
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5", 10),
  ACCOUNT_LOCK_DURATION_MIN: parseInt(
    process.env.ACCOUNT_LOCK_DURATION || "15",
    10,
  ),
  ACCESS_TOKEN_EXPIRY: process.env.JWT_ACCESS_EXPIRY || "15m",
  REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_EXPIRY || "7d",
  PASSWORD_RESET_EXPIRY_MIN: parseInt(
    process.env.PASSWORD_RESET_EXPIRY || "15",
    10,
  ),
  EMAIL_VERIFICATION_EXPIRY_HR: parseInt(
    process.env.EMAIL_VERIFICATION_EXPIRY || "24",
    10,
  ),
} as const;

// ── Rate Limit Constants ───────────────────────────────────────
export const RATE_LIMITS = {
  LOGIN: { windowMs: 15 * 60 * 1000, max: 5 },
  REGISTER: { windowMs: 60 * 60 * 1000, max: 3 },
  PASSWORD_RESET: { windowMs: 60 * 60 * 1000, max: 3 },
  GENERAL_API: { windowMs: 15 * 60 * 1000, max: 100 },
} as const;
