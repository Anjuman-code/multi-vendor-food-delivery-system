/**
 * Custom MongoDB query-injection sanitiser compatible with Express 5.
 *
 * `express-mongo-sanitize` crashes on Express 5 because it tries to
 * reassign `req.query`, which is now a read-only getter.
 *
 * This middleware strips keys that start with `$` or contain `.` from
 * `req.body` and `req.params` (the writable properties).  It does NOT
 * touch `req.query` because Express 5 already parses it immutably —
 * Mongoose will not interpret `$`-prefixed query-string keys as
 * operators in the first place, so the risk is negligible.
 */
import { Request, Response, NextFunction } from "express";

type Sanitisable =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null
  | undefined;

/** Recursively remove dangerous keys from an object / array. */
function sanitise(data: Sanitisable): Sanitisable {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitise(item as Sanitisable));
  }

  if (typeof data === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip keys that start with "$" or contain "."
      if (key.startsWith("$") || key.includes(".")) continue;
      cleaned[key] = sanitise(value as Sanitisable);
    }
    return cleaned;
  }

  return data;
}

/** Express middleware – sanitises `req.body` and `req.params`. */
export const mongoSanitiseMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitise(req.body);
  }
  if (req.params && typeof req.params === "object") {
    // req.params is writable in Express 5
    const sanitised = sanitise(req.params) as Record<string, string>;
    for (const key of Object.keys(req.params)) {
      if (!(key in sanitised)) {
        delete req.params[key];
      }
    }
    Object.assign(req.params, sanitised);
  }
  next();
};
