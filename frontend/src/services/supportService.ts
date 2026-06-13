import httpClient from "@/lib/httpClient";
import type { ApiResponse } from "@/services/authService";
import type {
  AddMessagePayload,
  CreateTicketPayload,
  SupportTicket,
  TicketAdminListResponse,
  TicketListResponse,
  UpdateTicketPayload,
} from "@/types/support";

const extractError = (error: unknown): ApiResponse => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosErr = error as { response?: { data?: ApiResponse } };
    if (axiosErr.response?.data) return axiosErr.response.data;
  }
  if (typeof error === "object" && error !== null && "request" in error) {
    return { success: false, message: "Network error. Please check your connection." };
  }
  return { success: false, message: "An unexpected error occurred." };
};

const supportService = {
  /** POST /api/support/tickets */
  async createTicket(
    payload: CreateTicketPayload,
  ): Promise<ApiResponse<{ ticket: SupportTicket }>> {
    try {
      const res = await httpClient.post<ApiResponse<{ ticket: SupportTicket }>>(
        "/api/support/tickets",
        payload,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ ticket: SupportTicket }>;
    }
  },

  /** GET /api/support/tickets */
  async getMyTickets(): Promise<ApiResponse<TicketListResponse>> {
    try {
      const res = await httpClient.get<ApiResponse<TicketListResponse>>(
        "/api/support/tickets",
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<TicketListResponse>;
    }
  },

  /** GET /api/support/tickets/:ticketId */
  async getMyTicket(
    ticketId: string,
  ): Promise<ApiResponse<{ ticket: SupportTicket }>> {
    try {
      const res = await httpClient.get<ApiResponse<{ ticket: SupportTicket }>>(
        `/api/support/tickets/${ticketId}`,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ ticket: SupportTicket }>;
    }
  },

  /** POST /api/support/tickets/:ticketId/messages */
  async addMessage(
    ticketId: string,
    payload: AddMessagePayload,
  ): Promise<ApiResponse<{ ticket: SupportTicket }>> {
    try {
      const res = await httpClient.post<ApiResponse<{ ticket: SupportTicket }>>(
        `/api/support/tickets/${ticketId}/messages`,
        payload,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ ticket: SupportTicket }>;
    }
  },

  /** GET /api/admin/tickets */
  async getAllTickets(params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
  }): Promise<ApiResponse<TicketAdminListResponse>> {
    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.status) searchParams.set("status", params.status);
      if (params.priority) searchParams.set("priority", params.priority);
      const res = await httpClient.get<ApiResponse<TicketAdminListResponse>>(
        `/api/admin/tickets?${searchParams}`,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<TicketAdminListResponse>;
    }
  },

  /** GET /api/admin/tickets/:ticketId */
  async getTicketDetail(
    ticketId: string,
  ): Promise<ApiResponse<{ ticket: SupportTicket }>> {
    try {
      const res = await httpClient.get<ApiResponse<{ ticket: SupportTicket }>>(
        `/api/admin/tickets/${ticketId}`,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ ticket: SupportTicket }>;
    }
  },

  /** PATCH /api/admin/tickets/:ticketId */
  async updateTicket(
    ticketId: string,
    payload: UpdateTicketPayload,
  ): Promise<ApiResponse<{ ticket: SupportTicket }>> {
    try {
      const res = await httpClient.patch<ApiResponse<{ ticket: SupportTicket }>>(
        `/api/admin/tickets/${ticketId}`,
        payload,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ ticket: SupportTicket }>;
    }
  },

  /** POST /api/admin/tickets/:ticketId/messages */
  async adminReply(
    ticketId: string,
    payload: AddMessagePayload,
  ): Promise<ApiResponse<{ ticket: SupportTicket }>> {
    try {
      const res = await httpClient.post<ApiResponse<{ ticket: SupportTicket }>>(
        `/api/admin/tickets/${ticketId}/messages`,
        payload,
      );
      return res.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ ticket: SupportTicket }>;
    }
  },
};

export default supportService;
