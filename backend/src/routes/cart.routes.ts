import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { getCart, addToCart, updateCartItem, clearCart, syncCart } from "../controllers/cart.controller";
import { addToCartSchema, updateCartItemSchema, syncCartSchema } from "../validations/cart.validation";

const router = Router();

router.use(authenticate);

router.get("/", getCart);
router.post("/add", validate(addToCartSchema), addToCart);
router.patch("/item/:menuItemId", validate(updateCartItemSchema), updateCartItem);
router.delete("/", clearCart);
router.post("/sync", validate(syncCartSchema), syncCart);

export default router;
