/**
 * Order routes – all routes require authentication (customer role).
 */
import { Router } from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  reorder,
} from "../controllers/order.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { UserRole } from "../config/constants";
import {
  createOrderSchema,
  cancelOrderSchema,
} from "../validations/order.validation";

const router: Router = Router();

router.use(authenticate);
router.use(authorize(UserRole.CUSTOMER));

router.post("/", validate(createOrderSchema), createOrder);
router.get("/", getOrders);
router.get("/:orderId", getOrderById);
router.patch("/:orderId/cancel", validate(cancelOrderSchema), cancelOrder);
router.post("/:orderId/reorder", reorder);

export default router;
