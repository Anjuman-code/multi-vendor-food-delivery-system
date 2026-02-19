import { z } from "zod";

// ── Login schema ───────────────────────────────────────────────
// Backend expects { emailOrPhone, password }
export const loginSchema = z.object({
  emailOrPhone: z.string().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
});

// ── Registration schema ────────────────────────────────────────
// Backend expects { firstName, lastName, email, phoneNumber, password }
export const registerSchema = z
  .object({
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
    email: z.string().email("Please enter a valid email address"),
    phoneNumber: z
      .string()
      .min(7, "Phone number is too short")
      .max(20, "Phone number is too long")
      .regex(/^\+?[\d\s\-()]+$/, "Please enter a valid phone number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must not exceed 128 characters")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    agreedToTerms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the terms and privacy policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ── Forgot password schema ─────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// ── Change password schema ─────────────────────────────────────
const passwordSchemaStrict = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
    "Must contain at least one special character",
  );

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchemaStrict,
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
  });

// ── Update profile schema ──────────────────────────────────────
export const updateProfileSchema = z.object({
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
  phoneNumber: z
    .string()
    .min(7, "Phone number is too short")
    .max(20, "Phone number is too long")
    .regex(/^\+?[\d\s\-()]+$/, "Please enter a valid phone number"),
  dateOfBirth: z.string().optional(),
});

// ── Add address schema ─────────────────────────────────────────
export const addAddressSchema = z.object({
  type: z.enum(["home", "work", "other"], {
    message: "Address type is required",
  }),
  street: z.string().min(1, "Street is required").trim(),
  apartment: z.string().trim().optional(),
  city: z.string().min(1, "City is required").trim(),
  state: z.string().min(1, "State is required").trim(),
  zipCode: z.string().min(1, "Zip code is required").trim(),
  country: z.string().min(1, "Country is required").trim(),
  latitude: z.coerce
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z.coerce
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  isDefault: z.boolean().default(false),
});

// ── Deactivate account schema ──────────────────────────────────
export const deactivateAccountSchema = z.object({
  password: z.string().min(1, "Password is required to deactivate account"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type AddAddressFormData = z.infer<typeof addAddressSchema>;
export type DeactivateAccountFormData = z.infer<typeof deactivateAccountSchema>;
