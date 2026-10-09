import { Router } from 'express';
import {
  getMyEmailPreferences,
  handleUnsubscribe,
  updateMyEmailPreferences,
  verifyToken,
} from '../controllers/email.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes for 1-click unsubscribe and token verification
router.get('/unsubscribe', handleUnsubscribe);
router.post('/unsubscribe', handleUnsubscribe);
router.get('/verify-token', verifyToken);

// Authenticated routes for managing preferences
router.get('/preferences', authenticate, getMyEmailPreferences);
router.put('/preferences', authenticate, updateMyEmailPreferences);

export default router;
