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

export const isCanonicalBdPhoneNumber = (value: string): boolean =>
  CANONICAL_BD_PHONE_REGEX.test(value);
