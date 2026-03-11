/**
 * Menu service – wraps /api/restaurants/:id/menu endpoints.
 */
import httpClient from "../lib/httpClient";
import type { ApiResponse } from "./authService";
import type { MenuItem, MenuCategory } from "../types/menu";

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

const menuService = {
  /** GET /api/restaurants/:restaurantId/menu */
  async getMenu(
    restaurantId: string,
  ): Promise<ApiResponse<{ categories: MenuCategory[]; items: MenuItem[] }>> {
    try {
      const response = await httpClient.get<
        ApiResponse<{ categories: MenuCategory[]; items: MenuItem[] }>
      >(`/api/restaurants/${restaurantId}/menu`);
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        categories: MenuCategory[];
        items: MenuItem[];
      }>;
    }
  },

  /** GET /api/restaurants/:restaurantId/menu/:itemId */
  async getMenuItem(
    restaurantId: string,
    itemId: string,
  ): Promise<ApiResponse<{ item: MenuItem }>> {
    try {
      const response = await httpClient.get<ApiResponse<{ item: MenuItem }>>(
        `/api/restaurants/${restaurantId}/menu/${itemId}`,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ item: MenuItem }>;
    }
  },
};

export default menuService;
