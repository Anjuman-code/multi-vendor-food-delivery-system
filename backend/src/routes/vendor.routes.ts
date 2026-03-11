/**
 * Vendor routes – profile, restaurant, menu, and order management.
 * All routes require authentication + vendor role.
 */
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { UserRole } from "../config/constants";

// Controllers
import {
  getProfile,
  updateProfile,
  getMyRestaurants,
  getMyRestaurant,
  createMyRestaurant,
  updateMyRestaurant,
  deleteMyRestaurant,
} from "../controllers/vendor.controller";

import {
  createCategory,
  updateCategory,
  deleteCategory,
  createItem,
  updateItem,
  deleteItem,
  toggleItemAvailability,
} from "../controllers/vendor-menu.controller";

import {
  getVendorOrders,
  getVendorOrderById,
  updateVendorOrderStatus,
} from "../controllers/vendor-order.controller";

// Validation schemas
import {
  updateVendorProfileSchema,
  createRestaurantSchema,
  updateRestaurantSchema,
  createMenuCategorySchema,
  updateMenuCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  updateOrderStatusSchema,
} from "../validations/vendor.validation";

const router: Router = Router();

// All vendor routes require authentication + vendor role
router.use(authenticate, authorize(UserRole.VENDOR));

// ── Profile ────────────────────────────────────────────────────
router.get("/profile", getProfile);
router.put("/profile", validate(updateVendorProfileSchema), updateProfile);

// ── Restaurants ────────────────────────────────────────────────
router.get("/restaurants", getMyRestaurants);
router.post(
  "/restaurants",
  validate(createRestaurantSchema),
  createMyRestaurant,
);
router.get("/restaurants/:restaurantId", getMyRestaurant);
router.put(
  "/restaurants/:restaurantId",
  validate(updateRestaurantSchema),
  updateMyRestaurant,
);
router.delete("/restaurants/:restaurantId", deleteMyRestaurant);

// ── Menu Categories ────────────────────────────────────────────
router.post(
  "/restaurants/:restaurantId/menu/categories",
  validate(createMenuCategorySchema),
  createCategory,
);
router.put(
  "/restaurants/:restaurantId/menu/categories/:categoryId",
  validate(updateMenuCategorySchema),
  updateCategory,
);
router.delete(
  "/restaurants/:restaurantId/menu/categories/:categoryId",
  deleteCategory,
);

// ── Menu Items ─────────────────────────────────────────────────
router.post(
  "/restaurants/:restaurantId/menu/items",
  validate(createMenuItemSchema),
  createItem,
);
router.put(
  "/restaurants/:restaurantId/menu/items/:itemId",
  validate(updateMenuItemSchema),
  updateItem,
);
router.delete("/restaurants/:restaurantId/menu/items/:itemId", deleteItem);
router.patch(
  "/restaurants/:restaurantId/menu/items/:itemId/availability",
  toggleItemAvailability,
);

// ── Orders ─────────────────────────────────────────────────────
router.get("/orders", getVendorOrders);
router.get("/orders/:orderId", getVendorOrderById);
router.patch(
  "/orders/:orderId/status",
  validate(updateOrderStatusSchema),
  updateVendorOrderStatus,
);

export default router;
