import { Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User";
import { AuthRequest, JwtTokenPayload } from "../types";

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

/** Generate short-lived JWT access token */
const generateToken = (userId: string): string => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || "fallback_secret_key",
    { expiresIn: process.env.JWT_EXPIRE || "15m" } as jwt.SignOptions,
  );
};

/** Generate long-lived JWT refresh token */
const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret",
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || "30d" } as jwt.SignOptions,
  );
};

/** Safely extract an error message from an unknown caught value */
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown error";

// ────────────────────────────────────────────────────────────────
// Controllers
// ────────────────────────────────────────────────────────────────

/** POST /api/auth/register */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, password, phoneNumber, deliveryAddress } =
      req.body as Record<string, string | undefined>;

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
      return;
    }

    // Create new user
    const user = await User.create({
      fullName,
      email,
      password,
      phoneNumber,
      deliveryAddress,
    });

    // Generate tokens
    const token = generateToken(String(user._id));
    const refreshToken = generateRefreshToken(String(user._id));

    // Strip password from response
    const { password: _pwd, ...userWithoutPassword } = user.toObject();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user: userWithoutPassword, token, refreshToken },
    });
  } catch (error: unknown) {
    console.error("Registration error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map((e) => e.message);
      res
        .status(400)
        .json({ success: false, message: "Validation error", errors });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: getErrorMessage(error),
    });
  }
};

/** POST /api/auth/login */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, rememberMe } = req.body as {
      email?: string;
      password?: string;
      rememberMe?: boolean;
    };

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
      return;
    }

    if (!user.isActive) {
      res
        .status(401)
        .json({ success: false, message: "Account is deactivated" });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
      return;
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const token = generateToken(String(user._id));
    const refreshToken = generateRefreshToken(String(user._id));

    // Set refresh token cookie if rememberMe
    if (rememberMe) {
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: "strict",
      });
    }

    // Strip password from response
    const { password: _pwd, ...userWithoutPassword } = user.toObject();

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: userWithoutPassword,
        token,
        refreshToken: rememberMe ? undefined : refreshToken,
      },
    });
  } catch (error: unknown) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: getErrorMessage(error),
    });
  }
};

/** POST /api/auth/logout */
export const logout = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie("refreshToken");
    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error: unknown) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
      error: getErrorMessage(error),
    });
  }
};

/** POST /api/auth/forgot-password */
export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      res.status(200).json({
        success: true,
        message: "If email exists, password reset link has been sent",
      });
      return;
    }

    // Generate & hash reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 h
    await user.save({ validateBeforeSave: false });

    // In production, send email instead
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.status(200).json({
      success: true,
      message: "If email exists, password reset link has been sent",
      data: { resetToken },
    });
  } catch (error: unknown) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during password reset request",
      error: getErrorMessage(error),
    });
  }
};

/** POST /api/auth/reset-password */
export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token, newPassword } = req.body as {
      token?: string;
      newPassword?: string;
    };

    if (!token || !newPassword) {
      res
        .status(400)
        .json({
          success: false,
          message: "Token and new password are required",
        });
      return;
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
      return;
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  } catch (error: unknown) {
    console.error("Reset password error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map((e) => e.message);
      res
        .status(400)
        .json({ success: false, message: "Validation error", errors });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Server error during password reset",
      error: getErrorMessage(error),
    });
  }
};

/** POST /api/auth/verify-email */
export const verifyEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token } = req.body as { token?: string };

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
      return;
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res
      .status(200)
      .json({ success: true, message: "Email verified successfully" });
  } catch (error: unknown) {
    console.error("Verify email error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during email verification",
      error: getErrorMessage(error),
    });
  }
};

/** POST /api/auth/resend-verification */
export const resendVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (user.isEmailVerified) {
      res
        .status(400)
        .json({ success: false, message: "Email is already verified" });
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h
    await user.save({ validateBeforeSave: false });

    // In production, send email instead
    console.log(`Verification token for ${email}: ${verificationToken}`);

    res.status(200).json({
      success: true,
      message: "Verification email resent successfully",
      data: { verificationToken },
    });
  } catch (error: unknown) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during verification resend",
      error: getErrorMessage(error),
    });
  }
};

/** GET /api/auth/me  (protected) */
export const getCurrentUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const user = await User.findById(authReq.user?._id).select("-password");

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, data: { user } });
  } catch (error: unknown) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user",
      error: getErrorMessage(error),
    });
  }
};

/** PUT /api/auth/profile  (protected) */
export const updateProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { fullName, phoneNumber, deliveryAddress } = req.body as {
      fullName?: string;
      phoneNumber?: string;
      deliveryAddress?: string;
    };

    const user = await User.findByIdAndUpdate(
      authReq.user?._id,
      { fullName, phoneNumber, deliveryAddress },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    });
  } catch (error: unknown) {
    console.error("Update profile error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map((e) => e.message);
      res
        .status(400)
        .json({ success: false, message: "Validation error", errors });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Server error during profile update",
      error: getErrorMessage(error),
    });
  }
};

/** PUT /api/auth/change-password  (protected) */
export const changePassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Current and new password are required",
      });
      return;
    }

    const user = await User.findById(authReq.user?._id).select("+password");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
      return;
    }

    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (error: unknown) {
    console.error("Change password error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map((e) => e.message);
      res
        .status(400)
        .json({ success: false, message: "Validation error", errors });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Server error during password change",
      error: getErrorMessage(error),
    });
  }
};

/** POST /api/auth/refresh-token */
export const refreshToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const refreshTokenValue = req.cookies?.refreshToken as string | undefined;

    if (!refreshTokenValue) {
      res
        .status(401)
        .json({ success: false, message: "No refresh token provided" });
      return;
    }

    const decoded = jwt.verify(
      refreshTokenValue,
      process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret",
    ) as JwtTokenPayload;

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ success: false, message: "User not found" });
      return;
    }

    // Issue new token pair
    const newToken = generateToken(String(user._id));
    const newRefreshToken = generateRefreshToken(String(user._id));

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: { token: newToken },
    });
  } catch (error: unknown) {
    console.error("Refresh token error:", error);
    res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};
