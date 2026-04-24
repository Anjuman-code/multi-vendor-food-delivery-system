/**
 * Authentication controller – handles registration, login, token refresh,
 * logout, email verification, password reset, and password change.
 */
import { randomBytes } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import CustomerProfile from '../models/CustomerProfile';
import User from '../models/User';
import VendorProfile from '../models/VendorProfile';
import {
  buildGoogleAuthUrl,
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  normaliseNextPath,
  verifyGoogleAuthorizationCode,
} from '../services/google-oauth.service';
import { clearAuthCookies, setAuthCookies } from '../utils/auth-cookie.util';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../utils/email.util';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { verifyRefreshToken } from '../utils/jwt.util';
import { validatePasswordStrength } from '../utils/password.util';
import { successResponse } from '../utils/response.util';
import { hashToken } from '../utils/token.util';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  OTPVerificationInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
} from '../validations/auth.validation';
import type { VendorRegisterInput } from '../validations/vendor.validation';

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

/** Return a sanitised user object (no password / tokens). */
const sanitiseUser = (user: Record<string, unknown>) => {
  const {
    password: _p,
    refreshToken: _r,
    passwordResetToken: _prt,
    passwordResetExpires: _pre,
    emailVerificationToken: _evt,
    emailVerificationExpires: _eve,
    __v: _v,
    ...safe
  } = user;
  return safe;
};

/** Safely convert a Mongoose document to a plain Record. */
const toRecord = (doc: unknown): Record<string, unknown> => {
  return doc as Record<string, unknown>;
};

const getStringValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
};

const toAuthUser = (safeUser: Record<string, unknown>) => ({
  id: safeUser._id,
  email: safeUser.email,
  firstName: safeUser.firstName,
  lastName: safeUser.lastName,
  role: safeUser.role,
  isEmailVerified: safeUser.isEmailVerified,
});

const getOAuthCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 10 * 60 * 1000,
});

const clearOAuthTempCookies = (res: Response): void => {
  const options = getOAuthCookieOptions();
  res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, options);
  res.clearCookie(GOOGLE_OAUTH_NEXT_COOKIE, options);
};

const getFrontendBaseUrl = (): string => {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
};

const buildFrontendGoogleCallbackUrl = (
  status: 'success' | 'error',
  params: Record<string, string | undefined> = {},
): string => {
  const callbackUrl = new URL('/auth/google/callback', getFrontendBaseUrl());
  callbackUrl.searchParams.set('status', status);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      callbackUrl.searchParams.set(key, value);
    }
  });

  return callbackUrl.toString();
};

