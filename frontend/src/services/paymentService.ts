import httpClient from "@/lib/httpClient";
import type { ApiResponse } from "@/services/authService";
import type { Order } from "@/types/order";
import type { SupportedPaymentMethod } from "@/utils/paymentUtils";

export type PaymentPurpose = "order_payment" | "wallet_topup" | "cod_remittance" | "tip";

export interface CardDetailsPayload {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
  saveCard?: boolean;
}

export interface WalletDetailsPayload {
  walletNumber: string;
  pin?: string;
}

export interface InitiatePaymentPayload {
  orderId?: string;
  purpose?: PaymentPurpose;
  amount?: number;
  method: SupportedPaymentMethod;
  cardDetails?: CardDetailsPayload;
  walletDetails?: WalletDetailsPayload;
  paymentToken?: string;
}

export interface PaymentSessionResponse {
  sessionId: string;
  status: "pending" | "otp_required" | "processing" | "success" | "failed";
  requiresOtp: boolean;
  orderId?: string;
  purpose: PaymentPurpose;
  amount: number;
  currency: string;
  method: SupportedPaymentMethod;
  paymentDetails?: {
    brand?: string;
    last4?: string;
    walletNumber?: string;
  };
  expiresAt: string;
  transactionId?: string;
  alreadyPaid?: boolean;
  order?: Order;
  // Dev-only helper returned for test verification
  devOtpCode?: string;
  devOtpNotice?: string;
}

export interface VerifyOtpResponse {
  sessionId: string;
  status: "processing" | "success" | "failed";
  transactionId?: string;
  message?: string;
  order?: Order;
}

export interface WalletTransactionItem {
  _id: string;
  type: "topup" | "order_payment" | "refund" | "cashback" | "adjustment";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  orderId?: string;
  transactionId?: string;
  description: string;
  createdAt: string;
}

export interface CustomerWalletData {
  walletBalance: number;
  currency: string;
  transactions: WalletTransactionItem[];
}

export interface AvailablePaymentMethodsConfig {
  cardsEnabled: boolean;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  rocketEnabled: boolean;
  upayEnabled: boolean;
  codEnabled: boolean;
  walletEnabled: boolean;
  sandboxMode: boolean;
  currency: string;
}

export interface PayoutItem {
  _id: string;
  recipientRole: "vendor" | "driver";
  vendorId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  driverId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  method: "bank_transfer" | "mobile_money";
  bankSnapshot?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    mobileMoneyNumber?: string;
    mobileMoneyProvider?: string;
  };
  transactionRef?: string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
}

export interface CodReconciliationData {
  summary: {
    totalOrders: number;
    totalCollected: number;
    totalRemitted: number;
    outstandingCod: number;
  };
  codOrders: Array<{
    _id: string;
    orderNumber: string;
    total: number;
    codCollected: boolean;
    codRemitted: boolean;
    actualDeliveryTime?: string;
    createdAt: string;
    driverId?: {
      _id: string;
      firstName: string;
      lastName: string;
      phone?: string;
    };
  }>;
  remittances: Array<{
    _id: string;
    transactionId: string;
    amount: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
    payerId?: {
      _id: string;
      firstName: string;
      lastName: string;
      phone?: string;
    };
  }>;
}

// Legacy process payment payload
export interface ProcessPaymentPayload {
  orderId: string;
  method: string;
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

const extractError = (error: unknown, fallbackMessage: string): ApiResponse<any> => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosErr = error as { response?: { data?: ApiResponse<any> } };
    if (axiosErr.response?.data) return axiosErr.response.data;
  }
  return { success: false, message: fallbackMessage };
};

