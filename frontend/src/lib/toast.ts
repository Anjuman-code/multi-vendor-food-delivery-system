/**
 * Unified toast API — the single entry point for transient notifications.
 *
 * Built on top of `sonner` (the toast engine recommended by shadcn/ui). It
 * provides semantic helpers with sensible, production-grade defaults:
 *
 *   import { toast } from "@/lib/toast";
 *
 *   toast.success("Saved");
 *   toast.error("Couldn't save", { description: "Please try again." });
 *   toast.warning("Low balance");
 *   toast.info("New version available");
 *   toast.loading("Uploading…");
 *   toast.promise(savePromise, {
 *     loading: "Saving…",
 *     success: "Saved",
 *     error: (e) => getErrorMessage(e),
 *   });
 *   toast.success("Deleted", {
 *     action: { label: "Undo", onClick: () => restore() },
 *   });
 *
 * Durations follow accessibility/UX norms: errors linger longest (users need
 * time to read them), successes are brief, and loading toasts never auto-close
 * (they must be resolved/updated by their owner).
 */
import type { ReactNode } from "react";
import { toast as sonnerToast, type ExternalToast } from "sonner";

export type ToastOptions = ExternalToast;

/** Default auto-dismiss durations (ms) tuned per severity. */
const DURATION = {
  default: 4000,
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 6000,
} as const;

type Message = ReactNode | string;

const withDefaults = (
  duration: number,
  opts?: ToastOptions,
): ToastOptions => ({ duration, ...opts });

export const toast = {
  /** Positive confirmation of a completed action. */
  success: (message: Message, opts?: ToastOptions) =>
    sonnerToast.success(message, withDefaults(DURATION.success, opts)),

  /** A failure the user should notice and likely act on. */
  error: (message: Message, opts?: ToastOptions) =>
    sonnerToast.error(message, withDefaults(DURATION.error, opts)),

  /** A caution that isn't an outright failure. */
  warning: (message: Message, opts?: ToastOptions) =>
    sonnerToast.warning(message, withDefaults(DURATION.warning, opts)),

  /** Neutral, informational feedback. */
  info: (message: Message, opts?: ToastOptions) =>
    sonnerToast.info(message, withDefaults(DURATION.info, opts)),

  /** Plain message with no semantic colour/icon. */
  message: (message: Message, opts?: ToastOptions) =>
    sonnerToast.message(message, withDefaults(DURATION.default, opts)),

  /** Indefinite spinner toast — resolve it via toast.dismiss(id) or toast.promise. */
  loading: (message: Message, opts?: ToastOptions) =>
    sonnerToast.loading(message, opts),

  /**
   * Drive a toast through an async lifecycle. Shows a loading toast, then
   * swaps to success/error when the promise settles.
   */
  promise: sonnerToast.promise,

  /** Render a fully custom toast component. */
  custom: sonnerToast.custom,

  /** Dismiss a specific toast (by id) or all toasts when called with no id. */
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};

export type Toast = typeof toast;
