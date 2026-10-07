import { Router } from 'express';
import {
  getPublicAvailability,
  createCustomerReservation,
  getCustomerReservations,
  getCustomerReservationById,
  cancelCustomerReservation,
  getVendorReservations,
  updateReservationStatus,
  createVendorManualReservation,
  getVendorReservationSettings,
  updateVendorReservationSettings,
  getAdminReservations,
} from '../controllers/reservation.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../config/constants';

const router = Router();

// ── Public Routes ────────────────────────────────────────────────
router.get('/availability/:restaurantId', getPublicAvailability);

// ── Customer Routes ──────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  authorize(UserRole.CUSTOMER),
  createCustomerReservation,
);
router.get(
  '/my',
  authenticate,
  authorize(UserRole.CUSTOMER),
  getCustomerReservations,
);
router.get(
  '/my/:id',
  authenticate,
  authorize(UserRole.CUSTOMER),
  getCustomerReservationById,
);
router.post(
  '/my/:id/cancel',
  authenticate,
  authorize(UserRole.CUSTOMER),
  cancelCustomerReservation,
);

// ── Vendor Routes ────────────────────────────────────────────────
router.get(
  '/vendor',
  authenticate,
  authorize(UserRole.VENDOR, UserRole.ADMIN),
  getVendorReservations,
);
router.patch(
  '/vendor/:id/status',
  authenticate,
  authorize(UserRole.VENDOR, UserRole.ADMIN),
  updateReservationStatus,
);
router.post(
  '/vendor/manual',
  authenticate,
  authorize(UserRole.VENDOR, UserRole.ADMIN),
  createVendorManualReservation,
);
router.get(
  '/vendor/settings/:restaurantId',
  authenticate,
  authorize(UserRole.VENDOR, UserRole.ADMIN),
  getVendorReservationSettings,
);
router.put(
  '/vendor/settings/:restaurantId',
  authenticate,
  authorize(UserRole.VENDOR, UserRole.ADMIN),
  updateVendorReservationSettings,
);

// ── Admin Routes ─────────────────────────────────────────────────
router.get(
  '/admin',
  authenticate,
  authorize(UserRole.ADMIN),
  getAdminReservations,
);

export default router;
