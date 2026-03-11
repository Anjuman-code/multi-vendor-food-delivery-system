/**
 * Notification service – wraps /api/notifications endpoints.
 */
import httpClient from "../lib/httpClient";
import type { ApiResponse } from "./authService";
import type { AppNotification } from "../types/notification";

interface NotificationListData {
  notifications: AppNotification[];
  unreadCount: number;
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

const notificationService = {
  /** GET /api/notifications */
  async getNotifications(
    page = 1,
    limit = 20,
  ): Promise<ApiResponse<NotificationListData>> {
    try {
      const response = await httpClient.get<ApiResponse<NotificationListData>>(
        `/api/notifications?page=${page}&limit=${limit}`,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<NotificationListData>;
    }
  },

  /** GET /api/notifications/unread-count */
  async getUnreadCount(): Promise<ApiResponse<{ unreadCount: number }>> {
    try {
      const response = await httpClient.get<
        ApiResponse<{ unreadCount: number }>
      >("/api/notifications/unread-count");
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ unreadCount: number }>;
    }
  },

  /** PATCH /api/notifications/:id/read */
  async markAsRead(
    notificationId: string,
  ): Promise<ApiResponse<{ notification: AppNotification }>> {
    try {
      const response = await httpClient.patch<
        ApiResponse<{ notification: AppNotification }>
      >(`/api/notifications/${notificationId}/read`);
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{
        notification: AppNotification;
      }>;
    }
  },

  /** PATCH /api/notifications/read-all */
  async markAllAsRead(): Promise<ApiResponse> {
    try {
      const response = await httpClient.patch<ApiResponse>(
        "/api/notifications/read-all",
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },
};

export default notificationService;
