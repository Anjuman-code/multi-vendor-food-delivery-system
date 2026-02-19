/**
 * User management service – wraps all /api/users endpoints.
 * Uses the shared httpClient (which handles tokens + refresh).
 */
import httpClient from "../lib/httpClient";
import type { ApiResponse } from "./authService";

// ── Types ──────────────────────────────────────────────────────

export interface UserAddress {
  _id: string;
  type: "home" | "work" | "other";
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates: { latitude: number; longitude: number };
  isDefault: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  orderUpdates: boolean;
  promotions: boolean;
}

export interface CustomerProfile {
  _id: string;
  userId: string;
  dietaryPreferences: string[];
  favoriteRestaurants: string[];
  loyaltyPoints: number;
  tier: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  notifications: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  profileImage?: string;
  coverImage?: string;
  coverImagePosition?: number;
  dateOfBirth?: string;
  addresses: UserAddress[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetProfileData {
  user: UserProfile;
  customerProfile: CustomerProfile | null;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profileImage?: string;
  dateOfBirth?: string;
}

export interface AddAddressPayload {
  type: "home" | "work" | "other";
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates: { latitude: number; longitude: number };
  isDefault?: boolean;
}

export interface UpdatePreferencesPayload {
  dietaryPreferences?: string[];
  notifications?: Partial<NotificationPreferences>;
}

// ── Helper ─────────────────────────────────────────────────────

const extractError = (error: unknown): ApiResponse => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosErr = error as { response?: { data?: ApiResponse } };
    if (axiosErr.response?.data) return axiosErr.response.data;
  }
  if (typeof error === "object" && error !== null && "request" in error) {
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
  return { success: false, message: "An unexpected error occurred." };
};

// ── Service ────────────────────────────────────────────────────

const userService = {
  /** GET /api/users/me – Fetch authenticated user profile */
  async getProfile(): Promise<ApiResponse<GetProfileData>> {
    try {
      const response =
        await httpClient.get<ApiResponse<GetProfileData>>("/api/users/me");
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<GetProfileData>;
    }
  },

  /** PUT /api/users/me – Update profile fields */
  async updateProfile(
    payload: UpdateProfilePayload,
  ): Promise<ApiResponse<{ user: UserProfile }>> {
    try {
      const response = await httpClient.put<ApiResponse<{ user: UserProfile }>>(
        "/api/users/me",
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ user: UserProfile }>;
    }
  },

  // ── Addresses ──────────────────────────────────────────────

  /** POST /api/users/me/addresses – Add a new address */
  async addAddress(
    payload: AddAddressPayload,
  ): Promise<ApiResponse<{ address: UserAddress }>> {
    try {
      const response = await httpClient.post<
        ApiResponse<{ address: UserAddress }>
      >("/api/users/me/addresses", payload);
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ address: UserAddress }>;
    }
  },

  /** PUT /api/users/me/addresses/:addressId – Update an address */
  async updateAddress(
    addressId: string,
    payload: Partial<AddAddressPayload>,
  ): Promise<ApiResponse<{ address: UserAddress }>> {
    try {
      const response = await httpClient.put<
        ApiResponse<{ address: UserAddress }>
      >(`/api/users/me/addresses/${addressId}`, payload);
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ address: UserAddress }>;
    }
  },

  /** DELETE /api/users/me/addresses/:addressId – Delete an address */
  async deleteAddress(addressId: string): Promise<ApiResponse> {
    try {
      const response = await httpClient.delete<ApiResponse>(
        `/api/users/me/addresses/${addressId}`,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  /** PATCH /api/users/me/addresses/:addressId/set-default */
  async setDefaultAddress(
    addressId: string,
  ): Promise<ApiResponse<{ address: UserAddress }>> {
    try {
      const response = await httpClient.patch<
        ApiResponse<{ address: UserAddress }>
      >(`/api/users/me/addresses/${addressId}/set-default`);
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ address: UserAddress }>;
    }
  },

  // ── Preferences ────────────────────────────────────────────

  /** PUT /api/users/me/preferences – Update dietary & notification prefs */
  async updatePreferences(
    payload: UpdatePreferencesPayload,
  ): Promise<ApiResponse> {
    try {
      const response = await httpClient.put<ApiResponse>(
        "/api/users/me/preferences",
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  // ── Favorites ──────────────────────────────────────────────

  /** GET /api/users/me/favorites */
  async getFavorites(): Promise<ApiResponse<{ favorites: unknown[] }>> {
    try {
      const response = await httpClient.get<
        ApiResponse<{ favorites: unknown[] }>
      >("/api/users/me/favorites");
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ favorites: unknown[] }>;
    }
  },

  /** POST /api/users/me/favorites/:restaurantId */
  async addFavorite(restaurantId: string): Promise<ApiResponse> {
    try {
      const response = await httpClient.post<ApiResponse>(
        `/api/users/me/favorites/${restaurantId}`,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  /** DELETE /api/users/me/favorites/:restaurantId */
  async removeFavorite(restaurantId: string): Promise<ApiResponse> {
    try {
      const response = await httpClient.delete<ApiResponse>(
        `/api/users/me/favorites/${restaurantId}`,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  // ── Account ────────────────────────────────────────────────

  /** DELETE /api/users/me – Deactivate account (requires password) */
  async deactivateAccount(password: string): Promise<ApiResponse> {
    try {
      const response = await httpClient.delete<ApiResponse>("/api/users/me", {
        data: { password },
      });
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  // ── Photo uploads ──────────────────────────────────────────

  /** POST /api/users/me/profile-photo – Upload profile photo */
  async uploadProfilePhoto(
    file: File,
  ): Promise<ApiResponse<{ profileImage: string }>> {
    try {
      const formData = new FormData();
      formData.append("profilePhoto", file);
      const response = await httpClient.post<
        ApiResponse<{ profileImage: string }>
      >("/api/users/me/profile-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ profileImage: string }>;
    }
  },

  /** DELETE /api/users/me/profile-photo – Remove profile photo */
  async deleteProfilePhoto(): Promise<ApiResponse> {
    try {
      const response = await httpClient.delete<ApiResponse>(
        "/api/users/me/profile-photo",
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  /** POST /api/users/me/cover-photo – Upload cover photo */
  async uploadCoverPhoto(
    file: File,
  ): Promise<ApiResponse<{ coverImage: string }>> {
    try {
      const formData = new FormData();
      formData.append("coverPhoto", file);
      const response = await httpClient.post<
        ApiResponse<{ coverImage: string }>
      >("/api/users/me/cover-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ coverImage: string }>;
    }
  },

  /** DELETE /api/users/me/cover-photo – Remove cover photo */
  async deleteCoverPhoto(): Promise<ApiResponse> {
    try {
      const response = await httpClient.delete<ApiResponse>(
        "/api/users/me/cover-photo",
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  /** PATCH /api/users/me/cover-photo/position – Update cover photo vertical position */
  async updateCoverPhotoPosition(
    position: number,
  ): Promise<ApiResponse<{ coverImagePosition: number }>> {
    try {
      const response = await httpClient.patch<
        ApiResponse<{ coverImagePosition: number }>
      >("/api/users/me/cover-photo/position", { position });
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        coverImagePosition: number;
      }>;
    }
  },
};

export default userService;
