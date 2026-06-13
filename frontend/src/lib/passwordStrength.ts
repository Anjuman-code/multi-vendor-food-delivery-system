/**
 * Shared password-strength scoring for the auth flow.
 *
 * Mirrors the complexity rules enforced by the Zod schemas in
 * `lib/validation.ts` (lower + upper + digit + special, 8+ chars) so the
 * visual meter and the validator never disagree. Used by the register and
 * reset-password pages.
 */

export interface PasswordStrength {
  /** 0–5, how many strength checks passed. */
  score: number;
  label: string;
  /** Tailwind bg-* class for the meter segments. */
  barClass: string;
  /** Tailwind text-* class for the label. */
  textClass: string;
}

const SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (SPECIAL.test(password)) score++;

  if (score <= 1)
    return { score, label: "Weak", barClass: "bg-red-500", textClass: "text-red-600" };
  if (score <= 2)
    return { score, label: "Fair", barClass: "bg-orange-500", textClass: "text-orange-600" };
  if (score <= 3)
    return { score, label: "Good", barClass: "bg-yellow-500", textClass: "text-yellow-600" };
  if (score <= 4)
    return { score, label: "Strong", barClass: "bg-green-500", textClass: "text-green-600" };
  return { score, label: "Very strong", barClass: "bg-emerald-500", textClass: "text-emerald-600" };
}
