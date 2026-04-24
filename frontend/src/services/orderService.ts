/**
 * Order service – wraps all /api/orders endpoints.
 */
import httpClient from "../lib/httpClient";
import type { ApiResponse } from "./authService";
import type { Order, CreateOrderPayload } from "../types/order";

interface OrderListData {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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

const orderService = {
  /** POST /api/orders – Place a new order */
  async createOrder(
    payload: CreateOrderPayload,
  ): Promise<ApiResponse<{ order: Order }>> {
    try {
      const response = await httpClient.post<ApiResponse<{ order: Order }>>(
        "/api/orders",
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ order: Order }>;
    }
  },

  /** GET /api/orders – List orders */
  async getOrders(
    page = 1,
    limit = 10,
    status?: string,
  ): Promise<ApiResponse<OrderListData>> {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) params.set("status", status);
      const response = await httpClient.get<ApiResponse<OrderListData>>(
        `/api/orders?${params}`,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<OrderListData>;
    }
  },

  /** GET /api/orders/:orderId – Get order details */
  async getOrderById(orderId: string): Promise<ApiResponse<{ order: Order }>> {
    try {
      const response = await httpClient.get<ApiResponse<{ order: Order }>>(
        `/api/orders/${orderId}`,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ order: Order }>;
    }
  },

  /** PATCH /api/orders/:orderId/cancel – Cancel an order */
  async cancelOrder(
    orderId: string,
    reason?: string,
  ): Promise<ApiResponse<{ order: Order }>> {
    try {
      const response = await httpClient.patch<ApiResponse<{ order: Order }>>(
        `/api/orders/${orderId}/cancel`,
        { reason },
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ order: Order }>;
    }
  },

  /** POST /api/orders/:orderId/reorder – Get items for reorder */
  async reorder(orderId: string): Promise<
    ApiResponse<{
      restaurantId: string;
      hasUnavailableItems?: boolean;
      items: {
        menuItemId: string;
        name: string;
        price: number;
        image?: string;
        quantity: number;
        variants?: { optionId?: string; name: string; price: number }[];
        addons?: { optionId?: string; name: string; price: number }[];
        isAvailable: boolean;
        unavailableReason?: string;
      }[];
    }>
  > {
    try {
      const response = await httpClient.post<
        ApiResponse<{
          restaurantId: string;
          hasUnavailableItems?: boolean;
          items: {
            menuItemId: string;
            name: string;
            price: number;
            image?: string;
            quantity: number;
            variants?: { optionId?: string; name: string; price: number }[];
            addons?: { optionId?: string; name: string; price: number }[];
            isAvailable: boolean;
            unavailableReason?: string;
          }[];
        }>
      >(`/api/orders/${orderId}/reorder`);
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        restaurantId: string;
        hasUnavailableItems?: boolean;
        items: {
          menuItemId: string;
          name: string;
          price: number;
          image?: string;
          quantity: number;
          variants?: { optionId?: string; name: string; price: number }[];
          addons?: { optionId?: string; name: string; price: number }[];
          isAvailable: boolean;
          unavailableReason?: string;
        }[];
      }>;
    }
  },
};

export default orderService;
