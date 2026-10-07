export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'no_show';

export type ReservationSource = 'online' | 'manual' | 'walk_in';

export type DepositStatus = 'none' | 'pending' | 'paid' | 'refunded';

export type WalkInAllocationType = 'percentage' | 'fixed_seats';

export interface TableInventoryItem {
  tableNumber: string;
  capacity: number;
}

export interface ClosedDateOverride {
  date: string;
  reason?: string;
}

export interface ReservationSettings {
  isEnabled: boolean;
  totalSeats: number;
  tables: TableInventoryItem[];
  walkInAllocationType: WalkInAllocationType;
  walkInAllocationValue: number;
  minPartySize: number;
  maxPartySize: number;
  slotDurationMinutes: number;
  slotIntervalMinutes: number;
  maxAdvanceDays: number;
  minLeadTimeHours: number;
  closedDates: ClosedDateOverride[];
  autoConfirm: boolean;
  cancellationWindowHours: number;
  noShowGracePeriodMinutes: number;
  depositRequired: boolean;
  depositAmountPerGuest: number;
}

export interface AvailableSlot {
  time: string;
  time24: string;
  available: boolean;
  seatsLeft: number;
  reason?: string;
}

export interface AvailabilityResponse {
  restaurantName: string;
  date: string;
  partySize: number;
  onlineCapacity: number;
  depositRequired: boolean;
  depositAmount: number;
  slots: AvailableSlot[];
}

export interface ReservationGuestInfo {
  name: string;
  phone: string;
  email?: string;
}

export interface ReservationStatusHistory {
  status: ReservationStatus;
  timestamp: string;
  updatedBy?: string;
  reason?: string;
}

export interface ReservationDeposit {
  required: boolean;
  amount: number;
  status: DepositStatus;
  paymentSessionId?: string;
  transactionId?: string;
  paidAt?: string;
}

export interface PopulatedRestaurantSummary {
  _id: string;
  name: string;
  slug?: string;
  address?: {
    street?: string;
    area?: string;
    district?: string;
  };
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  images?: {
    logo?: string;
    coverPhoto?: string;
  };
  reservationSettings?: ReservationSettings;
}

export interface PopulatedReviewSummary {
  _id: string;
  rating: number;
  comment: string;
  title?: string;
  createdAt: string;
}

export interface Reservation {
  _id: string;
  reservationNumber: string;
  restaurantId: PopulatedRestaurantSummary | string;
  customerId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  } | string;
  guestInfo: ReservationGuestInfo;
  partySize: number;
  date: string;
  time: string;
  endTime: string;
  startDateTime: string;
  endDateTime: string;
  assignedTables: string[];
  specialRequests?: string;
  source: ReservationSource;
  status: ReservationStatus;
  statusHistory: ReservationStatusHistory[];
  deposit: ReservationDeposit;
  cancellationReason?: string;
  reviewId?: PopulatedReviewSummary | string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReservationPayload {
  restaurantId: string;
  partySize: number;
  date: string;
  time: string;
  specialRequests?: string;
  guestInfo: {
    name: string;
    phone: string;
    email?: string;
  };
}

export interface CreateManualReservationPayload {
  restaurantId: string;
  partySize: number;
  date: string;
  time: string;
  specialRequests?: string;
  guestInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  source: 'manual' | 'walk_in';
  status?: 'pending' | 'confirmed' | 'seated' | 'completed';
  assignedTables?: string[];
}

export interface VendorReservationsStats {
  todayBookings: number;
  expectedGuests: number;
  seatedGuests: number;
  occupancyRate: number;
  pendingApprovals: number;
}

export interface VendorReservationsResponse {
  reservations: Reservation[];
  stats: VendorReservationsStats;
}

export interface AdminReservationsResponse {
  reservations: Reservation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