const paymentService = {
  // ── Unified Gateway Endpoints ─────────────────────────────────

  /**
   * Initiate a payment session (for checkout, order retry, wallet topup, COD remittance)
   */
  async initiateSession(
    payload: InitiatePaymentPayload,
  ): Promise<ApiResponse<PaymentSessionResponse>> {
    try {
      const response = await httpClient.post<ApiResponse<PaymentSessionResponse>>(
        "/api/payments/session/initiate",
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error, "Failed to initiate payment session");
    }
  },

  /**
   * Verify OTP for a payment session
   */
  async verifyOtp(
    sessionId: string,
    otp: string,
  ): Promise<ApiResponse<VerifyOtpResponse>> {
    try {
      const response = await httpClient.post<ApiResponse<VerifyOtpResponse>>(
        "/api/payments/session/verify-otp",
        { sessionId, otp },
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error, "Failed to verify OTP code");
    }
  },

  /**
   * Resend OTP for a payment session
   */
  async resendOtp(
    sessionId: string,
  ): Promise<ApiResponse<{ sessionId: string; resendCooldown: number; devOtpCode?: string }>> {
    try {
      const response = await httpClient.post<
        ApiResponse<{ sessionId: string; resendCooldown: number; devOtpCode?: string }>
      >("/api/payments/session/resend-otp", { sessionId });
      return response.data;
    } catch (error: unknown) {
      return extractError(error, "Failed to resend OTP");
    }
  },

  /**
   * Confirm a payment session (for direct/COD/Wallet without OTP)
   */
  async confirmPayment(
    sessionId: string,
  ): Promise<ApiResponse<VerifyOtpResponse>> {
    try {
      const response = await httpClient.post<ApiResponse<VerifyOtpResponse>>(
        "/api/payments/session/confirm",
        { sessionId },
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error, "Failed to confirm payment");
    }
  },

  /**
   * Fetch customer wallet balance and transaction ledger
   */
  async getCustomerWallet(): Promise<ApiResponse<CustomerWalletData>> {
    try {
      const response = await httpClient.get<ApiResponse<CustomerWalletData>>(
        "/api/payments/wallet",
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error, "Failed to fetch wallet information");
    }
  },

  /**
   * Top-up customer wallet
   */
  async topUpWallet(
    payload: InitiatePaymentPayload,
  ): Promise<ApiResponse<PaymentSessionResponse>> {
    return this.initiateSession({
      ...payload,
      purpose: "wallet_topup",
    });
  },

  /**
   * Rider remits physical cash collected from COD deliveries
   */
  async remitDriverCodCash(payload: {
    amount: number;
    method: SupportedPaymentMethod;
    cardDetails?: CardDetailsPayload;
    walletDetails?: WalletDetailsPayload;
  }): Promise<ApiResponse<PaymentSessionResponse>> {
    try {
      const response = await httpClient.post<ApiResponse<PaymentSessionResponse>>(
        "/api/payments/driver/cod-remit",
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error, "Failed to initiate remittance");
    }
  },

  /**
   * Available payment methods and settings
   */
  async getAvailablePaymentMethods(): Promise<
    ApiResponse<{ settings: AvailablePaymentMethodsConfig }>
  > {
    try {
      const response = await httpClient.get<
        ApiResponse<{ settings: AvailablePaymentMethodsConfig }>
      >("/api/payments/methods");
      return response.data;
    } catch (error: unknown) {
      return extractError(error, "Failed to fetch payment methods");
    }
  },

  // ── Payouts (Vendor & Driver) ─────────────────────────────────

  async getVendorPayouts(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<
    ApiResponse<{
      payouts: PayoutItem[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>
  > {
    try {
      const response = await httpClient.get("/api/vendor/payouts", { params });
      return response.data;
    } catch (error: unknown) {
      return extractError(error, "Failed to fetch vendor payouts");
    }
  },

  async requestVendorPayout(payload: {
    amount: number;
    method: "bank_transfer" | "mobile_money";
    notes?: string;
  }): Promise<ApiResponse<{ payout: PayoutItem; availableBalance: number }>> {
    try {
      const response = await httpClient.post(
        "/api/vendor/payouts/request",
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error, "Failed to submit withdrawal request");
    }
  },

  async getDriverPayouts(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<
    ApiResponse<{
      payouts: PayoutItem[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>
  > {
    try {
      const response = await httpClient.get("/api/driver/payouts", { params });
      return response.data;
    } catch (error: unknown) {
      return extractError(error, "Failed to fetch rider payouts");
    }
  },

  async requestDriverPayout(payload: {
    amount: number;
    method: "bank_transfer" | "mobile_money";
    notes?: string;
  }): Promise<ApiResponse<{ payout: PayoutItem; availableBalance: number }>> {
    try {
      const response = await httpClient.post(
        "/api/driver/payouts/request",
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error, "Failed to submit cashout request");
    }
  },

  async getCodReconciliation(): Promise<ApiResponse<CodReconciliationData>> {
    try {
      const response = await httpClient.get("/api/admin/finance/cod-reconciliation");
      return response.data;
    } catch (error: unknown) {
      return extractError(error, "Failed to fetch COD reconciliation data");
    }
  },

  // ── Legacy Compatibility ──────────────────────────────────────

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
      return extractError(error, "Payment processing failed");
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
      return extractError(error, "Failed to verify transaction");
    }
  },
};

export default paymentService;
