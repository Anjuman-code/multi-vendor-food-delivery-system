/**
 * Global error-handling middleware.
 */
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AppError } from "../utils/errors";

/**
 * Centralised error handler – catches all errors forwarded via `next(err)`.
 * Differentiates between operational errors (expected) and programming bugs.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Default values
  let statusCode = 500;
  let message = "Internal server error";
  let errors: unknown = undefined;

  // ── Operational AppError ─────────────────────────────────────
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // ── Mongoose validation error ────────────────────────────────
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation error";
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // ── Mongoose cast error (bad ObjectId, etc.) ─────────────────
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: ${String(err.value)}`;
  }

  // ── Mongo duplicate key error (code 11000) ───────────────────
  const errAny = err as unknown as Record<string, unknown>;
  if (errAny.code === 11000 || errAny.code === "11000") {
    statusCode = 409;
    const keyValue = errAny.keyValue as Record<string, unknown> | undefined;
    const field = keyValue ? Object.keys(keyValue).join(", ") : "field";
    message = `Duplicate value for ${field}. This value already exists.`;
  }

  // ── JWT errors ───────────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired";
  }

  // Log non-operational errors for debugging
  if (!(err instanceof AppError) || !err.isOperational) {
    console.error("Unhandled error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};
