/**
 * Zod validation schemas for authentication endpoints.
 */
import { z } from 'zod';
import {
  BD_PHONE_ERROR_MESSAGE,
  isValidBdPhoneNumber,
  normalizeBdPhoneNumber,
} from '../utils/phone.util';

// ── Reusable field schemas ─────────────────────────────────────

const NAME_PATTERN = /^[a-zA-Z]+$/;

const AT_LEAST_ONE_LETTER = /[a-zA-Z]/;

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Must be at least 2 characters')
  .max(50, 'Cannot exceed 50 characters')
  .regex(NAME_PATTERN, 'Can only contain letters')
  .refine((v) => AT_LEAST_ONE_LETTER.test(v), {
    message: 'Must contain at least one letter',
  });

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
    'Password must contain at least one special character',
  );

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .email('Please enter a valid email address')
  .refine(
    (v) => {
      const [local, domain] = v.split('@');
      if (!local || !domain) return false;
      if (!/[a-zA-Z]/.test(local)) return false;
      const dotIdx = domain.lastIndexOf('.');
      if (dotIdx <= 0 || dotIdx >= domain.length - 1) return false;
      const tld = domain.slice(dotIdx + 1);
      if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;
      if (tld.length <= 2 && [...new Set(tld)].length === 1) return false;
      if (!/[a-zA-Z]/.test(domain)) return false;
      return true;
    },
    { message: 'Please enter a valid email address' },
  )
  .transform((v) => v.toLowerCase().trim());

const phoneSchema = z
  .string()
  .transform((v) => normalizeBdPhoneNumber(v))
  .refine((v) => isValidBdPhoneNumber(v), {
    message: BD_PHONE_ERROR_MESSAGE,
  });

// ── Auth schemas ───────────────────────────────────────────────

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phoneNumber: phoneSchema,
});

export const loginSchema = z.object({
  emailOrPhone: z
    .string()
    .min(1, 'Email or phone number is required')
    .transform((v) => v.trim())
    .refine(
      (v) => z.string().email().safeParse(v).success || isValidBdPhoneNumber(v),
      { message: 'Please enter a valid email or Bangladesh mobile number' },
    )
    .transform((v) =>
      v.includes('@') ? v.toLowerCase() : normalizeBdPhoneNumber(v),
    ),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const otpVerificationSchema = z.object({
  email: emailSchema,
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
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
