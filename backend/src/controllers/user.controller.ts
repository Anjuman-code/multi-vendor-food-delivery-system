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
import {
  removeOldFile,
  removeLocalFile as removeUploadedLocalFile,
  uploadImageToCloud,
} from "../middleware/uploads/upload.middleware";
import type {
  UpdateProfileInput,
  AddAddressInput,
  UpdateAddressInput,
  UpdatePreferencesInput,
  AddPaymentMethodInput,
  UpdatePaymentMethodInput,
} from "../validations/user.validation";

const paramStr = (value: string | string[]): string =>
  Array.isArray(value) ? value[0] : value;

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

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const { firstName, lastName, phoneNumber, profileImage, dateOfBirth } =
      req.body as UpdateProfileInput;

    if (phoneNumber && phoneNumber !== req.user.phoneNumber) {
      const existing = await User.findOne({
        phoneNumber,
        _id: { $ne: req.user._id },
      });
      if (existing) {
        throw new ConflictError("This phone number is already in use");
      }
    }

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

    if (addressData.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

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

    if (updateData.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

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

    if (user.addresses.length <= 1) {
      throw new ValidationError(
        "Cannot delete the only address. Add another address first.",
      );
    }

    const wasDefault = user.addresses[addrIndex].isDefault;
    user.addresses.splice(addrIndex, 1);

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save({ validateBeforeSave: false });

    successResponse(res, null, "Address deleted");
  } catch (error) {
    next(error);
  }
};

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

    removeOldFile(user.profileImage);

    const cloudImageUrl = await uploadImageToCloud(
      req.file.path,
      "profiles",
      req.user._id.toString(),
    );

    const imageUrl = cloudImageUrl || `/uploads/profiles/${req.file.filename}`;

    if (cloudImageUrl) {
      removeUploadedLocalFile(req.file.path);
    }

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

    removeOldFile(user.coverImage);

    const cloudImageUrl = await uploadImageToCloud(
      req.file.path,
      "covers",
      req.user._id.toString(),
    );
    const imageUrl = cloudImageUrl || `/uploads/covers/${req.file.filename}`;

    if (cloudImageUrl) {
      removeUploadedLocalFile(req.file.path);
    }

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

export const getPaymentMethods = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const profile = await CustomerProfile.findOne({ userId: req.user._id });
    if (!profile) throw new NotFoundError("Customer profile not found");

    successResponse(res, { paymentMethods: profile.paymentMethods });
  } catch (error) {
    next(error);
  }
};

export const addPaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const data = req.body as AddPaymentMethodInput;

    const profile = await CustomerProfile.findOne({ userId: req.user._id });
    if (!profile) throw new NotFoundError("Customer profile not found");

    if (data.isDefault) {
      profile.paymentMethods.forEach((pm) => {
        pm.isDefault = false;
      });
    }

    if (profile.paymentMethods.length === 0) {
      data.isDefault = true;
    }

    profile.paymentMethods.push(data as never);
    await profile.save();

    const added = profile.paymentMethods[profile.paymentMethods.length - 1];

    successResponse(res, { paymentMethod: added }, "Payment method added", 201);
  } catch (error) {
    next(error);
  }
};

export const updatePaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const methodId = paramStr(req.params.methodId);
    const data = req.body as UpdatePaymentMethodInput;

    const profile = await CustomerProfile.findOne({ userId: req.user._id });
    if (!profile) throw new NotFoundError("Customer profile not found");

    const idx = profile.paymentMethods.findIndex(
      (pm) => String(pm._id) === methodId,
    );
    if (idx === -1) throw new NotFoundError("Payment method not found");

    if (data.isDefault) {
      profile.paymentMethods.forEach((pm) => {
        pm.isDefault = false;
      });
    }

    Object.assign(profile.paymentMethods[idx], data);
    await profile.save();

    successResponse(
      res,
      { paymentMethod: profile.paymentMethods[idx] },
      "Payment method updated",
    );
  } catch (error) {
    next(error);
  }
};

export const deletePaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const methodId = paramStr(req.params.methodId);

    const profile = await CustomerProfile.findOne({ userId: req.user._id });
    if (!profile) throw new NotFoundError("Customer profile not found");

    const idx = profile.paymentMethods.findIndex(
      (pm) => String(pm._id) === methodId,
    );
    if (idx === -1) throw new NotFoundError("Payment method not found");

    const wasDefault = profile.paymentMethods[idx].isDefault;
    profile.paymentMethods.splice(idx, 1);

    if (wasDefault && profile.paymentMethods.length > 0) {
      profile.paymentMethods[0].isDefault = true;
    }

    await profile.save();

    successResponse(res, null, "Payment method removed");
  } catch (error) {
    next(error);
  }
};

export const setDefaultPaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AuthenticationError();

    const methodId = paramStr(req.params.methodId);

    const profile = await CustomerProfile.findOne({ userId: req.user._id });
    if (!profile) throw new NotFoundError("Customer profile not found");

    const idx = profile.paymentMethods.findIndex(
      (pm) => String(pm._id) === methodId,
    );
    if (idx === -1) throw new NotFoundError("Payment method not found");

    profile.paymentMethods.forEach((pm) => {
      pm.isDefault = false;
    });
    profile.paymentMethods[idx].isDefault = true;

    await profile.save();

    successResponse(
      res,
      { paymentMethod: profile.paymentMethods[idx] },
      "Default payment method updated",
    );
  } catch (error) {
    next(error);
  }
};
