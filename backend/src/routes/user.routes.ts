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

export default router;
