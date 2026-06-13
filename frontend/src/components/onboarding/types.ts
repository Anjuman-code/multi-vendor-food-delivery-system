import type { LucideIcon } from "lucide-react";

/** A single step in an onboarding flow, shared across customer/vendor/rider. */
export interface OnboardingStep {
  /** Stable id used for URL params and keys. */
  id: string;
  /** Short label shown in the stepper. */
  label: string;
  /** One-line description shown beside the label on the brand panel. */
  description: string;
  /** Icon shown in the stepper node. */
  icon: LucideIcon;
}

export type OnboardingRole = "customer" | "vendor" | "rider";
