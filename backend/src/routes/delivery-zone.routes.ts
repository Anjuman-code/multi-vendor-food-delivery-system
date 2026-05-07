import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { UserRole } from "../config/constants";
import { upsertZone, getZone, deleteZone } from "../controllers/delivery-zone.controller";
import { createDeliveryZoneSchema } from "../validations/delivery-zone.validation";

const router = Router();

router.use(authenticate, authorize(UserRole.VENDOR));

router.get("/:restaurantId", getZone);
router.post("/", validate(createDeliveryZoneSchema), upsertZone);
router.delete("/:restaurantId", deleteZone);

export default router;
