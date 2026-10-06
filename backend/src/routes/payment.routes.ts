import { Router } from 'express';
import {
  initiatePaymentSession,
  verifyPaymentOtp,
  resendPaymentOtp,
  confirmPayment,
  processPayment,
  verifyPayment,
  getCustomerWallet,
  remitDriverCodCash,
  getAvailablePaymentMethods,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public: available methods & configuration
router.get('/methods', getAvailablePaymentMethods);

// Interactive Session Gateway Flow
router.post('/session', authenticate, initiatePaymentSession);
router.post('/verify-otp', authenticate, verifyPaymentOtp);
router.post('/resend-otp', authenticate, resendPaymentOtp);
router.post('/confirm', authenticate, confirmPayment);

// Backward compatible process endpoint
router.post('/process', authenticate, processPayment);

// Transaction verification
router.get('/verify/:transactionId', verifyPayment);

// In-app wallet
router.get('/wallet', authenticate, getCustomerWallet);

// Rider COD Remittance
router.post('/driver/cod-remit', authenticate, remitDriverCodCash);

export default router;
