/**
 * Standardised HTTP response helpers.
 */
import { Response } from "express";

interface SuccessPayload {
  success: true;
  message: string;
  data?: unknown;
}

interface PaginatedPayload extends SuccessPayload {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ErrorPayload {
  success: false;
  message: string;
  errors?: unknown;
}

/** Send a success JSON response. */
export const successResponse = (
  res: Response,
  data: unknown = null,
  message = "Success",
  statusCode = 200,
): Response<SuccessPayload> => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/** Send an error JSON response. */
export const errorResponse = (
  res: Response,
  message: string,
  statusCode = 500,
  errors: unknown = null,
): Response<ErrorPayload> => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
};

/** Send a paginated success JSON response. */
export const paginatedResponse = (
  res: Response,
  data: unknown,
  page: number,
  limit: number,
  total: number,
): Response<PaginatedPayload> => {
  return res.status(200).json({
    success: true,
    message: "Success",
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};
