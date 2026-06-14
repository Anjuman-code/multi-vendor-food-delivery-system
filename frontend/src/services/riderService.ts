/**
 * Rider service — wraps all /api/driver/* endpoints.
 */
import httpClient from '@/lib/httpClient';

// ── Types ─────────────────────────────────────────────────────────

export interface DriverProfile {
  _id: string;
  userId: string;
  licenseNumber: string;
  vehicleType: string;
  vehicleNumber: string;
  applicationStatus: 'pending' | 'approved' | 'rejected';
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

/** Fine-grained courier progress within an active delivery. */
export type DeliveryStage =
  | 'heading_to_store'
  | 'at_store'
  | 'picked_up'
  | 'heading_to_customer'
  | 'arrived';

/** Ordered courier stages — drives the active-delivery stepper. */
export const DELIVERY_STAGE_SEQUENCE: DeliveryStage[] = [
  'heading_to_store',
  'at_store',
  'picked_up',
  'heading_to_customer',
  'arrived',
];

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RiderOrder {
  _id: string;
  orderNumber: string;
  restaurantId: {
    _id: string;
    name: string;
    address?: Record<string, unknown>;
    location?: { type?: string; coordinates?: [number, number] };
  };
  customerId: {
    _id: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  };
  deliveryAddress: {
    street?: string;
    apartment?: string;
    area?: string;
    district?: string;
    fullAddress?: string;
    coordinates?: GeoPoint;
  };
  items: { name: string; quantity: number }[];
  deliveryFee: number;
  tipAmount?: number;
  subtotal?: number;
  total: number;
  status: string;
  deliveryStage?: DeliveryStage;
  paymentMethod?: string;
  paymentStatus?: string;
  codCollected?: boolean;
  driverId?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  createdAt: string;
}

export interface EarningsPeriod {
  earnings: number;
  deliveries: number;
  fees: number;
  tips: number;
  cashCollected: number;
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
  getProfile: () =>
    httpClient.get<{ profile: DriverProfile }>('/api/driver/profile'),
  updateProfile: (data: Partial<DriverProfile>) =>
    httpClient.patch<{ profile: DriverProfile }>('/api/driver/profile', data),
  setAvailability: (isAvailable: boolean) =>
    httpClient.patch<{ isAvailable: boolean }>('/api/driver/availability', {
      isAvailable,
    }),
  completeOnboarding: () =>
    httpClient.patch<{ profile: DriverProfile }>('/api/driver/onboarding', {}),
  completeOnboardingWithDetails: (data: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    mobileMoneyNumber?: string;
    mobileMoneyProvider?: string;
  }) =>
    httpClient.post<{ profile: DriverProfile }>('/api/driver/onboarding/complete', data),
  uploadDocument: (formData: FormData) =>
    httpClient.post('/api/driver/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Orders
  getAvailableOrders: () =>
    httpClient.get<{ orders: RiderOrder[] }>('/api/driver/orders/available'),
  acceptOrder: (orderId: string) =>
    httpClient.post<{ order: RiderOrder }>(
      `/api/driver/orders/${orderId}/accept`,
      {},
    ),
  getActiveDelivery: () =>
    httpClient.get<{ order: RiderOrder | null }>('/api/driver/orders/active'),
  advanceStage: (orderId: string, deliveryStage: DeliveryStage) =>
    httpClient.patch<{ order: RiderOrder }>(
      `/api/driver/orders/${orderId}/stage`,
      { deliveryStage },
    ),
  updateDeliveryStatus: (
    orderId: string,
    data: {
      status: string;
      deliveryProof?: { photoUrl: string; note?: string };
      codCollected?: boolean;
    },
  ) =>
    httpClient.patch<{ order: RiderOrder }>(
      `/api/driver/orders/${orderId}/status`,
      data,
    ),
  uploadDeliveryProof: (orderId: string, file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    return httpClient.post<{ photoUrl: string }>(
      `/api/driver/orders/${orderId}/proof`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  // Location
  sendLocation: (data: {
    orderId: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    batteryLevel?: number;
  }) => httpClient.post('/api/driver/location', data),

  // Earnings & history
  getEarnings: () => httpClient.get<EarningsData>('/api/driver/earnings'),
  getDeliveryHistory: (params?: { page?: number; limit?: number }) =>
    httpClient.get<{ deliveries: RiderOrder[]; pagination: unknown }>(
      '/api/driver/deliveries',
      { params },
    ),

  // Rating (customer submits)
  submitRating: (data: { orderId: string; rating: number; comment?: string }) =>
    httpClient.post('/api/driver/ratings', data),
};

export default riderService;
