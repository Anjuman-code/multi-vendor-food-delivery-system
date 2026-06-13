import { z } from 'zod';

const CANONICAL_BD_PHONE_REGEX =
  /^(?:\+?88)?[- ]?01[3-9]\d{2}[- ]?\d{3}[- ]?\d{3}$/;

export const BD_PHONE_ERROR_MESSAGE =
  'Please enter a valid Bangladesh mobile number';

export const normalizeBdPhoneNumber = (value: string): string => {
  let normalized = value.trim().replace(/[\s\-()]/g, '');

  if (normalized.startsWith('8801')) {
    normalized = `+${normalized}`;
  } else if (normalized.startsWith('01')) {
    normalized = `+880${normalized.slice(1)}`;
  }

  return normalized;
};

export const isValidBdPhoneNumber = (value: string): boolean =>
  CANONICAL_BD_PHONE_REGEX.test(normalizeBdPhoneNumber(value));

export const bdPhoneSchema = z
  .string()
  .transform((value) => normalizeBdPhoneNumber(value))
  .refine((value) => isValidBdPhoneNumber(value), {
    message: BD_PHONE_ERROR_MESSAGE,
  });

export const optionalBdPhoneSchema = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
}, bdPhoneSchema.optional());

export const emailOrBdPhoneSchema = z
  .string()
  .min(1, 'Email or phone number is required')
  .transform((value) => value.trim())
  .refine(
    (value) =>
      z.string().email().safeParse(value).success ||
      isValidBdPhoneNumber(value),
    { message: 'Please enter a valid email or Bangladesh mobile number' },
  )
  .transform((value) =>
    value.includes('@') ? value.toLowerCase() : normalizeBdPhoneNumber(value),
  );
