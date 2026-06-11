import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  syncCart,
  mergeCart,
} from "../controllers/cart.controller";
import {
  addToCartSchema,
  updateCartItemSchema,
  syncCartSchema,
  mergeCartSchema,
} from "../validations/cart.validation";

const router = Router();

router.use(authenticate);

router.get("/", getCart);
router.post("/add", validate(addToCartSchema), addToCart);
router.patch("/item/:itemKey", validate(updateCartItemSchema), updateCartItem);
router.delete("/item/:itemKey", removeCartItem);
router.delete("/", clearCart);
router.post("/sync", validate(syncCartSchema), syncCart);
router.post("/merge", validate(mergeCartSchema), mergeCart);

export default router;
