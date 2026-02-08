/**
 * Password hashing & validation utilities (bcrypt).
 */
import bcrypt from "bcryptjs";
import { AUTH } from "../config/constants";

/** Hash a plain-text password. */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(AUTH.BCRYPT_ROUNDS);
  return bcrypt.hash(password, salt);
};

/** Compare a plain-text password with a bcrypt hash. */
export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

interface PasswordStrengthResult {
  valid: boolean;
  errors: string[];
}

/** Validate password strength against policy rules. */
export const validatePasswordStrength = (
  password: string,
): PasswordStrengthResult => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (password.length > 128) {
    errors.push("Password must not exceed 128 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return { valid: errors.length === 0, errors };
};
