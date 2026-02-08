/**
 * JWT utilities for access and refresh token management.
 */
import jwt from "jsonwebtoken";
import { AUTH } from "../config/constants";
import { TokenPayload, RefreshTokenPayload } from "../types/user.types";

const getAccessSecret = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not configured");
  return secret;
};

const getRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not configured");
  return secret;
};

/** Generate a short-lived access token (default 15 min). */
export const generateAccessToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, getAccessSecret(), {
    expiresIn: AUTH.ACCESS_TOKEN_EXPIRY,
  } as jwt.SignOptions);
};

/** Generate a long-lived refresh token (default 7 days). */
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, getRefreshSecret(), {
    expiresIn: AUTH.REFRESH_TOKEN_EXPIRY,
  } as jwt.SignOptions);
};

/** Verify an access token and return the decoded payload. */
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, getAccessSecret()) as TokenPayload;
};

/** Verify a refresh token and return the decoded payload. */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, getRefreshSecret()) as RefreshTokenPayload;
};

/** Decode a token without verifying the signature. */
export const decodeToken = (token: string): jwt.JwtPayload | null => {
  return jwt.decode(token) as jwt.JwtPayload | null;
};
