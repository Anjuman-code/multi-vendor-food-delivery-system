/**
 * User management controller – profile CRUD, addresses, preferences,
 * favourites, and account deactivation for customers.
 */
import { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import User from "../models/User";
import CustomerProfile from "../models/CustomerProfile";
import { successResponse } from "../utils/response.util";
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../utils/errors";
import { removeOldFile } from "../middleware/uploads/upload.middleware";
import type {
  UpdateProfileInput,
  AddAddressInput,
  UpdateAddressInput,
  UpdatePreferencesInput,
} from "../validations/user.validation";

/** Extract a single string from an Express param that may be string | string[]. */
const paramStr = (value: string | string[]): string =>
  Array.isArray(value) ? value[0] : value;

// ────────────────────────────────────────────────────────────────
// Profile
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/users/me
 * Fetch the authenticated user profile with customer data.
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const user = await User.findById(req.user._id).select(
      "-password -refreshToken -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -__v",
    );
    if (!user) throw new NotFoundError("User not found");

    const customerProfile = await CustomerProfile.findOne({
      userId: user._id,
    }).select("-__v");

    successResponse(res, { user, customerProfile });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/me
 * Update the authenticated user's basic profile fields.
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const { firstName, lastName, phoneNumber, profileImage, dateOfBirth } =
      req.body as UpdateProfileInput;

    // Check phone uniqueness if changed
    if (phoneNumber && phoneNumber !== req.user.phoneNumber) {
      const existing = await User.findOne({
        phoneNumber,
        _id: { $ne: req.user._id },
      });
      if (existing) {
        throw new ConflictError("This phone number is already in use");
      }
    }

    // Age validation (18+)
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const ageDiffMs = Date.now() - dob.getTime();
      const ageDate = new Date(ageDiffMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      if (age < 18) {
        throw new ValidationError("You must be at least 18 years old");
      }
    }

    const updateData: Record<string, unknown> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (dateOfBirth !== undefined)
      updateData.dateOfBirth = new Date(dateOfBirth);

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    }).select(
      "-password -refreshToken -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -__v",
    );

    if (!user) throw new NotFoundError("User not found");

    successResponse(res, { user }, "Profile updated successfully");
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// Addresses
// ────────────────────────────────────────────────────────────────

/**
 * POST /api/users/me/addresses
 * Add a new address.
 */
