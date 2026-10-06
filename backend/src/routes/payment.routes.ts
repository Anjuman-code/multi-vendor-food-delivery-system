import { Router } from 'express';
import { processPayment, verifyPayment } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Process payment (bKash, Nagad, Card)
router.post('/process', authenticate, processPayment);

// Verify transaction
router.get('/verify/:transactionId', verifyPayment);

export default router;
