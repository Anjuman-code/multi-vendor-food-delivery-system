/**
 * Home service – fetches data for discovery sections.
 */
import httpClient from "../lib/httpClient";
import type { ApiResponse } from "./authService";
import type {
  TopCategory,
  TrendingItem,
  PopularRestaurant,
} from "../types/home";

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
};

export default homeService;
