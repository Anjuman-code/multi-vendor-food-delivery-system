import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { UserRole } from "../config/constants";
import {
  createPayout,
  listPayouts,
  getPayout,
  processPayout,
  getVendorPayouts,
  requestVendorPayout,
  requestDriverPayout,
  getDriverPayouts,
} from "../controllers/payout.controller";
import {
  createPayoutSchema,
  processPayoutSchema,
  requestPayoutSchema,
} from "../validations/payout.validation";

const router = Router();

// Admin routes
router.use("/admin/payouts", authenticate, authorize(UserRole.ADMIN));
router.post("/admin/payouts", validate(createPayoutSchema), createPayout);
router.get("/admin/payouts", listPayouts);
router.get("/admin/payouts/:payoutId", getPayout);
router.patch("/admin/payouts/:payoutId/process", validate(processPayoutSchema), processPayout);

// Vendor routes
router.get("/vendor/payouts", authenticate, authorize(UserRole.VENDOR), getVendorPayouts);
router.post(
  "/vendor/payouts/request",
  authenticate,
  authorize(UserRole.VENDOR),
  validate(requestPayoutSchema),
  requestVendorPayout,
);

// Driver routes
router.get("/driver/payouts", authenticate, authorize(UserRole.DRIVER), getDriverPayouts);
router.post(
  "/driver/payouts/request",
  authenticate,
  authorize(UserRole.DRIVER),
  validate(requestPayoutSchema),
  requestDriverPayout,
);

export default router;
