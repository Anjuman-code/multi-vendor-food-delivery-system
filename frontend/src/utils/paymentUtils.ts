/**
 * Payment Utilities — client-side validation, formatting and brand detection
 * matching industry standards (Luhn, ISO/IEC 7812, BD national mobile prefix rules).
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';
export type MobileWalletProvider = 'bkash' | 'nagad' | 'rocket' | 'upay';

/**
 * Auto-detects card network brand based on IIN (Issuer Identification Number) prefixes.
 */
export function detectCardBrand(cardNumber: string): CardBrand {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (!cleaned) return 'unknown';

  // Visa starts with 4
  if (/^4/.test(cleaned)) return 'visa';

  // Mastercard starts with 51-55 or 2221-2720
  if (/^(5[1-5]|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)/.test(cleaned)) {
    return 'mastercard';
  }

  // American Express starts with 34 or 37
  if (/^3[47]/.test(cleaned)) return 'amex';

  // Discover starts with 6011, 622126-622925, 644-649, 65
  if (/^(6011|65|64[4-9]|622)/.test(cleaned)) return 'discover';

  return 'unknown';
}

/**
 * Validates card number against the standard Luhn (mod 10) algorithm.
 */
export function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Formats a card number with spaces (e.g. 4242 4242 4242 4242 or Amex 3782 822463 10005).
 */
export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  const brand = detectCardBrand(digits);

  if (brand === 'amex') {
    // Amex 4-6-5 pattern
    const trimmed = digits.slice(0, 15);
    const parts = [
      trimmed.slice(0, 4),
      trimmed.slice(4, 10),
      trimmed.slice(10, 15),
    ].filter(Boolean);
    return parts.join(' ');
  }

  // Standard 4-4-4-4 pattern up to 16/19 digits
  const trimmed = digits.slice(0, 16);
  const groups = trimmed.match(/.{1,4}/g);
  return groups ? groups.join(' ') : trimmed;
}

/**
 * Formats an expiry date as MM/YY.
 */
export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

/**
 * Checks whether an expiry string (MM/YY) represents a valid future date.
 */
export function isValidExpiry(expiry: string): boolean {
  const match = expiry.trim().match(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/);
  if (!match) return false;

  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  if (year > currentYear + 25) return false;

  return true;
}

/**
 * Validates CVV length (3 digits standard, 4 for Amex).
 */
export function isValidCvv(cvv: string, brand?: CardBrand): boolean {
  const clean = cvv.replace(/\D/g, '');
  if (brand === 'amex') {
    return clean.length === 4;
  }
  return clean.length === 3;
}

/**
 * Validates Bangladeshi mobile wallet numbers: 01[3-9]XXXXXXXX or +8801[3-9]XXXXXXXX.
 */
export function isValidBdWalletPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+?8801|01)[3-9]\d{8}$/.test(cleaned);
}

/**
 * Normalizes phone number to standard 11-digit local format: 01XXXXXXXXX.
 */
export function normalizeBdWalletPhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+8801')) return cleaned.slice(3);
  if (cleaned.startsWith('8801')) return cleaned.slice(2);
  return cleaned;
}

export type SupportedPaymentMethod =
  | 'card'
  | 'credit_card'
  | 'debit_card'
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'upay'
  | 'wallet'
  | 'cash_on_delivery';

// Aliases matching consumer code
export const validateLuhn = luhnCheck;
export const validateExpiryDate = isValidExpiry;
export const validateCvv = isValidCvv;
export const validateBdPhone = isValidBdWalletPhone;
export const normalizeBdMobileNumber = normalizeBdWalletPhone;
export const formatExpiryDate = formatExpiry;
