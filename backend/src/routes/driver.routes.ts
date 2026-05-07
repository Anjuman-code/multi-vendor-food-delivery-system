import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../config/constants";
import { updateLocation, updateDeliveryStatus } from "../controllers/driver.controller";

const router = Router();

router.use(authenticate, authorize(UserRole.DRIVER));

router.post("/location", updateLocation);
router.patch("/orders/:orderId/status", updateDeliveryStatus);

export default router;
