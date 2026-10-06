import httpClient from "@/lib/httpClient";
import type { ApiResponse } from "@/services/authService";
import type { Order } from "@/types/order";

export interface ProcessPaymentPayload {
  orderId: string;
  method: "bkash" | "nagad" | "card";
  walletNumber?: string;
  otp?: string;
  pin?: string;
  cardNumber?: string;
  cardHolder?: string;
  expiry?: string;
  cvv?: string;
}

export interface ProcessPaymentResponse {
  order: Order;
  transactionId: string;
  paymentMethod: string;
  paidAt: string;
  alreadyPaid?: boolean;
}

export interface VerifyPaymentResponse {
  transactionId: string;
  valid: boolean;
  order: Order;
}

const extractError = (error: unknown): ApiResponse => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosErr = error as { response?: { data?: ApiResponse } };
    if (axiosErr.response?.data) return axiosErr.response.data;
  }
  return { success: false, message: "Payment processing failed. Please try again." };
};

const paymentService = {
  async processPayment(
    payload: ProcessPaymentPayload,
  ): Promise<ApiResponse<ProcessPaymentResponse>> {
    try {
      const response = await httpClient.post<ApiResponse<ProcessPaymentResponse>>(
        "/api/payments/process",
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<ProcessPaymentResponse>;
    }
  },

  async verifyPayment(
    transactionId: string,
  ): Promise<ApiResponse<VerifyPaymentResponse>> {
    try {
      const response = await httpClient.get<ApiResponse<VerifyPaymentResponse>>(
        `/api/payments/verify/${transactionId}`,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<VerifyPaymentResponse>;
    }
  },
};

export default paymentService;
