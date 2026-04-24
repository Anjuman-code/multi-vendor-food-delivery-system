import { CookieOptions, Response } from 'express';

const ACCESS_COOKIE_NAME = 'accessToken';
const REFRESH_COOKIE_NAME = 'refreshToken';

const getCookieSameSite = (): CookieOptions['sameSite'] => {
  const configured = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();

  if (configured === 'none') {
    return 'none';
  }

  if (configured === 'strict') {
    return 'strict';
  }

  return 'lax';
};

const parseDurationToMs = (value: string, fallbackMs: number): number => {
  const raw = value.trim();
  const match = raw.match(/^(\d+)(ms|s|m|h|d)?$/i);

  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    return fallbackMs;
  }

  switch (unit) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return fallbackMs;
  }
};

const getBaseCookieOptions = (): CookieOptions => {
  const sameSite = getCookieSameSite();
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd || sameSite === 'none',
    sameSite,
    path: '/',
  };
};

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void => {
  const accessMaxAge = parseDurationToMs(
    process.env.JWT_ACCESS_EXPIRY || '15m',
    15 * 60 * 1000,
  );
  const refreshMaxAge = parseDurationToMs(
    process.env.JWT_REFRESH_EXPIRY || '7d',
    7 * 24 * 60 * 60 * 1000,
  );

  const baseOptions = getBaseCookieOptions();

  res.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
    ...baseOptions,
    maxAge: accessMaxAge,
  });

  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    ...baseOptions,
    maxAge: refreshMaxAge,
  });
};

export const clearAuthCookies = (res: Response): void => {
  const baseOptions = getBaseCookieOptions();

  res.clearCookie(ACCESS_COOKIE_NAME, baseOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions);
};
