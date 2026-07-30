/**
 * Zod validation schemas for user management endpoints.
 */
import { z } from 'zod';
import { AddressType } from '../config/constants';
import {
  BD_PHONE_ERROR_MESSAGE,
  isValidBdPhoneNumber,
  normalizeBdPhoneNumber,
} from '../utils/phone.util';

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

// ── Profile update ─────────────────────────────────────────────

export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phoneNumber: z
    .string()
    .transform((v) => normalizeBdPhoneNumber(v))
    .refine((v) => isValidBdPhoneNumber(v), {
      message: BD_PHONE_ERROR_MESSAGE,
    })
    .optional(),
  profileImage: z.string().url('Profile image must be a valid URL').optional(),
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
  street: z
    .string()
    .trim()
    .min(2, 'Street must be at least 2 characters')
    .max(200, 'Street cannot exceed 200 characters'),
  apartment: z
    .string()
    .trim()
    .max(200, 'Apartment cannot exceed 200 characters')
    .optional(),
  area: z
    .string()
    .trim()
    .min(2, 'Area must be at least 2 characters')
    .max(100, 'Area cannot exceed 100 characters'),
  district: z
    .string()
    .trim()
    .min(2, 'District must be at least 2 characters')
    .max(100, 'District cannot exceed 100 characters'),
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

// ── Payment methods ────────────────────────────────────────────

export const addPaymentMethodSchema = z.object({
  type: z.enum(['card', 'upi', 'wallet']),
  provider: z.string().min(1, 'Provider is required').max(50).trim(),
  token: z.string().min(1, 'Token is required').trim(),
  last4: z
    .string()
    .length(4, 'last4 must be exactly 4 characters')
    .regex(/^\d{4}$/, 'last4 must be 4 digits'),
  isDefault: z.boolean().optional().default(false),
  expiryMonth: z.number().int().min(1).max(12).optional(),
  expiryYear: z.number().int().min(2024).max(2050).optional(),
});

export const updatePaymentMethodSchema = addPaymentMethodSchema.partial();

// ── Inferred types ─────────────────────────────────────────────

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddAddressInput = z.infer<typeof addAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<
  typeof updatePaymentMethodSchema
>;
