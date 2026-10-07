import mongoose, { Model, Schema } from 'mongoose';
import {
  IReservation,
  IReservationGuestInfo,
  IReservationStatusHistory,
  IReservationDeposit,
  ReservationDocument,
} from '../types/reservation.types';
import {
  BD_PHONE_ERROR_MESSAGE,
  isCanonicalBdPhoneNumber,
  normalizeBdPhoneNumber,
} from '../utils/phone.util';

// ── Sub-schemas ──────────────────────────────────────────────────

const guestInfoSchema = new Schema<IReservationGuestInfo>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false },
);

const statusHistorySchema = new Schema<IReservationStatusHistory>(
  {
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'seated',
        'completed',
        'cancelled',
        'rejected',
        'no_show',
      ],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const depositSchema = new Schema<IReservationDeposit>(
  {
    required: { type: Boolean, default: false },
    amount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['none', 'pending', 'paid', 'refunded'],
      default: 'none',
    },
    paymentSessionId: { type: String, trim: true },
    transactionId: { type: String, trim: true },
    paidAt: { type: Date },
  },
  { _id: false },
);

// ── Main Reservation Schema ──────────────────────────────────────

const reservationSchema = new Schema<IReservation>(
  {
    reservationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    guestInfo: {
      type: guestInfoSchema,
      required: true,
    },
    partySize: {
      type: Number,
      required: [true, 'Party size is required'],
      min: [1, 'Party size must be at least 1'],
    },
    date: {
      type: String,
      required: [true, 'Date is required (YYYY-MM-DD)'],
      trim: true,
      index: true,
    },
    time: {
      type: String,
      required: [true, 'Time is required (HH:MM)'],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, 'End time is required (HH:MM)'],
      trim: true,
    },
    startDateTime: {
      type: Date,
      required: true,
      index: true,
    },
    endDateTime: {
      type: Date,
      required: true,
      index: true,
    },
    assignedTables: {
      type: [String],
      default: [],
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [500, 'Special requests cannot exceed 500 characters'],
    },
    source: {
      type: String,
      enum: ['online', 'manual', 'walk_in'],
      default: 'online',
    },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'seated',
        'completed',
        'cancelled',
        'rejected',
        'no_show',
      ],
      default: 'pending',
      index: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    deposit: {
      type: depositSchema,
      default: () => ({ required: false, amount: 0, status: 'none' }),
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [300, 'Cancellation reason cannot exceed 300 characters'],
    },
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
      sparse: true,
    },
  },
  { timestamps: true },
);

// Pre-validate phone number
reservationSchema.pre('validate', function () {
  if (this.guestInfo?.phone) {
    this.guestInfo.phone = normalizeBdPhoneNumber(this.guestInfo.phone);
    if (!isCanonicalBdPhoneNumber(this.guestInfo.phone)) {
      this.invalidate('guestInfo.phone', BD_PHONE_ERROR_MESSAGE);
    }
  }
});

// Indexes for fast lookup and availability queries
reservationSchema.index({ restaurantId: 1, date: 1, status: 1 });
reservationSchema.index({ customerId: 1, startDateTime: -1 });
reservationSchema.index({ restaurantId: 1, startDateTime: 1 });
reservationSchema.index({ status: 1, date: 1 });

const Reservation: Model<IReservation> = mongoose.model<IReservation>(
  'Reservation',
  reservationSchema,
);

export default Reservation;
