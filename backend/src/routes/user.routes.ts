/**
 * User management routes – all routes require authentication.
 * Customer-specific routes use role authorisation.
 */
import { Router } from "express";
import {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  updatePreferences,
  addFavorite,
  removeFavorite,
  getFavorites,
  deactivateAccount,
  uploadProfilePhoto as uploadProfilePhotoHandler,
  uploadCoverPhotoHandler,
  deleteProfilePhoto,
  deleteCoverPhoto,
  updateCoverPhotoPosition,
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from "../controllers/user.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import {
  uploadProfilePhoto as profilePhotoMulter,
  uploadCoverPhoto as coverPhotoMulter,
} from "../middleware/uploads/upload.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  updateProfileSchema,
  addAddressSchema,
  updateAddressSchema,
  updatePreferencesSchema,
  addPaymentMethodSchema,
  updatePaymentMethodSchema,
} from "../validations/user.validation";
import { UserRole } from "../config/constants";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Profile ────────────────────────────────────────────────────
router.get("/me", getProfile);
router.put("/me", validate(updateProfileSchema), updateProfile);
router.delete("/me", deactivateAccount);

// ── Addresses ──────────────────────────────────────────────────
router.post("/me/addresses", validate(addAddressSchema), addAddress);
router.put(
  "/me/addresses/:addressId",
  validate(updateAddressSchema),
  updateAddress,
);
router.delete("/me/addresses/:addressId", deleteAddress);
router.patch("/me/addresses/:addressId/set-default", setDefaultAddress);

// ── Photo uploads ──────────────────────────────────────────────
router.post("/me/profile-photo", profilePhotoMulter, uploadProfilePhotoHandler);
router.delete("/me/profile-photo", deleteProfilePhoto);
router.post("/me/cover-photo", coverPhotoMulter, uploadCoverPhotoHandler);
router.delete("/me/cover-photo", deleteCoverPhoto);
router.patch("/me/cover-photo/position", updateCoverPhotoPosition);

// ── Preferences (customer only) ────────────────────────────────
router.put(
  "/me/preferences",
  authorize(UserRole.CUSTOMER),
  validate(updatePreferencesSchema),
  updatePreferences,
);

// ── Favourites (customer only) ─────────────────────────────────
router.get("/me/favorites", authorize(UserRole.CUSTOMER), getFavorites);
router.post(
  "/me/favorites/:restaurantId",
  authorize(UserRole.CUSTOMER),
  addFavorite,
);
router.delete(
  "/me/favorites/:restaurantId",
  authorize(UserRole.CUSTOMER),
  removeFavorite,
);

// ── Payment Methods (customer only) ────────────────────────────
router.get(
  "/me/payment-methods",
  authorize(UserRole.CUSTOMER),
  getPaymentMethods,
);
router.post(
  "/me/payment-methods",
  authorize(UserRole.CUSTOMER),
  validate(addPaymentMethodSchema),
  addPaymentMethod,
);
router.put(
  "/me/payment-methods/:methodId",
  authorize(UserRole.CUSTOMER),
  validate(updatePaymentMethodSchema),
  updatePaymentMethod,
);
router.delete(
  "/me/payment-methods/:methodId",
  authorize(UserRole.CUSTOMER),
  deletePaymentMethod,
);
router.patch(
  "/me/payment-methods/:methodId/set-default",
  authorize(UserRole.CUSTOMER),
  setDefaultPaymentMethod,
);

export default router;
