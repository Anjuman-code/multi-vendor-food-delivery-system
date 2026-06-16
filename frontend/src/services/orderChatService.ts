/**
 * Order live service — wraps the multi-role /api/orders/:id chat + ETA endpoints.
 */
import httpClient from '@/lib/httpClient';
import type { ApiResponse } from '@/services/authService';
import type { MessageChannel, OrderMessage } from '@/types/order';

const extractError = (error: unknown): ApiResponse => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosErr = error as { response?: { data?: ApiResponse } };
    if (axiosErr.response?.data) return axiosErr.response.data;
  }
  if (typeof error === 'object' && error !== null && 'request' in error) {
    return {
      success: false,
      message: 'Network error. Please check your connection.',
    };
  }
  return { success: false, message: 'An unexpected error occurred.' };
};

const orderChatService = {
  /** GET /api/orders/:orderId/messages?channel= */
  async list(
    orderId: string,
    channel: MessageChannel,
  ): Promise<ApiResponse<{ messages: OrderMessage[] }>> {
    try {
      const res = await httpClient.get<ApiResponse<{ messages: OrderMessage[] }>>(
        `/api/orders/${orderId}/messages`,
        { params: { channel } },
      );
      return res.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{ messages: OrderMessage[] }>;
    }
  },

  /** POST /api/orders/:orderId/messages */
  async send(
    orderId: string,
    channel: MessageChannel,
    text: string,
    attachments: string[] = [],
  ): Promise<ApiResponse<{ message: OrderMessage }>> {
    try {
      const res = await httpClient.post<ApiResponse<{ message: OrderMessage }>>(
        `/api/orders/${orderId}/messages`,
        { channel, text, attachments },
      );
      return res.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{ message: OrderMessage }>;
    }
  },

  /** PATCH /api/orders/:orderId/messages/read */
  async markRead(
    orderId: string,
    channel: MessageChannel,
  ): Promise<ApiResponse<{ ok: boolean }>> {
    try {
      const res = await httpClient.patch<ApiResponse<{ ok: boolean }>>(
        `/api/orders/${orderId}/messages/read`,
        { channel },
      );
      return res.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{ ok: boolean }>;
    }
  },

  /** PATCH /api/orders/:orderId/eta */
  async updateEta(
    orderId: string,
    etaMinutes: number,
  ): Promise<ApiResponse<{ etaMinutes: number }>> {
    try {
      const res = await httpClient.patch<ApiResponse<{ etaMinutes: number }>>(
        `/api/orders/${orderId}/eta`,
        { etaMinutes },
      );
      return res.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{ etaMinutes: number }>;
    }
  },
};

export default orderChatService;
