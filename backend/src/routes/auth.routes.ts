/**
 * Authentication routes.
 */
import { Router } from "express";
import {
  register,
  registerVendor,
  login,
  refreshToken,
  logout,
  verifyEmail,
  verifyOTP,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  resendVerificationSchema,
  otpVerificationSchema,
} from "../validations/auth.validation";
import { vendorRegisterSchema } from "../validations/vendor.validation";

const router: Router = Router();

// ── Public routes ──────────────────────────────────────────────
router.post("/register", validate(registerSchema), register);
router.post("/register/vendor", validate(vendorRegisterSchema), registerVendor);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refreshToken);
router.get("/verify-email/:token", verifyEmail);
router.post("/verify-otp", validate(otpVerificationSchema), verifyOTP);
router.post(
  "/resend-verification",
  validate(resendVerificationSchema),
  resendVerification,
);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// ── Protected routes ───────────────────────────────────────────
router.post("/logout", authenticate, logout);
router.put(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  changePassword,
);

export default router;
