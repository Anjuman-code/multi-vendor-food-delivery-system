/**
 * Vendor service – wraps all /api/vendor/* endpoints.
 */
import httpClient from "../lib/httpClient";
import type { ApiResponse } from "./authService";
import type {
  VendorProfileData,
  VendorRestaurant,
  VendorDashboardStats,
  VendorAnalytics,
  VendorOrder,
  VendorCoupon,
  CouponStats,
  VendorReview,
  CreateRestaurantPayload,
  UpdateRestaurantPayload,
  CreateMenuItemPayload,
  UpdateMenuItemPayload,
  CreateMenuCategoryPayload,
  UpdateMenuCategoryPayload,
  CreateCouponPayload,
  UpdateCouponPayload,
  VendorOrdersParams,
} from "../types/vendor";
import type { MenuItem, MenuCategory } from "../types/menu";

const DEFAULT_RESTAURANT_IMAGES = {
  logo: "placeholder-logo",
  coverPhoto: "placeholder-cover",
  gallery: [],
};

const normalizeRestaurantPayload = (
  data: CreateRestaurantPayload | UpdateRestaurantPayload,
  forCreate: boolean,
): CreateRestaurantPayload | UpdateRestaurantPayload => {
  const normalized: CreateRestaurantPayload | UpdateRestaurantPayload = {
    ...data,
  };

  const contactPhone = data.contactInfo?.phone ?? data.phone;
  const contactEmail = data.contactInfo?.email ?? data.email;
  const contactWebsite = data.contactInfo?.website ?? data.website;

  if (contactPhone || contactEmail || contactWebsite) {
    normalized.contactInfo = {
      phone: contactPhone ?? "",
      email: contactEmail ?? "",
      website: contactWebsite,
    };
  }

  if (forCreate) {
    normalized.images = data.images ?? DEFAULT_RESTAURANT_IMAGES;
  } else if (data.images) {
    normalized.images = data.images;
  }

  if (data.operatingHours) {
    normalized.operatingHours = data.operatingHours;
  } else if (data.openingHours) {
    normalized.operatingHours = data.openingHours.map((entry) => ({
      day: entry.day,
      openTime: entry.open,
      closeTime: entry.close,
      isOpen: !entry.isClosed,
    }));
  }

  if (!data.deliveryTime && typeof data.estimatedDeliveryTime === "number") {
    normalized.deliveryTime = `${Math.round(data.estimatedDeliveryTime)} min`;
  }

  return normalized;
};

const normalizeCouponPayload = (
  data: CreateCouponPayload | UpdateCouponPayload,
): CreateCouponPayload | UpdateCouponPayload => {
  const normalized: CreateCouponPayload | UpdateCouponPayload = {
    ...data,
  };

  if (
    data.minimumOrderAmount !== undefined &&
    data.minOrderAmount === undefined
  ) {
    normalized.minOrderAmount = data.minimumOrderAmount;
  }

  if (data.maxUses !== undefined && data.usageLimit === undefined) {
    normalized.usageLimit = data.maxUses;
  }

  if (data.startDate && !data.validFrom) {
    normalized.validFrom = data.startDate;
  }

  if (data.endDate && !data.validTo) {
    normalized.validTo = data.endDate;
  }

  return normalized;
};

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

