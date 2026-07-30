/**
 * Zod validation schemas for driver/rider endpoints.
 */
import { z } from 'zod';
import { VehicleType } from '../config/constants';
import {
  BD_PHONE_ERROR_MESSAGE,
  isValidBdPhoneNumber,
  normalizeBdPhoneNumber,
} from '../utils/phone.util';

const phoneSchema = z
  .string()
  .transform((v) => normalizeBdPhoneNumber(v))
  .refine((v) => isValidBdPhoneNumber(v), {
    message: BD_PHONE_ERROR_MESSAGE,
  });

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

// ── Driver Registration ────────────────────────────────────────

export const driverRegisterSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
      'Password must contain at least one special character',
    ),
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[a-zA-Z]+$/, 'Name Can only contain letters')
    .refine((v) => /[a-zA-Z]/.test(v), {
      message: 'Must contain at least one letter',
    }),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[a-zA-Z]+$/, 'Name Can only contain letters')
    .refine((v) => /[a-zA-Z]/.test(v), {
      message: 'Must contain at least one letter',
    }),
  phoneNumber: phoneSchema,
  licenseNumber: z
    .string()
    .min(3, 'License number must be at least 3 characters')
    .max(50, 'License number cannot exceed 50 characters')
    .trim(),
  vehicleType: z.enum(Object.values(VehicleType) as [string, ...string[]]),
  vehicleNumber: z
    .string()
    .min(2, 'Vehicle registration number is required')
    .max(30, 'Vehicle number cannot exceed 30 characters')
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
  orderId: z.string().min(1, 'Order ID is required'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(300).optional(),
});

export type RateDriverInput = z.infer<typeof rateDriverSchema>;
