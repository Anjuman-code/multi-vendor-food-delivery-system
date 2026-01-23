const express = require("express");
const router = express.Router();
const { 
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
} = require("../controllers/authController");

// Middleware for protecting routes
const { protect } = require("../middleware/auth");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/refresh-token", refreshToken);

// Protected routes
router.get("/me", protect, getCurrentUser);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;