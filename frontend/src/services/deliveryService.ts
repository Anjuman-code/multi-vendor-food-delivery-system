/**
 * Delivery Service — API client for dynamic delivery fee, distance calculation,
 * geocoding proxy, and admin campaign/settings management.
 */
import httpClient from "@/lib/httpClient";
import type { ApiResponse } from "@/services/authService";

export interface LatLngPoint {
  latitude: number;
  longitude: number;
}

export interface SubOrderQuoteResult {
  restaurantId: string;
  restaurantName: string;
  deliverable: boolean;
  distanceKm: number;
  durationMin: number;
  feeOriginal: number;
  feeDiscount: number;
  feeCharged: number;
  campaign: {
    campaignId?: string;
    name?: string;
    label?: string;
    waivedAmount?: number;
  } | null;
  isEstimate: boolean;
  provider: string;
  reason?:
    | "OUT_OF_RANGE"
    | "RESTAURANT_NO_LOCATION"
    | "OUTSIDE_SERVICE_AREA"
    | "RESTAURANT_NOT_FOUND";
}

export interface DeliveryQuoteResult {
  quoteId: string;
  expiresAt: string;
  destination: LatLngPoint;
  quotes: SubOrderQuoteResult[];
  totals: {
    deliveryFeeOriginal: number;
    deliveryFeeDiscount: number;
    deliveryFeeCharged: number;
    totalDistanceKm: number;
  };
}

export interface ActiveDeliveryCampaign {
  _id: string;
  name: string;
  label: string;
  description?: string;
  minSubtotal: number;
  restaurantIds: string[];
  maxDistanceKm?: number;
  maxWaivedAmount?: number;
  startsAt?: string;
  endsAt?: string;
}

export interface GeocodingAddress {
  displayName: string;
  lat: number;
  lng: number;
  street?: string;
  area?: string;
  district?: string;
  postcode?: string;
}

export interface DeliverySettings {
  minFee: number;
  includedKm: number;
  includedDistanceFee: number;
  perKmRate: number;
  maxFee?: number;
  maxDeliveryDistanceKm: number;
  detourFactor: number;
  serviceArea?: {
    type: string;
    coordinates: number[][][];
  };
  updatedAt?: string;
  updatedBy?: string;
}

export interface DeliveryCampaignAdminItem extends ActiveDeliveryCampaign {
  isActive: boolean;
  isDeleted: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationResult {
  distanceKm: number;
  durationMin: number;
  feeOriginal: number;
  feeDiscount: number;
  feeCharged: number;
  campaignApplied: SubOrderQuoteResult["campaign"];
  isEstimate: boolean;
  provider: string;
}

const extractError = (error: unknown): ApiResponse => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosErr = error as { response?: { data?: ApiResponse } };
    if (axiosErr.response?.data) return axiosErr.response.data;
  }
  return {
    success: false,
    message: "Network error. Please check your connection.",
  };
};