// ────────────────────────────────────────────────────────────────
// Controllers
// ────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Register a new customer account.
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phoneNumber } =
      req.body as RegisterInput;

    // Check duplicates
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      throw new ConflictError('A user with this email already exists');
    }

    const existingPhone = await User.findByPhone(phoneNumber);
    if (existingPhone) {
      throw new ConflictError('A user with this phone number already exists');
    }

    // Validate password strength
    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      throw new ValidationError(pwdCheck.errors.join('. '));
    }

    // Create user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role: 'customer',
    });

    // Generate email verification token
    const { token: verificationToken, otp } =
      user.generateEmailVerificationToken();
    await user.save();

    // Create linked customer profile
    await CustomerProfile.create({ userId: user._id });

    // Send verification email
    try {
      await sendVerificationEmail(email, otp, verificationToken);
    } catch (emailError) {
      console.error('[EMAIL] Failed to send verification email:', emailError);
    }

    // Log verification token (dev fallback)
    console.log('\n========================================');
    console.log('[EMAIL VERIFICATION]');
    console.log(`  User:  ${email}`);
    console.log(`  OTP:   ${otp}`);
    console.log(`  Token: ${verificationToken}`);
    console.log(`  Link:  /api/auth/verify-email/${verificationToken}`);
    console.log('========================================\n');

    successResponse(
      res,
      { userId: user._id },
      'Registration successful. Please verify your email.',
      201,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register/vendor
 * Register a new vendor account with business details.
 */
export const registerVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      businessName,
      businessLicense,
      taxId,
    } = req.body as VendorRegisterInput;

    // Check duplicates
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      throw new ConflictError('A user with this email already exists');
    }

    const existingPhone = await User.findByPhone(phoneNumber);
    if (existingPhone) {
      throw new ConflictError('A user with this phone number already exists');
    }

    // Validate password strength
    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      throw new ValidationError(pwdCheck.errors.join('. '));
    }

    // Create user with vendor role
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role: 'vendor',
    });

    // Generate email verification token
    const { token: verificationToken, otp } =
      user.generateEmailVerificationToken();
    await user.save();

    // Create linked vendor profile
    await VendorProfile.create({
      userId: user._id,
      businessName,
      businessLicense,
      taxId,
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, otp, verificationToken);
    } catch (emailError) {
      console.error('[EMAIL] Failed to send verification email:', emailError);
    }

    // Log verification token (dev fallback)
    console.log('\n========================================');
    console.log('[EMAIL VERIFICATION - VENDOR]');
    console.log(`  User:  ${email}`);
    console.log(`  OTP:   ${otp}`);
    console.log(`  Token: ${verificationToken}`);
    console.log(`  Link:  /api/auth/verify-email/${verificationToken}`);
    console.log('========================================\n');

    successResponse(
      res,
      { userId: user._id },
      'Vendor registration successful. Please verify your email.',
      201,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticate a user with email/phone + password.
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { emailOrPhone, password } = req.body as LoginInput;

    // Look up by email or phone
    const isEmail = emailOrPhone.includes('@');
    const user = isEmail
      ? await User.findByEmail(emailOrPhone)
      : await User.findByPhone(emailOrPhone);

    if (!user) {
      console.warn('[AUTH] Login failed: user not found', {
        identifier: emailOrPhone,
        ip: req.ip,
      });
      throw new AuthenticationError('Invalid credentials');
    }

    // Fetch password (select: false by default)
    const userWithPassword = await User.findById(user._id).select(
      '+password +refreshToken',
    );
    if (!userWithPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Account active?
    if (!userWithPassword.isActive) {
      console.warn('[AUTH] Login denied: account deactivated', {
        userId: String(userWithPassword._id),
        ip: req.ip,
      });
      throw new AuthenticationError('Account is deactivated');
    }

    // Account locked?
    if (userWithPassword.isAccountLocked()) {
      console.warn('[AUTH] Login denied: account locked', {
        userId: String(userWithPassword._id),
        ip: req.ip,
      });
      throw new AuthenticationError(
        'Account is temporarily locked due to too many failed login attempts. Please try again later.',
      );
    }

    // Verify password
    const isMatch = await userWithPassword.comparePassword(password);
    if (!isMatch) {
      await userWithPassword.incrementFailedLoginAttempts();
      console.warn('[AUTH] Login failed: invalid password', {
        userId: String(userWithPassword._id),
        ip: req.ip,
      });
      throw new AuthenticationError('Invalid credentials');
    }

    // Reset failed attempts
    await userWithPassword.resetFailedLoginAttempts();

    // Generate tokens
    const { accessToken, refreshToken } = userWithPassword.generateAuthToken();

    // Store refresh token
    userWithPassword.refreshToken.push(refreshToken);
    userWithPassword.lastLogin = new Date();
    await userWithPassword.save({ validateBeforeSave: false });
    setAuthCookies(res, { accessToken, refreshToken });

    const safeUser = sanitiseUser(toRecord(userWithPassword.toObject()));

    console.info('[AUTH] Login successful', {
      userId: String(userWithPassword._id),
      method: 'password',
      ip: req.ip,
    });

    successResponse(
      res,
      {
        accessToken,
        refreshToken,
        user: toAuthUser(safeUser),
      },
      'Login successful',
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Issue a new access token using a valid refresh token.
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token =
      (req.body as { refreshToken?: string } | undefined)?.refreshToken ||
      (req.cookies?.refreshToken as string | undefined);

    if (!token) {
      throw new AuthenticationError('Refresh token is required');
    }

    // Verify signature
    const decoded = verifyRefreshToken(token);

    // Confirm token is stored for this user
    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || !user.refreshToken.includes(token)) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Rotate tokens (atomic update to avoid VersionError on concurrent requests)
    const newTokens = user.generateAuthToken();
    await User.updateOne(
      { _id: user._id },
      {
        $pull: { refreshToken: token },
      },
    );
    await User.updateOne(
      { _id: user._id },
      {
        $push: { refreshToken: newTokens.refreshToken },
      },
    );

    setAuthCookies(res, {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    });

    console.info('[AUTH] Token refreshed', {
      userId: String(user._id),
      ip: req.ip,
    });

    successResponse(
      res,
      {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      },
      'Token refreshed successfully',
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Invalidate the refresh token for the current session.
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token =
      (req.body as { refreshToken?: string } | undefined)?.refreshToken ||
      (req.cookies?.refreshToken as string | undefined);

    if (token && req.user) {
      const user = await User.findById(req.user._id).select('+refreshToken');
      if (user) {
        user.refreshToken = user.refreshToken.filter((t) => t !== token);
        await user.save({ validateBeforeSave: false });
      }
    }

    clearAuthCookies(res);
    successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/session
 * Return the currently authenticated user from token/cookie session.
 */
export const getSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }

    const safeUser = sanitiseUser(toRecord(req.user.toObject()));
    successResponse(res, { user: toAuthUser(safeUser) }, 'Session active');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/google
 * Start Google OAuth authorization code flow.
 */
export const startGoogleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const nextParam = getStringValue(req.query.next);
    const nextPath = normaliseNextPath(nextParam);
    const state = randomBytes(24).toString('hex');

    const options = getOAuthCookieOptions();
    res.cookie(GOOGLE_OAUTH_STATE_COOKIE, state, options);
    res.cookie(GOOGLE_OAUTH_NEXT_COOKIE, nextPath, options);

    const googleAuthUrl = buildGoogleAuthUrl(state);

    console.info('[AUTH] Google OAuth initiated', {
      ip: req.ip,
      nextPath,
    });

    res.redirect(googleAuthUrl);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/google/callback
 * Verify Google identity, create/link user, then issue first-party JWT cookies.
 */
export const handleGoogleCallback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const nextPath = normaliseNextPath(req.cookies?.[GOOGLE_OAUTH_NEXT_COOKIE]);

  try {
    const code = getStringValue(req.query.code);
    const state = getStringValue(req.query.state);
    const storedState = req.cookies?.[GOOGLE_OAUTH_STATE_COOKIE] as
      | string
      | undefined;

    if (!code || !state || !storedState || state !== storedState) {
      console.warn('[AUTH] Google OAuth state validation failed', {
        ip: req.ip,
      });
      throw new AuthenticationError('Invalid OAuth state');
    }

    const googlePayload = await verifyGoogleAuthorizationCode(code);
    if (!googlePayload.sub || !googlePayload.email) {
      throw new AuthenticationError(
        'Google account is missing required fields',
      );
    }

    const googleId = googlePayload.sub;
    const email = googlePayload.email.toLowerCase().trim();
    const firstName =
      googlePayload.given_name || googlePayload.name || 'Google';
    const lastName = googlePayload.family_name || 'User';
    const avatar = googlePayload.picture;

    let user = await User.findOne({ $or: [{ googleId }, { email }] }).select(
      '+refreshToken',
    );

    if (!user) {
      user = new User({
        googleId,
        email,
        firstName,
        lastName,
        profileImage: avatar,
        role: 'customer',
        isEmailVerified: true,
      });

      await user.save({ validateBeforeSave: false });
      await CustomerProfile.create({ userId: user._id });
    } else {
      if (user.googleId && user.googleId !== googleId) {
        throw new ConflictError('Google identity does not match this account');
      }

      if (!user.googleId) {
        user.googleId = googleId;
      }

      if (!user.profileImage && avatar) {
        user.profileImage = avatar;
      }

      user.isEmailVerified = true;
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    const tokens = user.generateAuthToken();
    user.refreshToken.push(tokens.refreshToken);
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    setAuthCookies(res, tokens);
    clearOAuthTempCookies(res);

    console.info('[AUTH] Google OAuth login successful', {
      userId: String(user._id),
      method: 'google',
      ip: req.ip,
    });

    res.redirect(
      buildFrontendGoogleCallbackUrl('success', {
        next: nextPath,
      }),
    );
  } catch (error) {
    console.warn('[AUTH] Google OAuth callback failed', {
      ip: req.ip,
      reason: error instanceof Error ? error.message : 'Unknown error',
    });

    clearAuthCookies(res);
    clearOAuthTempCookies(res);
    res.redirect(
      buildFrontendGoogleCallbackUrl('error', {
        reason: 'oauth_failed',
      }),
    );
  }
};

/**
 * GET /api/auth/verify-email/:token
 * Verify a user's email address.
 */
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tokenParam = req.params.token;
    const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new AuthenticationError(
        'Invalid or expired email verification token',
      );
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationOTP = undefined;
    user.emailVerificationOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });

    successResponse(res, null, 'Email verified successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/resend-verification
 * Resend the email verification token.
 */
export const resendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body as ResendVerificationInput;

    const user = await User.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isEmailVerified) {
      throw new ValidationError('Email is already verified');
    }

    const verificationToken = user.generateEmailVerificationToken();
    const { token: rawToken, otp } = verificationToken;
    await user.save({ validateBeforeSave: false });

    // Send verification email
    try {
      await sendVerificationEmail(email, otp, rawToken);
    } catch (emailError) {
      console.error(
        '[EMAIL] Failed to send verification email (resend):',
        emailError,
      );
    }

    console.log('\n========================================');
    console.log('[EMAIL VERIFICATION - RESEND]');
    console.log(`  User:  ${email}`);
    console.log(`  OTP:   ${otp}`);
    console.log(`  Token: ${rawToken}`);
    console.log(`  Link:  /api/auth/verify-email/${rawToken}`);
    console.log('========================================\n');

    successResponse(res, null, 'Verification email sent');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Generate and log a password reset token.
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body as ForgotPasswordInput;

    const user = await User.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      successResponse(
        res,
        null,
        'If the email exists, a password reset link has been sent',
      );
      return;
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      console.error('[EMAIL] Failed to send password reset email:', emailError);
    }

    console.log('\n========================================');
    console.log('[PASSWORD RESET]');
    console.log(`  User:  ${email}`);
    console.log(`  Token: ${resetToken}`);
    console.log('========================================\n');

    successResponse(
      res,
      null,
      'If the email exists, a password reset link has been sent',
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Reset a user's password using a valid reset token.
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token, newPassword } = req.body as ResetPasswordInput;

    // Validate password strength
    const pwdCheck = validatePasswordStrength(newPassword);
    if (!pwdCheck.valid) {
      throw new ValidationError(pwdCheck.errors.join('. '));
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+refreshToken');

    if (!user) {
      throw new AuthenticationError('Invalid or expired password reset token');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Invalidate all refresh tokens to force re-login
    user.refreshToken = [];
    await user.save();

    successResponse(res, null, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/change-password
 * Change password for the authenticated user.
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body as ChangePasswordInput;

    if (!req.user) {
      throw new AuthenticationError('Not authenticated');
    }

    const user = await User.findById(req.user._id).select(
      '+password +refreshToken',
    );
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Validate password strength
    const pwdCheck = validatePasswordStrength(newPassword);
    if (!pwdCheck.valid) {
      throw new ValidationError(pwdCheck.errors.join('. '));
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AuthenticationError('Current password is incorrect');
    }

    user.password = newPassword;
    // Invalidate all other sessions
    user.refreshToken = [];
    await user.save();

    successResponse(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 * Verify a user's email address using a 6-digit OTP.
 */
export const verifyOTP = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, otp } = req.body as OTPVerificationInput;

    const user = await User.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isEmailVerified) {
      throw new ValidationError('Email is already verified');
    }

    // Check OTP expiry
    if (
      !user.emailVerificationOTP ||
      !user.emailVerificationOTPExpires ||
      user.emailVerificationOTPExpires < new Date()
    ) {
      throw new AuthenticationError(
        'OTP has expired. Please request a new verification email.',
      );
    }

    // Compare hashed OTP
    const hashedOTP = hashToken(otp);
    if (user.emailVerificationOTP !== hashedOTP) {
      throw new AuthenticationError('Invalid OTP. Please try again.');
    }

    // Mark email as verified and clear all verification fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationOTP = undefined;
    user.emailVerificationOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });

    successResponse(res, null, 'Email verified successfully');
  } catch (error) {
    next(error);
  }
};
