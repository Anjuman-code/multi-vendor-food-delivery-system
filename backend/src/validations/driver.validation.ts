/**
 * Zod validation schemas for driver/rider endpoints.
 */
import { z } from "zod";
import { VehicleType } from "../config/constants";

const phoneSchema = z
  .string()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^\+?[\d\s\-()]+$/, "Please enter a valid phone number");

const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .transform((v) => v.toLowerCase().trim());

// ── Driver Registration ────────────────────────────────────────

export const driverRegisterSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
      "Password must contain at least one special character",
    ),
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name cannot exceed 50 characters")
    .trim(),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name cannot exceed 50 characters")
    .trim(),
  phoneNumber: phoneSchema,
  licenseNumber: z
    .string()
    .min(3, "License number must be at least 3 characters")
    .max(50, "License number cannot exceed 50 characters")
    .trim(),
  vehicleType: z.enum(Object.values(VehicleType) as [string, ...string[]]),
  vehicleNumber: z
    .string()
    .min(2, "Vehicle registration number is required")
    .max(30, "Vehicle number cannot exceed 30 characters")
    .trim(),
  // Document URLs — set after file upload in a separate step
  licensePhoto: z.string().optional(),
  vehicleRegistrationPhoto: z.string().optional(),
  insurancePhoto: z.string().optional(),
});

export type DriverRegisterInput = z.infer<typeof driverRegisterSchema>;

// ── Update bank details ────────────────────────────────────────

export const updateBankDetailsSchema = z.object({
  bankName: z.string().max(100).optional(),
  accountNumber: z.string().max(50).optional(),
  accountHolderName: z.string().max(100).optional(),
  mobileMoneyNumber: phoneSchema.optional(),
  mobileMoneyProvider: z.string().max(50).optional(),
});

export type UpdateBankDetailsInput = z.infer<typeof updateBankDetailsSchema>;

// ── Rate driver ────────────────────────────────────────────────

export const rateDriverSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(300).optional(),
});

export type RateDriverInput = z.infer<typeof rateDriverSchema>;
