import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag

function getSecretKey(): Buffer {
  const secret =
    process.env.EMAIL_PAYLOAD_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    'fallback-dev-secret-mvfds-at-least-32-chars';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt sensitive auth payload (OTP / rawToken) for storage in EmailOutbox.
 * Returns format: iv:ciphertext:tag (hex encoded).
 */
export function encryptAuthPayload(data: Record<string, unknown>): string {
  const key = getSecretKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const jsonStr = JSON.stringify(data);
  let ciphertext = cipher.update(jsonStr, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${ciphertext}:${tag.toString('hex')}`;
}

/**
 * Decrypt sensitive auth payload from EmailOutbox.
 */
export function decryptAuthPayload<T = Record<string, unknown>>(
  encryptedStr: string,
): T {
  const parts = encryptedStr.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivHex, ciphertextHex, tagHex] = parts;
  const key = getSecretKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted) as T;
}
