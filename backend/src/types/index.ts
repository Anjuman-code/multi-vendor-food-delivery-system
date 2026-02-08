import { Request } from "express";
import { HydratedDocument } from "mongoose";

// ────────────────────────────────────────────────────────────────
// Re-export all user types from the dedicated module
// ────────────────────────────────────────────────────────────────
export * from "./user.types";

// ────────────────────────────────────────────────────────────────
// Restaurant
// ────────────────────────────────────────────────────────────────

/** Restaurant address sub-document */
export interface IRestaurantAddress {
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
  address: IRestaurantAddress;
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
  user?: import("./user.types").IUserDocument;
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

/** JWT token payload (legacy, prefer TokenPayload from user.types) */
export interface JwtTokenPayload {
  id: string;
  iat?: number;
  exp?: number;
}
