/**
 * Zod validation schemas for authentication endpoints.
 */
import { z } from "zod";

// ── Reusable field schemas ─────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
    "Password must contain at least one special character",
  );

const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .transform((v) => v.toLowerCase().trim());

const phoneSchema = z
  .string()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^\+?[\d\s\-()]+$/, "Please enter a valid phone number");

// ── Auth schemas ───────────────────────────────────────────────

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
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
});

export const loginSchema = z.object({
  emailOrPhone: z.string().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export const emailVerificationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const otpVerificationSchema = z.object({
  email: emailSchema,
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

// ── Inferred types ─────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>;
export type OTPVerificationInput = z.infer<typeof otpVerificationSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
