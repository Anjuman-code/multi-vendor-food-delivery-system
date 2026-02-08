/**
 * Zod validation schemas for user management endpoints.
 */
import { z } from "zod";
import { AddressType } from "../config/constants";

// ── Profile update ─────────────────────────────────────────────

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name cannot exceed 50 characters")
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name cannot exceed 50 characters")
    .trim()
    .optional(),
  phoneNumber: z
    .string()
    .min(7, "Phone number is too short")
    .max(20, "Phone number is too long")
    .regex(/^\+?[\d\s\-()]+$/, "Please enter a valid phone number")
    .optional(),
  profileImage: z.string().url("Profile image must be a valid URL").optional(),
  dateOfBirth: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
});

// ── Address schemas ────────────────────────────────────────────

const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const addAddressSchema = z.object({
  type: z.nativeEnum(AddressType),
  street: z.string().min(1, "Street is required").trim(),
  apartment: z.string().trim().optional(),
  city: z.string().min(1, "City is required").trim(),
  state: z.string().min(1, "State is required").trim(),
  zipCode: z.string().min(1, "Zip code is required").trim(),
  country: z.string().min(1, "Country is required").trim(),
  coordinates: coordinatesSchema,
  isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = addAddressSchema.partial();

// ── Preferences ────────────────────────────────────────────────

export const updatePreferencesSchema = z.object({
  dietaryPreferences: z.array(z.string()).optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      push: z.boolean().optional(),
      orderUpdates: z.boolean().optional(),
      promotions: z.boolean().optional(),
    })
    .optional(),
});

// ── Inferred types ─────────────────────────────────────────────

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddAddressInput = z.infer<typeof addAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