const vendorService = {
  // ── Profile ────────────────────────────────────────────────────

  async getProfile(): Promise<ApiResponse<VendorProfileData>> {
    try {
      const res = await httpClient.get<ApiResponse<VendorProfileData>>(
        "/api/vendor/profile",
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<VendorProfileData>;
    }
  },

  async updateProfile(
    data: Record<string, unknown>,
  ): Promise<ApiResponse<{ vendorProfile: VendorProfileData }>> {
    try {
      const res = await httpClient.put<
        ApiResponse<{ vendorProfile: VendorProfileData }>
      >("/api/vendor/profile", data);
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        vendorProfile: VendorProfileData;
      }>;
    }
  },

  // ── Dashboard & Analytics ──────────────────────────────────────

  async getDashboardStats(): Promise<ApiResponse<VendorDashboardStats>> {
    try {
      const res = await httpClient.get<ApiResponse<VendorDashboardStats>>(
        "/api/vendor/dashboard",
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<VendorDashboardStats>;
    }
  },

  async getAnalytics(
    period: string = "7d",
  ): Promise<ApiResponse<VendorAnalytics>> {
    try {
      const res = await httpClient.get<ApiResponse<VendorAnalytics>>(
        `/api/vendor/analytics?period=${period}`,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<VendorAnalytics>;
    }
  },

  // ── Restaurants ────────────────────────────────────────────────

  async getRestaurants(): Promise<
    ApiResponse<{ restaurants: VendorRestaurant[]; count: number }>
  > {
    try {
      const res = await httpClient.get<
        ApiResponse<{ restaurants: VendorRestaurant[]; count: number }>
      >("/api/vendor/restaurants");
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        restaurants: VendorRestaurant[];
        count: number;
      }>;
    }
  },

  async getRestaurant(
    id: string,
  ): Promise<ApiResponse<{ restaurant: VendorRestaurant }>> {
    try {
      const res = await httpClient.get<
        ApiResponse<{ restaurant: VendorRestaurant }>
      >(`/api/vendor/restaurants/${id}`);
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        restaurant: VendorRestaurant;
      }>;
    }
  },

  async createRestaurant(
    data: CreateRestaurantPayload,
  ): Promise<ApiResponse<{ restaurant: VendorRestaurant }>> {
    try {
      const payload = normalizeRestaurantPayload(data, true);
      const res = await httpClient.post<
        ApiResponse<{ restaurant: VendorRestaurant }>
      >("/api/vendor/restaurants", payload);
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        restaurant: VendorRestaurant;
      }>;
    }
  },

  async updateRestaurant(
    id: string,
    data: UpdateRestaurantPayload,
  ): Promise<ApiResponse<{ restaurant: VendorRestaurant }>> {
    try {
      const payload = normalizeRestaurantPayload(data, false);
      const res = await httpClient.put<
        ApiResponse<{ restaurant: VendorRestaurant }>
      >(`/api/vendor/restaurants/${id}`, payload);
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        restaurant: VendorRestaurant;
      }>;
    }
  },

  async deleteRestaurant(id: string): Promise<ApiResponse> {
    try {
      const res = await httpClient.delete<ApiResponse>(
        `/api/vendor/restaurants/${id}`,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  // ── Menu Categories ────────────────────────────────────────────

  async getCategories(
    restaurantId: string,
  ): Promise<ApiResponse<{ categories: MenuCategory[] }>> {
    try {
      const res = await httpClient.get<
        ApiResponse<{ categories: MenuCategory[] }>
      >(`/api/restaurants/${restaurantId}/menu`);
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        categories: MenuCategory[];
      }>;
    }
  },

  async createCategory(
    restaurantId: string,
    data: CreateMenuCategoryPayload,
  ): Promise<ApiResponse<{ category: MenuCategory }>> {
    try {
      const res = await httpClient.post<
        ApiResponse<{ category: MenuCategory }>
      >(`/api/vendor/restaurants/${restaurantId}/menu/categories`, data);
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ category: MenuCategory }>;
    }
  },

  async updateCategory(
    restaurantId: string,
    categoryId: string,
    data: UpdateMenuCategoryPayload,
  ): Promise<ApiResponse<{ category: MenuCategory }>> {
    try {
      const res = await httpClient.put<ApiResponse<{ category: MenuCategory }>>(
        `/api/vendor/restaurants/${restaurantId}/menu/categories/${categoryId}`,
        data,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ category: MenuCategory }>;
    }
  },

  async deleteCategory(
    restaurantId: string,
    categoryId: string,
  ): Promise<ApiResponse> {
    try {
      const res = await httpClient.delete<ApiResponse>(
        `/api/vendor/restaurants/${restaurantId}/menu/categories/${categoryId}`,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  // ── Menu Items ─────────────────────────────────────────────────

  async getMenuItems(
    restaurantId: string,
  ): Promise<ApiResponse<{ categories: MenuCategory[]; items: MenuItem[] }>> {
    try {
      const res = await httpClient.get<
        ApiResponse<{ categories: MenuCategory[]; items: MenuItem[] }>
      >(`/api/restaurants/${restaurantId}/menu`);
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        categories: MenuCategory[];
        items: MenuItem[];
      }>;
    }
  },

  async createMenuItem(
    restaurantId: string,
    data: CreateMenuItemPayload,
  ): Promise<ApiResponse<{ item: MenuItem }>> {
    try {
      const res = await httpClient.post<ApiResponse<{ item: MenuItem }>>(
        `/api/vendor/restaurants/${restaurantId}/menu/items`,
        data,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ item: MenuItem }>;
    }
  },

  async updateMenuItem(
    restaurantId: string,
    itemId: string,
    data: UpdateMenuItemPayload,
  ): Promise<ApiResponse<{ item: MenuItem }>> {
    try {
      const res = await httpClient.put<ApiResponse<{ item: MenuItem }>>(
        `/api/vendor/restaurants/${restaurantId}/menu/items/${itemId}`,
        data,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ item: MenuItem }>;
    }
  },

  async deleteMenuItem(
    restaurantId: string,
    itemId: string,
  ): Promise<ApiResponse> {
    try {
      const res = await httpClient.delete<ApiResponse>(
        `/api/vendor/restaurants/${restaurantId}/menu/items/${itemId}`,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  async toggleItemAvailability(
    restaurantId: string,
    itemId: string,
  ): Promise<ApiResponse<{ item: MenuItem }>> {
    try {
      const res = await httpClient.patch<ApiResponse<{ item: MenuItem }>>(
        `/api/vendor/restaurants/${restaurantId}/menu/items/${itemId}/availability`,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ item: MenuItem }>;
    }
  },

  // ── Orders ─────────────────────────────────────────────────────

  async getOrders(params: VendorOrdersParams = {}): Promise<
    ApiResponse<{
      orders: VendorOrder[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>
  > {
    try {
      const query = new URLSearchParams();
      if (params.page) query.set("page", String(params.page));
      if (params.limit) query.set("limit", String(params.limit));
      if (params.status) query.set("status", params.status);
      if (params.dateFrom) query.set("dateFrom", params.dateFrom);
      if (params.dateTo) query.set("dateTo", params.dateTo);
      if (params.search) query.set("search", params.search);
      if (params.restaurantId) query.set("restaurantId", params.restaurantId);
      if (params.sortBy) query.set("sortBy", params.sortBy);

      const res = await httpClient.get<
        ApiResponse<{
          orders: VendorOrder[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        }>
      >(`/api/vendor/orders?${query}`);
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        orders: VendorOrder[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>;
    }
  },

  async getOrder(
    orderId: string,
  ): Promise<ApiResponse<{ order: VendorOrder }>> {
    try {
      const res = await httpClient.get<ApiResponse<{ order: VendorOrder }>>(
        `/api/vendor/orders/${orderId}`,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ order: VendorOrder }>;
    }
  },

  async updateOrderStatus(
    orderId: string,
    status: string,
    note?: string,
  ): Promise<ApiResponse<{ order: VendorOrder }>> {
    try {
      const res = await httpClient.patch<ApiResponse<{ order: VendorOrder }>>(
        `/api/vendor/orders/${orderId}/status`,
        { status, note },
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ order: VendorOrder }>;
    }
  },

  // ── Coupons ────────────────────────────────────────────────────

  async getCoupons(
    status?: string,
  ): Promise<ApiResponse<{ coupons: VendorCoupon[]; count: number }>> {
    try {
      const query = status ? `?status=${status}` : "";
      const res = await httpClient.get<
        ApiResponse<{ coupons: VendorCoupon[]; count: number }>
      >(`/api/vendor/coupons${query}`);
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        coupons: VendorCoupon[];
        count: number;
      }>;
    }
  },

  async createCoupon(
    data: CreateCouponPayload,
  ): Promise<ApiResponse<{ coupon: VendorCoupon }>> {
    try {
      const payload = normalizeCouponPayload(data);
      const res = await httpClient.post<ApiResponse<{ coupon: VendorCoupon }>>(
        "/api/vendor/coupons",
        payload,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ coupon: VendorCoupon }>;
    }
  },

  async updateCoupon(
    couponId: string,
    data: UpdateCouponPayload,
  ): Promise<ApiResponse<{ coupon: VendorCoupon }>> {
    try {
      const payload = normalizeCouponPayload(data);
      const res = await httpClient.put<ApiResponse<{ coupon: VendorCoupon }>>(
        `/api/vendor/coupons/${couponId}`,
        payload,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ coupon: VendorCoupon }>;
    }
  },

  async deleteCoupon(couponId: string): Promise<ApiResponse> {
    try {
      const res = await httpClient.delete<ApiResponse>(
        `/api/vendor/coupons/${couponId}`,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  async getCouponStats(couponId: string): Promise<ApiResponse<CouponStats>> {
    try {
      const res = await httpClient.get<ApiResponse<CouponStats>>(
        `/api/vendor/coupons/${couponId}/stats`,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<CouponStats>;
    }
  },

  // ── Reviews ────────────────────────────────────────────────────

  async getReviews(
    restaurantId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<
    ApiResponse<{
      reviews: VendorReview[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>
  > {
    try {
      const res = await httpClient.get<
        ApiResponse<{
          reviews: VendorReview[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        }>
      >(`/api/restaurants/${restaurantId}/reviews?page=${page}&limit=${limit}`);
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        reviews: VendorReview[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>;
    }
  },

  async replyToReview(
    reviewId: string,
    text: string,
  ): Promise<ApiResponse<{ review: VendorReview }>> {
    try {
      const res = await httpClient.post<ApiResponse<{ review: VendorReview }>>(
        `/api/vendor/reviews/${reviewId}/reply`,
        { text },
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ review: VendorReview }>;
    }
  },
};

export default vendorService;