export const deliveryService = {
  /**
   * POST /api/delivery/quote
   * Quotes delivery distance & fees for given destination and sub-orders.
   */
  async quoteDelivery(
    destination: LatLngPoint,
    subOrders: Array<{ restaurantId: string; itemsSubtotal: number }>,
  ): Promise<ApiResponse<DeliveryQuoteResult>> {
    try {
      const response = await httpClient.post<ApiResponse<DeliveryQuoteResult>>(
        "/api/delivery/quote",
        {
          destination,
          subOrders,
          restaurants: subOrders,
        },
      );
      return response.data;
    } catch (error) {
      return extractError(error) as ApiResponse<DeliveryQuoteResult>;
    }
  },

  /**
   * GET /api/delivery/campaigns/active
   * Retrieves active free delivery campaigns visible to customers.
   */
  async getActiveCampaigns(): Promise<ApiResponse<{ campaigns: ActiveDeliveryCampaign[] }>> {
    try {
      const response = await httpClient.get<ApiResponse<{ campaigns: ActiveDeliveryCampaign[] }>>(
        "/api/delivery/campaigns/active",
      );
      return response.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{ campaigns: ActiveDeliveryCampaign[] }>;
    }
  },

  /**
   * GET /api/delivery/geocode/search
   * Search for locations through throttled backend proxy.
   */
  async geocodeSearch(query: string): Promise<ApiResponse<{ results: GeocodingAddress[] }>> {
    try {
      const response = await httpClient.get<ApiResponse<{ results: GeocodingAddress[] }>>(
        "/api/delivery/geocode/search",
        { params: { q: query } },
      );
      return response.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{ results: GeocodingAddress[] }>;
    }
  },

  /**
   * GET /api/delivery/geocode/reverse
   * Reverse geocode coordinates through throttled backend proxy.
   */
  async geocodeReverse(lat: number, lng: number): Promise<ApiResponse<{ address: GeocodingAddress | null }>> {
    try {
      const response = await httpClient.get<ApiResponse<{ address: GeocodingAddress | null }>>(
        "/api/delivery/geocode/reverse",
        { params: { lat, lng } },
      );
      return response.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{ address: GeocodingAddress | null }>;
    }
  },

  // ── Admin Endpoints ──────────────────────────────────────────

  async getSettings(): Promise<ApiResponse<{ settings: DeliverySettings }>> {
    try {
      const response = await httpClient.get<ApiResponse<{ settings: DeliverySettings }>>(
        "/api/admin/delivery/settings",
      );
      return response.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{ settings: DeliverySettings }>;
    }
  },

  async updateSettings(settings: Partial<DeliverySettings>): Promise<ApiResponse<{ settings: DeliverySettings }>> {
    try {
      const response = await httpClient.put<ApiResponse<{ settings: DeliverySettings }>>(
        "/api/admin/delivery/settings",
        settings,
      );
      return response.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{ settings: DeliverySettings }>;
    }
  },

  async simulate(payload: {
    distanceKm?: number;
    origin?: LatLngPoint;
    destination?: LatLngPoint;
    itemsSubtotal: number;
    restaurantId?: string;
    settings?: Partial<DeliverySettings>;
  }): Promise<ApiResponse<{ simulation: SimulationResult }>> {
    try {
      const response = await httpClient.post<ApiResponse<{ simulation: SimulationResult }>>(
        "/api/admin/delivery/simulate",
        payload,
      );
      return response.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{ simulation: SimulationResult }>;
    }
  },

  async getCampaigns(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<
    ApiResponse<{
      campaigns: DeliveryCampaignAdminItem[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>
  > {
    try {
      const response = await httpClient.get<
        ApiResponse<{
          campaigns: DeliveryCampaignAdminItem[];
          pagination: { page: number; limit: number; total: number; pages: number };
        }>
      >("/api/admin/delivery/campaigns", { params });
      return response.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{
        campaigns: DeliveryCampaignAdminItem[];
        pagination: { page: number; limit: number; total: number; pages: number };
      }>;
    }
  },

  async createCampaign(
    payload: Omit<DeliveryCampaignAdminItem, "_id" | "isDeleted" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt">,
  ): Promise<ApiResponse<{ campaign: DeliveryCampaignAdminItem }>> {
    try {
      const response = await httpClient.post<ApiResponse<{ campaign: DeliveryCampaignAdminItem }>>(
        "/api/admin/delivery/campaigns",
        payload,
      );
      return response.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{ campaign: DeliveryCampaignAdminItem }>;
    }
  },

  async getCampaign(id: string): Promise<ApiResponse<{ campaign: DeliveryCampaignAdminItem }>> {
    try {
      const response = await httpClient.get<ApiResponse<{ campaign: DeliveryCampaignAdminItem }>>(
        `/api/admin/delivery/campaigns/${id}`,
      );
      return response.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{ campaign: DeliveryCampaignAdminItem }>;
    }
  },

  async updateCampaign(
    id: string,
    payload: Partial<DeliveryCampaignAdminItem>,
  ): Promise<ApiResponse<{ campaign: DeliveryCampaignAdminItem }>> {
    try {
      const response = await httpClient.put<ApiResponse<{ campaign: DeliveryCampaignAdminItem }>>(
        `/api/admin/delivery/campaigns/${id}`,
        payload,
      );
      return response.data;
    } catch (error) {
      return extractError(error) as ApiResponse<{ campaign: DeliveryCampaignAdminItem }>;
    }
  },

  async deleteCampaign(id: string): Promise<ApiResponse<null>> {
    try {
      const response = await httpClient.delete<ApiResponse<null>>(
        `/api/admin/delivery/campaigns/${id}`,
      );
      return response.data;
    } catch (error) {
      return extractError(error) as ApiResponse<null>;
    }
  },
};

export default deliveryService;
