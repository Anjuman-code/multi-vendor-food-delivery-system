import { HydratedDocument, Types } from 'mongoose';

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

export interface ITableInventory {
  tableNumber: string;
  capacity: number;
}

export interface IClosedDateOverride {
  date: string; // "YYYY-MM-DD"
  reason?: string;
}

export interface IReservationSettings {
  isEnabled: boolean;
  totalSeats: number;
  tables: ITableInventory[];
  walkInAllocationType: WalkInAllocationType;
  walkInAllocationValue: number; // e.g. 20 (percent) or 10 (seats)
  minPartySize: number;
  maxPartySize: number;
  slotDurationMinutes: number; // default turn time, e.g. 90
  slotIntervalMinutes: number; // booking interval, e.g. 30
  maxAdvanceDays: number; // how far ahead customers can book, e.g. 30
  minLeadTimeHours: number; // minimum notice required, e.g. 2
  closedDates: IClosedDateOverride[];
  autoConfirm: boolean; // true = auto-confirm if capacity permits, false = manual vendor approval
  cancellationWindowHours: number; // hours prior to start time allowing free cancellation, e.g. 2
  noShowGracePeriodMinutes: number; // minutes after start time before marking no-show, e.g. 15
  depositRequired: boolean; // optional deposit per vendor
  depositAmountPerGuest: number; // in BDT (৳)
}

export interface IReservationGuestInfo {
  name: string;
  phone: string;
  email?: string;
}

export interface IReservationStatusHistory {
  status: ReservationStatus;
  timestamp: Date;
  updatedBy?: Types.ObjectId;
  reason?: string;
}

export interface IReservationDeposit {
  required: boolean;
  amount: number;
  status: DepositStatus;
  paymentSessionId?: string;
  transactionId?: string;
  paidAt?: Date;
}

export interface IReservation {
  reservationNumber: string;
  restaurantId: Types.ObjectId;
  customerId?: Types.ObjectId;
  guestInfo: IReservationGuestInfo;
  partySize: number;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM" (24h)
  endTime: string; // "HH:MM" (24h)
  startDateTime: Date;
  endDateTime: Date;
  assignedTables: string[];
  specialRequests?: string;
  source: ReservationSource;
  status: ReservationStatus;
  statusHistory: IReservationStatusHistory[];
  deposit: IReservationDeposit;
  cancellationReason?: string;
  reviewId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ReservationDocument = HydratedDocument<IReservation>;

export interface IAvailableSlot {
  time: string; // "HH:MM" or "12:30 PM"
  time24: string; // "14:30"
  available: boolean;
  seatsLeft: number;
  reason?: string; // "Fully booked" | "Closed" | "Too soon" | "Exceeds party limit"
}
