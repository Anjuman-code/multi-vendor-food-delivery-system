import { z } from 'zod';
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
  .email('Please enter a valid email address')
  .optional()
  .or(z.literal(''));

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const tableInventoryItemSchema = z.object({
  tableNumber: z.string().trim().min(1, 'Table number is required'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1'),
});

export const closedDateOverrideSchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
  reason: z.string().trim().max(200).optional(),
});

export const updateVendorReservationSettingsSchema = z
  .object({
    isEnabled: z.boolean(),
    totalSeats: z.number().int().min(1, 'Total seats must be at least 1'),
    tables: z.array(tableInventoryItemSchema).optional().default([]),
    walkInAllocationType: z.enum(['percentage', 'fixed_seats']),
    walkInAllocationValue: z
      .number()
      .min(0, 'Walk-in allocation cannot be negative'),
    minPartySize: z.number().int().min(1, 'Minimum party size must be at least 1'),
    maxPartySize: z.number().int().min(1, 'Maximum party size must be at least 1'),
    slotDurationMinutes: z
      .number()
      .int()
      .min(15, 'Slot duration must be at least 15 minutes'),
    slotIntervalMinutes: z
      .number()
      .int()
      .min(15, 'Slot interval must be at least 15 minutes'),
    maxAdvanceDays: z
      .number()
      .int()
      .min(1, 'Max advance booking days must be at least 1')
      .max(365, 'Cannot exceed 365 days'),
    minLeadTimeHours: z
      .number()
      .min(0, 'Minimum lead time cannot be negative'),
    closedDates: z.array(closedDateOverrideSchema).optional().default([]),
    autoConfirm: z.boolean().default(true),
    cancellationWindowHours: z
      .number()
      .min(0, 'Cancellation window cannot be negative'),
    noShowGracePeriodMinutes: z
      .number()
      .int()
      .min(0, 'No-show grace period cannot be negative'),
    depositRequired: z.boolean().default(false),
    depositAmountPerGuest: z
      .number()
      .min(0, 'Deposit amount cannot be negative'),
  })
  .refine((data) => data.minPartySize <= data.maxPartySize, {
    message: 'Minimum party size cannot exceed maximum party size',
    path: ['minPartySize'],
  })
  .refine(
    (data) => {
      if (data.walkInAllocationType === 'percentage') {
        return data.walkInAllocationValue <= 100;
      }
      return data.walkInAllocationValue < data.totalSeats;
    },
    {
      message:
        'Walk-in allocation exceeds or equals total seating capacity',
      path: ['walkInAllocationValue'],
    },
  );

export type UpdateVendorReservationSettingsInput = z.infer<
  typeof updateVendorReservationSettingsSchema
>;

export const getAvailabilityQuerySchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
  partySize: z.coerce.number().int().min(1, 'Party size must be at least 1'),
});

export const createReservationSchema = z.object({
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  partySize: z.number().int().min(1, 'Party size must be at least 1'),
  date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(timeRegex, 'Time must be in HH:MM format'),
  specialRequests: z.string().trim().max(500).optional(),
  guestInfo: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    phone: phoneSchema,
    email: emailSchema,
  }),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const createManualReservationSchema = z.object({
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  partySize: z.number().int().min(1, 'Party size must be at least 1'),
  date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(timeRegex, 'Time must be in HH:MM format'),
  specialRequests: z.string().trim().max(500).optional(),
  guestInfo: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    phone: phoneSchema,
    email: emailSchema,
  }),
  source: z.enum(['manual', 'walk_in']).default('manual'),
  status: z
    .enum(['pending', 'confirmed', 'seated', 'completed'])
    .default('confirmed'),
  assignedTables: z.array(z.string().trim()).optional().default([]),
});

export type CreateManualReservationInput = z.infer<
  typeof createManualReservationSchema
>;

export const updateReservationStatusSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'seated',
    'completed',
    'cancelled',
    'rejected',
    'no_show',
  ]),
  reason: z.string().trim().max(300).optional(),
  assignedTables: z.array(z.string().trim()).optional(),
});

export type UpdateReservationStatusInput = z.infer<
  typeof updateReservationStatusSchema
>;

export const customerCancelReservationSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});
