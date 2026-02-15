/**
 * Token generation utilities for email verification and password reset.
 */
import crypto from "crypto";

/** Generate a cryptographically-random hex token for email verification. */
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

/** Generate a cryptographically-random hex token for password reset. */
export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

/** Generate a 6-digit numeric OTP. */
export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

/** Hash a token using SHA-256 (for safe storage in DB). */
export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
