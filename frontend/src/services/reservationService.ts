import httpClient from '@/lib/httpClient';
import {
  AvailabilityResponse,
  CreateReservationPayload,
  CreateManualReservationPayload,
  Reservation,
  ReservationSettings,
  ReservationStatus,
  VendorReservationsResponse,
  AdminReservationsResponse,
} from '@/types/reservation';

export interface CreateReservationResult {
  reservation: Reservation;
  requiresDeposit: boolean;
  depositAmount: number;
}

export const reservationService = {
  /** Public: calculate real-time available time slots */
  getAvailability: async (
    restaurantId: string,
    date: string,
    partySize: number,
  ): Promise<AvailabilityResponse> => {
    const res = await httpClient.get(
      `/api/reservations/availability/${restaurantId}`,
      {
        params: { date, partySize },
      },
    );
    return res.data.data;
  },

  /** Customer: create table reservation */
  createReservation: async (
    payload: CreateReservationPayload,
  ): Promise<CreateReservationResult> => {
    const res = await httpClient.post('/api/reservations', payload);
    return res.data.data;
  },

  /** Customer: get user's upcoming or past reservations */
  getMyReservations: async (
    type?: 'upcoming' | 'past',
  ): Promise<Reservation[]> => {
    const res = await httpClient.get('/api/reservations/my', {
      params: type ? { type } : undefined,
    });
    return res.data.data || [];
  },

  /** Customer: get single reservation details */
  getMyReservationById: async (id: string): Promise<Reservation> => {
    const res = await httpClient.get(`/api/reservations/my/${id}`);
    return res.data.data;
  },

  /** Customer: cancel reservation */
  cancelMyReservation: async (
    id: string,
    reason?: string,
  ): Promise<Reservation> => {
    const res = await httpClient.post(`/api/reservations/my/${id}/cancel`, {
      reason,
    });
    return res.data.data;
  },

  /** Customer: submit review for completed reservation */
  submitReservationReview: async (
    reservationId: string,
    rating: number,
    comment: string,
    title?: string,
  ) => {
    const res = await httpClient.post('/api/reviews', {
      reservationId,
      rating,
      comment,
      title,
    });
    return res.data.data;
  },

  /** Vendor: get restaurant reservations and occupancy metrics */
  getVendorReservations: async (params?: {
    restaurantId?: string;
    date?: string;
    status?: string;
    search?: string;
  }): Promise<VendorReservationsResponse> => {
    const res = await httpClient.get('/api/reservations/vendor', { params });
    return res.data.data;
  },

  /** Vendor: update reservation status */
  updateReservationStatus: async (
    id: string,
    payload: {
      status: ReservationStatus;
      reason?: string;
      assignedTables?: string[];
    },
  ): Promise<Reservation> => {
    const res = await httpClient.patch(
      `/api/reservations/vendor/${id}/status`,
      payload,
    );
    return res.data.data;
  },

  /** Vendor: create manual phone or walk-in reservation */
  createVendorManualReservation: async (
    payload: CreateManualReservationPayload,
  ): Promise<Reservation> => {
    const res = await httpClient.post(
      '/api/reservations/vendor/manual',
      payload,
    );
    return res.data.data;
  },

  /** Vendor: get reservation settings for a restaurant */
  getVendorReservationSettings: async (
    restaurantId: string,
  ): Promise<{
    restaurantId: string;
    restaurantName: string;
    settings: ReservationSettings;
    onlineCapacity: number;
  }> => {
    const res = await httpClient.get(
      `/api/reservations/vendor/settings/${restaurantId}`,
    );
    return res.data.data;
  },

  /** Vendor: update reservation settings for a restaurant */
  updateVendorReservationSettings: async (
    restaurantId: string,
    settings: ReservationSettings,
  ): Promise<{
    restaurantId: string;
    settings: ReservationSettings;
    onlineCapacity: number;
  }> => {
    const res = await httpClient.put(
      `/api/reservations/vendor/settings/${restaurantId}`,
      settings,
    );
    return res.data.data;
  },

  /** Admin: platform-wide reservations oversight */
  getAdminReservations: async (params?: {
    restaurantId?: string;
    status?: string;
    date?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<AdminReservationsResponse> => {
    const res = await httpClient.get('/api/reservations/admin', { params });
    return res.data.data;
  },
};

export default reservationService;
