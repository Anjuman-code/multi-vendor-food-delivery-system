import { Request } from "express";
import { HydratedDocument } from "mongoose";

// ────────────────────────────────────────────────────────────────
// User
// ────────────────────────────────────────────────────────────────

/** Plain user data interface (matches Mongoose schema fields) */
export interface IUser {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  deliveryAddress?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  isActive: boolean;
  role: "customer" | "restaurant_owner" | "admin";
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Instance methods on User documents */
export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/** Hydrated User document type (Mongoose methods + instance methods) */
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

// ────────────────────────────────────────────────────────────────
// Restaurant
// ────────────────────────────────────────────────────────────────

/** Address sub-document */
export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/** Contact info sub-document */
export interface IContactInfo {
  phone: string;
  email: string;
  website?: string;
}

/** Images sub-document */
export interface IImages {
  logo: string;
  coverPhoto: string;
  gallery: string[];
}

/** Operating hours entry */
export interface IOperatingHours {
  day:
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

/** Rating sub-document */
export interface IRating {
  average: number;
  count: number;
}

/** Plain restaurant data interface (matches Mongoose schema fields) */
export interface IRestaurant {
  name: string;
  description: string;
  address: IAddress;
  contactInfo: IContactInfo;
  cuisineType: string[];
  images: IImages;
  operatingHours: IOperatingHours[];
  isActive: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  rating: IRating;
  deliveryTime: string;
  deliveryFee: number;
  minimumOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Hydrated Restaurant document type */
export type RestaurantDocument = HydratedDocument<IRestaurant>;

// ────────────────────────────────────────────────────────────────
// Name (simple model)
// ────────────────────────────────────────────────────────────────

export interface IName {
  name: string;
}

// ────────────────────────────────────────────────────────────────
// Express helpers
// ────────────────────────────────────────────────────────────────

/** Express Request extended with an authenticated user */
export interface AuthRequest extends Request {
  user?: UserDocument;
}

// ────────────────────────────────────────────────────────────────
// API helpers
// ────────────────────────────────────────────────────────────────

/** Standard API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: string[];
  count?: number;
}

/** JWT token payload */
export interface JwtTokenPayload {
  id: string;
  iat?: number;
  exp?: number;
}
