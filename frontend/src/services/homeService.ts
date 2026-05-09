/**
 * Home service – fetches data for discovery sections.
 */
import httpClient from "@/lib/httpClient";
import type { ApiResponse } from "@/services/authService";
import type {
  TopCategory,
  TrendingItem,
  PopularRestaurant,
} from "@/types/home";

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

export interface MenuItemByCategory {
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
  isAvailable: boolean;
  dietaryTags: string[];
  preparationTime: number;
  rating?: number;
  reviewCount?: number;
  isPopular: boolean;
}

const homeService = {
  async getTopCategories(
    limit = 8,
  ): Promise<ApiResponse<{ categories: TopCategory[] }>> {
    try {
      const response = await httpClient.get<
        ApiResponse<{ categories: TopCategory[] }>
      >(`/api/explore/top-categories?limit=${limit}`);
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ categories: TopCategory[] }>;
    }
  },

  async getTrendingItems(
    limit = 6,
  ): Promise<ApiResponse<{ items: TrendingItem[] }>> {
    try {
      const response = await httpClient.get<
        ApiResponse<{ items: TrendingItem[] }>
      >(`/api/explore/trending-items?limit=${limit}`);
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ items: TrendingItem[] }>;
    }
  },

  async getPopularRestaurants(
    limit = 6,
  ): Promise<ApiResponse<{ restaurants: PopularRestaurant[] }>> {
    try {
      const response = await httpClient.get<
        ApiResponse<{ restaurants: PopularRestaurant[] }>
      >(`/api/explore/popular-restaurants?limit=${limit}`);
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        restaurants: PopularRestaurant[];
      }>;
    }
  },

  async getMenuItemsByCategory(
    category: string,
    limit = 50,
    offset = 0,
  ): Promise<ApiResponse<{ items: MenuItemByCategory[]; categories: TopCategory[] }>> {
    try {
      const response = await httpClient.get<
        ApiResponse<{ items: MenuItemByCategory[]; categories: TopCategory[] }>
      >(`/api/explore/menu-items/${encodeURIComponent(category)}?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        items: MenuItemByCategory[];
        categories: TopCategory[];
      }>;
    }
  },
};

export default homeService;