export const addAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const addressData = req.body as AddAddressInput;

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError("User not found");

    // If new address is default, unset existing defaults
    if (addressData.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // If first address, make it default
    if (user.addresses.length === 0) {
      addressData.isDefault = true;
    }

    user.addresses.push(addressData as never);
    await user.save({ validateBeforeSave: false });

    const newAddress = user.addresses[user.addresses.length - 1];

    successResponse(
      res,
      { address: newAddress },
      "Address added successfully",
      201,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/me/addresses/:addressId
 * Update an existing address.
 */
export const updateAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const addressId = paramStr(req.params.addressId);
    const updateData = req.body as UpdateAddressInput;

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError("User not found");

    const addrIndex = user.addresses.findIndex(
      (a) => String(a._id) === addressId,
    );
    if (addrIndex === -1) throw new NotFoundError("Address not found");

    // Handle default flag
    if (updateData.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // Apply updates
    Object.assign(user.addresses[addrIndex], updateData);
    await user.save({ validateBeforeSave: false });

    successResponse(
      res,
      { address: user.addresses[addrIndex] },
      "Address updated successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/me/addresses/:addressId
 * Remove an address.
 */
export const deleteAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const addressId = paramStr(req.params.addressId);

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError("User not found");

    const addrIndex = user.addresses.findIndex(
      (a) => String(a._id) === addressId,
    );
    if (addrIndex === -1) throw new NotFoundError("Address not found");

    // Prevent deleting the only address
    if (user.addresses.length <= 1) {
      throw new ValidationError(
        "Cannot delete the only address. Add another address first.",
      );
    }

    const wasDefault = user.addresses[addrIndex].isDefault;
    user.addresses.splice(addrIndex, 1);

    // If deleted address was default, set another as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save({ validateBeforeSave: false });

    successResponse(res, null, "Address deleted");
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/me/addresses/:addressId/set-default
 * Set an address as the default.
 */
export const setDefaultAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const addressId = paramStr(req.params.addressId);

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError("User not found");

    const addrIndex = user.addresses.findIndex(
      (a) => String(a._id) === addressId,
    );
    if (addrIndex === -1) throw new NotFoundError("Address not found");

    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
    user.addresses[addrIndex].isDefault = true;

    await user.save({ validateBeforeSave: false });

    successResponse(
      res,
      { address: user.addresses[addrIndex] },
      "Default address updated",
    );
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// Preferences
// ────────────────────────────────────────────────────────────────

/**
 * PUT /api/users/me/preferences
 * Update customer dietary preferences and notification settings.
 */
export const updatePreferences = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const { dietaryPreferences, notifications } =
      req.body as UpdatePreferencesInput;

    const profile = await CustomerProfile.findOne({ userId: req.user._id });
    if (!profile) throw new NotFoundError("Customer profile not found");

    if (dietaryPreferences !== undefined) {
      profile.dietaryPreferences = dietaryPreferences;
    }

    if (notifications !== undefined) {
      Object.assign(profile.notifications, notifications);
    }

    await profile.save();

    successResponse(
      res,
      {
        preferences: {
          dietaryPreferences: profile.dietaryPreferences,
          notifications: profile.notifications,
        },
      },
      "Preferences updated successfully",
    );
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// Favourites
// ────────────────────────────────────────────────────────────────

/**
 * POST /api/users/me/favorites/:restaurantId
 * Add a restaurant to favourites.
 */
export const addFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const restaurantId = paramStr(req.params.restaurantId);

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new ValidationError("Invalid restaurant ID");
    }

    const profile = await CustomerProfile.findOne({ userId: req.user._id });
    if (!profile) throw new NotFoundError("Customer profile not found");

    const objectId = new Types.ObjectId(restaurantId);

    if (profile.favoriteRestaurants.some((id) => id.equals(objectId))) {
      throw new ConflictError("Restaurant is already in favorites");
    }

    profile.favoriteRestaurants.push(objectId);
    await profile.save();

    successResponse(res, null, "Added to favorites");
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/me/favorites/:restaurantId
 * Remove a restaurant from favourites.
 */
export const removeFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const restaurantId = paramStr(req.params.restaurantId);

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new ValidationError("Invalid restaurant ID");
    }

    const profile = await CustomerProfile.findOne({ userId: req.user._id });
    if (!profile) throw new NotFoundError("Customer profile not found");

    const objectId = new Types.ObjectId(restaurantId);

    profile.favoriteRestaurants = profile.favoriteRestaurants.filter(
      (id) => !id.equals(objectId),
    );
    await profile.save();

    successResponse(res, null, "Removed from favorites");
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/me/favorites
 * Get favourite restaurants for the authenticated customer.
 */
export const getFavorites = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const profile = await CustomerProfile.findOne({
      userId: req.user._id,
    }).populate("favoriteRestaurants");

    if (!profile) throw new NotFoundError("Customer profile not found");

    successResponse(res, { favorites: profile.favoriteRestaurants });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// Account Deactivation
// ────────────────────────────────────────────────────────────────

/**
 * DELETE /api/users/me
 * Soft-delete (deactivate) the authenticated user's account.
 */
export const deactivateAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const { password } = req.body as { password?: string };
    if (!password) {
      throw new ValidationError("Password confirmation is required");
    }

    const user = await User.findById(req.user._id).select(
      "+password +refreshToken",
    );
    if (!user) throw new NotFoundError("User not found");

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AuthenticationError("Password is incorrect");
    }

    user.isActive = false;
    user.deletedAt = new Date();
    user.refreshToken = [];
    await user.save({ validateBeforeSave: false });

    res.clearCookie("refreshToken");

    successResponse(res, null, "Account deactivated");
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// Photo Uploads
// ────────────────────────────────────────────────────────────────

/**
 * POST /api/users/me/profile-photo
 * Upload or replace the user's profile photo.
 */
export const uploadProfilePhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();
    if (!req.file) throw new ValidationError("No image file provided");

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError("User not found");

    // Remove old file from disk
    removeOldFile(user.profileImage);

    // Store path relative to backend root, e.g. "/uploads/profiles/profile-xxx.jpg"
    const imageUrl = `/uploads/profiles/${req.file.filename}`;
    user.profileImage = imageUrl;
    await user.save({ validateBeforeSave: false });

    successResponse(
      res,
      { profileImage: imageUrl },
      "Profile photo updated successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/me/cover-photo
 * Upload or replace the user's cover photo.
 */
export const uploadCoverPhotoHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();
    if (!req.file) throw new ValidationError("No image file provided");

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError("User not found");

    // Remove old file from disk
    removeOldFile(user.coverImage);

    const imageUrl = `/uploads/covers/${req.file.filename}`;
    user.coverImage = imageUrl;
    await user.save({ validateBeforeSave: false });

    successResponse(
      res,
      { coverImage: imageUrl },
      "Cover photo updated successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/me/profile-photo
 * Remove the user's profile photo.
 */
export const deleteProfilePhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError("User not found");

    removeOldFile(user.profileImage);
    user.profileImage = undefined;
    await user.save({ validateBeforeSave: false });

    successResponse(res, null, "Profile photo removed");
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/me/cover-photo
 * Remove the user's cover photo.
 */
export const deleteCoverPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError("User not found");

    removeOldFile(user.coverImage);
    user.coverImage = undefined;
    user.coverImagePosition = 50;
    await user.save({ validateBeforeSave: false });

    successResponse(res, null, "Cover photo removed");
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/me/cover-photo/position
 * Update the vertical position (0–100) used to display the cover photo.
 */
export const updateCoverPhotoPosition = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const { position } = req.body as { position?: number };
    if (
      position === undefined ||
      typeof position !== "number" ||
      position < 0 ||
      position > 100
    ) {
      throw new ValidationError("Position must be a number between 0 and 100");
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { coverImagePosition: position },
      { new: true, runValidators: true },
    ).select(
      "-password -refreshToken -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -__v",
    );

    if (!user) throw new NotFoundError("User not found");

    successResponse(
      res,
      { coverImagePosition: user.coverImagePosition },
      "Cover photo position updated",
    );
  } catch (error) {
    next(error);
  }
};
