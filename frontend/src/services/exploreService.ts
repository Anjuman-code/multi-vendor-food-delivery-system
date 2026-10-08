/**
 * Explore service – wraps discovery endpoints for global menu browsing, search, and filtering.
 */
import httpClient from "@/lib/httpClient";
import type { ApiResponse } from "@/services/authService";

export interface ExploreMenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image?: string;
  categoryId: string;
  categoryName: string;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  isAvailable: boolean;
  stockStatus: "available" | "out_of_stock" | "hidden";
  dietaryTags: string[];
  preparationTime: number;
  rating: number;
  reviewCount: number;
  isPopular: boolean;
  isFeatured: boolean;
  spiceLevel: string;
  isOpen: boolean;
  isTemporarilyClosed: boolean;
  deliveryTime: { min: number; max: number };
  deliveryFee: number;
  variants: Array<{ _id?: string; name: string; price: number }>;
  addons: Array<{
    _id?: string;
    name: string;
    price: number;
    isRequired?: boolean;
  }>;
}

export interface ExploreCategory {
  name: string;
  itemCount: number;
  restaurantCount: number;
  image?: string;
  icon?: string;
}

export interface ExploreMenuParams {
  search?: string;
  q?: string;
  category?: string;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  openNow?: boolean;
  dietaryTags?: string[];
  restaurantIds?: string[];
  cuisines?: string[];
  sort?: "popular" | "price_asc" | "price_desc" | "rating" | "newest";
  page?: number;
  limit?: number;
}

export interface ExploreMenuResponseData {
  items: ExploreMenuItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  priceRange: { min: number; max: number };
}

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

const exploreService = {
  /** GET /api/explore/categories — Get distinct categories with item counts */
  async getCategories(
    signal?: AbortSignal,
  ): Promise<ApiResponse<{ categories: ExploreCategory[] }>> {
    try {
      const response = await httpClient.get<
        ApiResponse<{ categories: ExploreCategory[] }>
      >("/api/explore/categories", { signal });
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        categories: ExploreCategory[];
      }>;
    }
  },

  /** GET /api/explore/menu-items — Search and filter global food items */
  async getMenuItems(
    params: ExploreMenuParams = {},
    signal?: AbortSignal,
  ): Promise<ApiResponse<ExploreMenuResponseData>> {
    try {
      const queryParams = new URLSearchParams();

      if (params.search || params.q) {
        queryParams.set("search", params.search || params.q || "");
      }
      if (params.categories && params.categories.length > 0) {
        queryParams.set("categories", params.categories.join(","));
      } else if (params.category) {
        queryParams.set("category", params.category);
      }
      if (typeof params.minPrice === "number" && !Number.isNaN(params.minPrice)) {
        queryParams.set("minPrice", String(params.minPrice));
      }
      if (typeof params.maxPrice === "number" && !Number.isNaN(params.maxPrice)) {
        queryParams.set("maxPrice", String(params.maxPrice));
      }
      if (
        typeof params.minRating === "number" &&
        !Number.isNaN(params.minRating) &&
        params.minRating > 0
      ) {
        queryParams.set("minRating", String(params.minRating));
      }
      if (params.openNow) {
        queryParams.set("openNow", "true");
      }
      if (params.dietaryTags && params.dietaryTags.length > 0) {
        queryParams.set("dietaryTags", params.dietaryTags.join(","));
      }
      if (params.restaurantIds && params.restaurantIds.length > 0) {
        queryParams.set("restaurantIds", params.restaurantIds.join(","));
      }
      if (params.cuisines && params.cuisines.length > 0) {
        queryParams.set("cuisines", params.cuisines.join(","));
      }
      if (params.sort) {
        queryParams.set("sort", params.sort);
      }
      if (params.page) {
        queryParams.set("page", String(params.page));
      }
      if (params.limit) {
        queryParams.set("limit", String(params.limit));
      }

      const queryString = queryParams.toString();
      const url = `/api/explore/menu-items${queryString ? `?${queryString}` : ""}`;

      const response = await httpClient.get<ApiResponse<ExploreMenuResponseData>>(
        url,
        { signal },
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<ExploreMenuResponseData>;
    }
  },
};

export default exploreService;
