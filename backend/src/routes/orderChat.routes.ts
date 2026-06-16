/**
 * Order live routes — chat + ETA. Mounted at /api/orders BEFORE the
 * customer-only order routes so these multi-role endpoints are reachable by
 * customers, drivers, vendors and admins (the per-channel authorization is
 * enforced inside orderChat.service).
 */
import { Router } from 'express';
import {
  getMessages,
  postMessage,
  readMessages,
  updateEta,
} from '../controllers/orderChat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router: Router = Router();

router.use(authenticate);

router.get('/:orderId/messages', getMessages);
router.post('/:orderId/messages', postMessage);
router.patch('/:orderId/messages/read', readMessages);
router.patch('/:orderId/eta', updateEta);

export default router;
