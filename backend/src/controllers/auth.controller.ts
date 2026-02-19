/**
 * Authentication controller – handles registration, login, token refresh,
 * logout, email verification, password reset, and password change.
 */
import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import CustomerProfile from "../models/CustomerProfile";
import { hashToken } from "../utils/token.util";
import { verifyRefreshToken } from "../utils/jwt.util";
import { validatePasswordStrength } from "../utils/password.util";
import { successResponse, errorResponse } from "../utils/response.util";
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  ResendVerificationInput,
  OTPVerificationInput,
} from "../validations/auth.validation";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../utils/email.util";

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
      throw new ConflictError("A user with this email already exists");
    }

    const existingPhone = await User.findByPhone(phoneNumber);
    if (existingPhone) {
      throw new ConflictError("A user with this phone number already exists");
    }

    // Validate password strength
    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      throw new ValidationError(pwdCheck.errors.join(". "));
    }

    // Create user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role: "customer",
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
      console.error("[EMAIL] Failed to send verification email:", emailError);
    }

    // Log verification token (dev fallback)
    console.log("\n========================================");
    console.log("[EMAIL VERIFICATION]");
    console.log(`  User:  ${email}`);
    console.log(`  OTP:   ${otp}`);
    console.log(`  Token: ${verificationToken}`);
    console.log(`  Link:  /api/auth/verify-email/${verificationToken}`);
    console.log("========================================\n");

    successResponse(
      res,
      { userId: user._id },
      "Registration successful. Please verify your email.",
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
    const isEmail = emailOrPhone.includes("@");
    const user = isEmail
      ? await User.findByEmail(emailOrPhone)
      : await User.findByPhone(emailOrPhone);

    if (!user) {
      throw new AuthenticationError("Invalid credentials");
    }

    // Fetch password (select: false by default)
    const userWithPassword = await User.findById(user._id).select(
      "+password +refreshToken",
    );
    if (!userWithPassword) {
      throw new AuthenticationError("Invalid credentials");
    }

    // Account active?
    if (!userWithPassword.isActive) {
      throw new AuthenticationError("Account is deactivated");
    }

    // Account locked?
    if (userWithPassword.isAccountLocked()) {
      throw new AuthenticationError(
        "Account is temporarily locked due to too many failed login attempts. Please try again later.",
      );
    }

    // Verify password
    const isMatch = await userWithPassword.comparePassword(password);
    if (!isMatch) {
      await userWithPassword.incrementFailedLoginAttempts();
      throw new AuthenticationError("Invalid credentials");
    }

    // Reset failed attempts
    await userWithPassword.resetFailedLoginAttempts();

    // Generate tokens
    const { accessToken, refreshToken } = userWithPassword.generateAuthToken();

    // Store refresh token
    userWithPassword.refreshToken.push(refreshToken);
    userWithPassword.lastLogin = new Date();
    await userWithPassword.save({ validateBeforeSave: false });

    const safeUser = sanitiseUser(toRecord(userWithPassword.toObject()));

    successResponse(
      res,
      {
        accessToken,
        refreshToken,
        user: {
          id: safeUser._id,
          email: safeUser.email,
          firstName: safeUser.firstName,
          lastName: safeUser.lastName,
          role: safeUser.role,
          isEmailVerified: safeUser.isEmailVerified,
        },
      },
      "Login successful",
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
      (req.body as { refreshToken?: string }).refreshToken ||
      (req.cookies?.refreshToken as string | undefined);

    if (!token) {
      throw new AuthenticationError("Refresh token is required");
    }

    // Verify signature
    const decoded = verifyRefreshToken(token);

    // Confirm token is stored for this user
    const user = await User.findById(decoded.userId).select("+refreshToken");
    if (!user || !user.refreshToken.includes(token)) {
      throw new AuthenticationError("Invalid refresh token");
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

    successResponse(
      res,
      {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      },
      "Token refreshed successfully",
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
      (req.body as { refreshToken?: string }).refreshToken ||
      (req.cookies?.refreshToken as string | undefined);

    if (token && req.user) {
      const user = await User.findById(req.user._id).select("+refreshToken");
      if (user) {
        user.refreshToken = user.refreshToken.filter((t) => t !== token);
        await user.save({ validateBeforeSave: false });
      }
    }

    res.clearCookie("refreshToken");
    successResponse(res, null, "Logged out successfully");
  } catch (error) {
    next(error);
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
        "Invalid or expired email verification token",
      );
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationOTP = undefined;
    user.emailVerificationOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });

    successResponse(res, null, "Email verified successfully");
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
      throw new NotFoundError("User not found");
    }

    if (user.isEmailVerified) {
      throw new ValidationError("Email is already verified");
    }

    const verificationToken = user.generateEmailVerificationToken();
    const { token: rawToken, otp } = verificationToken;
    await user.save({ validateBeforeSave: false });

    // Send verification email
    try {
      await sendVerificationEmail(email, otp, rawToken);
    } catch (emailError) {
      console.error(
        "[EMAIL] Failed to send verification email (resend):",
        emailError,
      );
    }

    console.log("\n========================================");
    console.log("[EMAIL VERIFICATION - RESEND]");
    console.log(`  User:  ${email}`);
    console.log(`  OTP:   ${otp}`);
    console.log(`  Token: ${rawToken}`);
    console.log(`  Link:  /api/auth/verify-email/${rawToken}`);
    console.log("========================================\n");

    successResponse(res, null, "Verification email sent");
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
        "If the email exists, a password reset link has been sent",
      );
      return;
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      console.error("[EMAIL] Failed to send password reset email:", emailError);
    }

    console.log("\n========================================");
    console.log("[PASSWORD RESET]");
    console.log(`  User:  ${email}`);
    console.log(`  Token: ${resetToken}`);
    console.log("========================================\n");

    successResponse(
      res,
      null,
      "If the email exists, a password reset link has been sent",
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
      throw new ValidationError(pwdCheck.errors.join(". "));
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select("+refreshToken");

    if (!user) {
      throw new AuthenticationError("Invalid or expired password reset token");
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Invalidate all refresh tokens to force re-login
    user.refreshToken = [];
    await user.save();

    successResponse(res, null, "Password reset successful");
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
      throw new AuthenticationError("Not authenticated");
    }

    const user = await User.findById(req.user._id).select(
      "+password +refreshToken",
    );
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Validate password strength
    const pwdCheck = validatePasswordStrength(newPassword);
    if (!pwdCheck.valid) {
      throw new ValidationError(pwdCheck.errors.join(". "));
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AuthenticationError("Current password is incorrect");
    }

    user.password = newPassword;
    // Invalidate all other sessions
    user.refreshToken = [];
    await user.save();

    successResponse(res, null, "Password changed successfully");
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
      throw new NotFoundError("User not found");
    }

    if (user.isEmailVerified) {
      throw new ValidationError("Email is already verified");
    }

    // Check OTP expiry
    if (
      !user.emailVerificationOTP ||
      !user.emailVerificationOTPExpires ||
      user.emailVerificationOTPExpires < new Date()
    ) {
      throw new AuthenticationError(
        "OTP has expired. Please request a new verification email.",
      );
    }

    // Compare hashed OTP
    const hashedOTP = hashToken(otp);
    if (user.emailVerificationOTP !== hashedOTP) {
      throw new AuthenticationError("Invalid OTP. Please try again.");
    }

    // Mark email as verified and clear all verification fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationOTP = undefined;
    user.emailVerificationOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });

    successResponse(res, null, "Email verified successfully");
  } catch (error) {
    next(error);
  }
};
