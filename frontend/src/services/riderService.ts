/**
 * Rider service — wraps all /api/driver/* endpoints.
 */
import httpClient from "@/lib/httpClient";

// ── Types ─────────────────────────────────────────────────────────

export interface DriverProfile {
  _id: string;
  userId: string;
  licenseNumber: string;
  vehicleType: string;
  vehicleNumber: string;
  applicationStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  isAvailable: boolean;
  currentLocation?: { latitude: number; longitude: number };
  rating: { average: number; count: number };
  totalDeliveries: number;
  totalEarnings: number;
  onboardingCompleted: boolean;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    mobileMoneyNumber?: string;
    mobileMoneyProvider?: string;
  };
  documents?: {
    licensePhoto?: string;
    vehicleRegistrationPhoto?: string;
    insurancePhoto?: string;
  };
}

export interface RiderOrder {
  _id: string;
  orderNumber: string;
  restaurantId: { _id: string; name: string; address?: Record<string, unknown> };
  customerId: { _id: string; firstName: string; lastName: string; phoneNumber?: string };
  deliveryAddress: {
    area?: string;
    district?: string;
    fullAddress?: string;
    coordinates?: { lat: number; lng: number };
  };
  items: { name: string; quantity: number }[];
  deliveryFee: number;
  tipAmount?: number;
  total: number;
  status: string;
  driverId?: string;
  actualDeliveryTime?: string;
  createdAt: string;
}

export interface EarningsPeriod {
  earnings: number;
  deliveries: number;
  fees: number;
  tips: number;
}

export interface EarningsData {
  today: EarningsPeriod;
  thisWeek: EarningsPeriod;
  thisMonth: EarningsPeriod;
  allTime: { earnings: number; deliveries: number };
  weeklyBreakdown: { date: string; earnings: number; deliveries: number }[];
  recentDeliveries: RiderOrder[];
}

// ── Service ────────────────────────────────────────────────────────

const riderService = {
  // Profile
  getProfile: () => httpClient.get<{ profile: DriverProfile }>("/api/driver/profile"),
  updateProfile: (data: Partial<DriverProfile>) =>
    httpClient.patch<{ profile: DriverProfile }>("/api/driver/profile", data),
  setAvailability: (isAvailable: boolean) =>
    httpClient.patch<{ isAvailable: boolean }>("/api/driver/availability", { isAvailable }),
  completeOnboarding: () =>
    httpClient.patch<{ profile: DriverProfile }>("/api/driver/onboarding", {}),

  // Orders
  getAvailableOrders: () =>
    httpClient.get<{ orders: RiderOrder[] }>("/api/driver/orders/available"),
  acceptOrder: (orderId: string) =>
    httpClient.post<{ order: RiderOrder }>(`/api/driver/orders/${orderId}/accept`, {}),
  getActiveDelivery: () =>
    httpClient.get<{ order: RiderOrder | null }>("/api/driver/orders/active"),
  updateDeliveryStatus: (
    orderId: string,
    data: { status: string; deliveryProof?: { photoUrl: string; note?: string } },
  ) => httpClient.patch<{ order: RiderOrder }>(`/api/driver/orders/${orderId}/status`, data),

  // Location
  sendLocation: (data: {
    orderId: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    batteryLevel?: number;
  }) => httpClient.post("/api/driver/location", data),

  // Earnings & history
  getEarnings: () => httpClient.get<EarningsData>("/api/driver/earnings"),
  getDeliveryHistory: (params?: { page?: number; limit?: number }) =>
    httpClient.get<{ deliveries: RiderOrder[]; pagination: unknown }>("/api/driver/deliveries", { params }),

  // Rating (customer submits)
  submitRating: (data: { orderId: string; rating: number; comment?: string }) =>
    httpClient.post("/api/driver/ratings", data),
};

export default riderService;
