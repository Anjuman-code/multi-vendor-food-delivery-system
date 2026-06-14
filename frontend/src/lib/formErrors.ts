/**
 * Server-error → form-field mapping.
 *
 * The backend returns errors in a few consistent shapes (see
 * `backend/src/middleware/*`):
 *
 *   Zod validation:   { success:false, message:"Validation failed",
 *                       errors:[{ field:"email", message:"Invalid email" }] }
 *   Mongoose:         { success:false, message:"Validation error",
 *                       errors:["Name is required", ...] }            // string[]
 *   AppError/conflict:{ success:false, message:"...already exists" }  // no errors
 *
 * Frontend services either return that body directly (most of `services/*`)
 * or throw an Axios error whose `response.data` holds it. `extractApiError`
 * normalises both, and `applyServerErrors` maps field-level errors onto
 * React Hook Form so they render inline under the matching input — falling
 * back to a toast for anything that can't be tied to a field.
 */
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "@/lib/toast";

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  success?: boolean;
  message?: string;
  errors?: Array<FieldError | string> | string;
}

/** True for `{ field, message }` shaped entries. */
function isFieldError(value: unknown): value is FieldError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as FieldError).field === "string" &&
    typeof (value as FieldError).message === "string"
  );
}

/**
 * Normalise any thrown value (Axios error) or already-unwrapped service
 * response into a consistent `ApiErrorBody`.
 */
export function extractApiError(error: unknown): ApiErrorBody {
  if (error && typeof error === "object") {
    // Already an unwrapped API body (services/* return these).
    if ("success" in error || "message" in error || "errors" in error) {
      const maybe = error as ApiErrorBody;
      if (
        maybe.message !== undefined ||
        maybe.errors !== undefined ||
        maybe.success !== undefined
      ) {
        return maybe;
      }
    }
    // Axios error: dig out response.data.
    const axiosErr = error as {
      response?: { data?: ApiErrorBody };
      request?: unknown;
      message?: string;
    };
    if (axiosErr.response?.data && typeof axiosErr.response.data === "object") {
      return axiosErr.response.data;
    }
    if (axiosErr.request) {
      return {
        success: false,
        message: "Network error. Please check your connection.",
      };
    }
  }
  return { success: false, message: "An unexpected error occurred." };
}

/** Pull only the structured `{ field, message }` errors out of a body. */
export function getFieldErrors(body: ApiErrorBody): FieldError[] {
  if (Array.isArray(body.errors)) {
    return body.errors.filter(isFieldError);
  }
  return [];
}

/** A human-friendly summary message for a toast fallback. */
export function getErrorMessage(error: unknown, fallback?: string): string {
  const body = extractApiError(error);
  if (body.message && body.message !== "Validation failed") return body.message;
  if (Array.isArray(body.errors)) {
    const first = body.errors.find(
      (e) => typeof e === "string" || isFieldError(e),
    );
    if (typeof first === "string") return first;
    if (first && isFieldError(first)) return first.message;
  } else if (typeof body.errors === "string") {
    return body.errors;
  }
  return body.message || fallback || "Something went wrong. Please try again.";
}

function rootSegment(path: string): string {
  return path.split(/[.[]/)[0];
}

export interface ApplyServerErrorsOptions {
  /**
   * When no field-level error could be mapped to the form, show a toast with
   * the server message. Defaults to true.
   */
  toastOnUnmapped?: boolean;
  /** Title for the fallback toast. Defaults to the server message. */
  fallbackMessage?: string;
}

/**
 * Map server validation errors onto a React Hook Form instance so they appear
 * inline beneath the relevant inputs. Returns `true` if at least one error was
 * bound to a form field, `false` otherwise (caller may have shown a toast).
 */
export function applyServerErrors<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  error: unknown,
  options: ApplyServerErrorsOptions = {},
): boolean {
  const { toastOnUnmapped = true, fallbackMessage } = options;
  const body = extractApiError(error);
  const fieldErrors = getFieldErrors(body);

  const known = new Set(Object.keys(form.getValues() ?? {}));
  let mappedCount = 0;
  const unmappable: string[] = [];

  fieldErrors.forEach((fe) => {
    if (known.has(rootSegment(fe.field))) {
      form.setError(fe.field as Path<TFieldValues>, {
        type: "server",
        message: fe.message,
      });
      if (mappedCount === 0) {
        // Focus the first server-flagged field for quick correction.
        form.setFocus(fe.field as Path<TFieldValues>);
      }
      mappedCount += 1;
    } else {
      unmappable.push(fe.message);
    }
  });

  if (mappedCount > 0) {
    // Field-level errors are visible inline; surface any extras subtly.
    if (unmappable.length > 0) {
      toast.error(fallbackMessage ?? "Please fix the highlighted fields", {
        description: unmappable.join("\n"),
      });
    }
    return true;
  }

  if (toastOnUnmapped) {
    toast.error(fallbackMessage ?? getErrorMessage(error));
  }
  return false;
}
