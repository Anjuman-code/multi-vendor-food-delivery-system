import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../config/constants";
import { updateCommissionRate } from "../controllers/vendor.controller";

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN));

// Vendor management
router.patch("/vendors/:vendorId/commission", updateCommissionRate);

export default router;
