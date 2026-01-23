const User = require("../models/User");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "fallback_secret_key", {
    expiresIn: process.env.JWT_EXPIRE || "15m" // 15 minutes for access token
  });
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret", {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "30d" // 30 days for refresh token
  });
};

// Register user
const register = async (req, res) => {
  try {
    const { fullName, email, password, phoneNumber, deliveryAddress } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email"
      });
    }

    // Create new user
    const user = await User.create({
      fullName,
      email,
      password,
      phoneNumber,
      deliveryAddress
    });

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Remove password from output
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user,
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find user by email
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated"
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Update last login
    user.lastLoginAt = Date.now();
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set refresh token in cookie if rememberMe is true
    if (rememberMe) {
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: "strict"
      });
    }

    // Remove password from output
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user,
        token,
        refreshToken: rememberMe ? undefined : refreshToken // Don't send refresh token in response if rememberMe is true (since it's in cookie)
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Logout successful"
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
      error: error.message
    });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message: "If email exists, password reset link has been sent"
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Set token expiration (1 hour)
    const resetTokenExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

    // Save token and expiration to user
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = resetTokenExpires;
    await user.save({ validateBeforeSave: false });

    // In a real app, send email with reset link
    // For now, we'll just return the token for testing
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.status(200).json({
      success: true,
      message: "If email exists, password reset link has been sent",
      data: {
        resetToken // This would normally be sent via email
      }
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during password reset request",
      error: error.message
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Hash the token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful"
    });
  } catch (error) {
    console.error("Reset password error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during password reset",
      error: error.message
    });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token"
      });
    }

    // Update user to verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "Email verified successfully"
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during email verification",
      error: error.message
    });
  }
};

// Resend verification email
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified"
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationTokenExpires;
    await user.save({ validateBeforeSave: false });

    // In a real app, send verification email
    // For now, we'll just return the token for testing
    console.log(`Verification token for ${email}: ${verificationToken}`);

    res.status(200).json({
      success: true,
      message: "Verification email resent successfully",
      data: {
        verificationToken // This would normally be sent via email
      }
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during verification resend",
      error: error.message
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user",
      error: error.message
    });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { fullName, phoneNumber, deliveryAddress } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { fullName, phoneNumber, deliveryAddress },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during profile update",
      error: error.message
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Change password error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during password change",
      error: error.message
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "No refresh token provided"
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret");
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Set new refresh token in cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: "strict"
    });

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        token: newToken
      }
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid refresh token"
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  getCurrentUser,
  updateProfile,
  changePassword,
  refreshToken
};