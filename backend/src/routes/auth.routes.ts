/**
 * Authentication routes.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../config/constants';
import {
  changePassword,
  forgotPassword,
  getSession,
  handleGoogleCallback,
  login,
  logout,
  refreshToken,
  register,
  registerVendor,
  resendVerification,
  resetPassword,
  startGoogleAuth,
  verifyEmail,
  verifyOTP,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  otpVerificationSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
} from '../validations/auth.validation';
import { vendorRegisterSchema } from '../validations/vendor.validation';

const router: Router = Router();

const loginLimiter = rateLimit({
  windowMs: RATE_LIMITS.LOGIN.windowMs,
  max: RATE_LIMITS.LOGIN.max,
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: RATE_LIMITS.REGISTER.windowMs,
  max: RATE_LIMITS.REGISTER.max,
  standardHeaders: true,
  legacyHeaders: false,
});

const googleAuthLimiter = rateLimit({
  windowMs: RATE_LIMITS.GOOGLE_OAUTH.windowMs,
  max: RATE_LIMITS.GOOGLE_OAUTH.max,
  standardHeaders: true,
  legacyHeaders: false,
});

const googleCallbackLimiter = rateLimit({
  windowMs: RATE_LIMITS.GOOGLE_OAUTH_CALLBACK.windowMs,
  max: RATE_LIMITS.GOOGLE_OAUTH_CALLBACK.max,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Public routes ──────────────────────────────────────────────
router.post('/register', registerLimiter, validate(registerSchema), register);
router.post(
  '/register/vendor',
  registerLimiter,
  validate(vendorRegisterSchema),
  registerVendor,
);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', refreshToken);
router.get('/google', googleAuthLimiter, startGoogleAuth);
router.get('/google/callback', googleCallbackLimiter, handleGoogleCallback);
router.get('/verify-email/:token', verifyEmail);
router.post('/verify-otp', validate(otpVerificationSchema), verifyOTP);
router.post(
  '/resend-verification',
  validate(resendVerificationSchema),
  resendVerification,
);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// ── Protected routes ───────────────────────────────────────────
router.get('/session', authenticate, getSession);
router.post('/logout', authenticate, logout);
router.put(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  changePassword,
);

export default router;
