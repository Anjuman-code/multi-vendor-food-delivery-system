import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import Restaurant from '../models/Restaurant';
import Reservation from '../models/Reservation';
import {
  IAvailableSlot,
  IReservationSettings,
  ReservationStatus,
} from '../types/reservation.types';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';

// ── Time & Date Helpers ──────────────────────────────────────────

/** Parse "YYYY-MM-DD" and "HH:MM" into a Date object in local time */
export const buildDateTime = (dateStr: string, timeStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

/** Format Date object as "HH:MM" (24h) */
export const formatTime24 = (date: Date): string => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

/** Format "HH:MM" to 12-hour AM/PM string */
export const formatTime12 = (time24: string): string => {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
};

/** Day name from "YYYY-MM-DD" */
export const getDayOfWeekName = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return days[date.getDay()];
};

/** Compute end time string "HH:MM" given a start time and duration in minutes */
export const computeEndTime = (
  timeStr: string,
  durationMinutes: number,
): string => {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
};

/** Generate unique reservation number: RSV-YYYYMM-XXXX */
export const generateReservationNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `RSV-${year}${month}-${rand}`;
};

/** Calculate effective online capacity after walk-in reserve */
export const getOnlineCapacity = (
  settings: IReservationSettings,
): number => {
  const total = settings.totalSeats || 40;
  const walkIn =
    settings.walkInAllocationType === 'percentage'
      ? Math.ceil(total * ((settings.walkInAllocationValue || 0) / 100))
      : settings.walkInAllocationValue || 0;
  return Math.max(0, total - walkIn);
};

// ── Availability Calculation Engine ──────────────────────────────

export const calculateAvailability = async (
  restaurantId: string | Types.ObjectId,
  dateStr: string,
  partySize: number,
): Promise<{
  restaurantName: string;
  date: string;
  partySize: number;
  onlineCapacity: number;
  depositRequired: boolean;
  depositAmount: number;
  slots: IAvailableSlot[];
}> => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.isActive || restaurant.deletedAt) {
    throw new NotFoundError('Restaurant not found or is currently inactive');
  }

  const settings: IReservationSettings = restaurant.reservationSettings || {
    isEnabled: false,
    totalSeats: 40,
    tables: [],
    walkInAllocationType: 'percentage',
    walkInAllocationValue: 20,
    minPartySize: 1,
    maxPartySize: 10,
    slotDurationMinutes: 90,
    slotIntervalMinutes: 30,
    maxAdvanceDays: 30,
    minLeadTimeHours: 2,
    closedDates: [],
    autoConfirm: true,
    cancellationWindowHours: 2,
    noShowGracePeriodMinutes: 15,
    depositRequired: false,
    depositAmountPerGuest: 0,
  };

  const depositAmount = settings.depositRequired
    ? (settings.depositAmountPerGuest || 0) * partySize
    : 0;

  if (!settings.isEnabled) {
    return {
      restaurantName: restaurant.name,
      date: dateStr,
      partySize,
      onlineCapacity: 0,
      depositRequired: false,
      depositAmount: 0,
      slots: [],
    };
  }

  const onlineCapacity = getOnlineCapacity(settings);
  const slots: IAvailableSlot[] = [];

  // Check if date is closed override
  const closedOverride = settings.closedDates?.find((c) => c.date === dateStr);
  if (closedOverride) {
    return {
      restaurantName: restaurant.name,
      date: dateStr,
      partySize,
      onlineCapacity,
      depositRequired: settings.depositRequired,
      depositAmount,
      slots: [
        {
          time: 'Closed',
          time24: '00:00',
          available: false,
          seatsLeft: 0,
          reason: closedOverride.reason || 'Closed on this date',
        },
      ],
    };
  }

  // Check party size bounds
  if (partySize < settings.minPartySize) {
    return {
      restaurantName: restaurant.name,
      date: dateStr,
      partySize,
      onlineCapacity,
      depositRequired: settings.depositRequired,
      depositAmount,
      slots: [
        {
          time: 'N/A',
          time24: '00:00',
          available: false,
          seatsLeft: 0,
          reason: `Minimum party size is ${settings.minPartySize}`,
        },
      ],
    };
  }

  if (partySize > settings.maxPartySize) {
    return {
      restaurantName: restaurant.name,
      date: dateStr,
      partySize,
      onlineCapacity,
      depositRequired: settings.depositRequired,
      depositAmount,
      slots: [
        {
          time: 'N/A',
          time24: '00:00',
          available: false,
          seatsLeft: 0,
          reason: `Maximum party size is ${settings.maxPartySize}`,
        },
      ],
    };
  }

  // Check booking horizon
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [qYear, qMonth, qDay] = dateStr.split('-').map(Number);
  const targetDate = new Date(qYear, qMonth - 1, qDay, 0, 0, 0, 0);

  if (targetDate < today) {
    return {
      restaurantName: restaurant.name,
      date: dateStr,
      partySize,
      onlineCapacity,
      depositRequired: settings.depositRequired,
      depositAmount,
      slots: [
        {
          time: 'N/A',
          time24: '00:00',
          available: false,
          seatsLeft: 0,
          reason: 'Date is in the past',
        },
      ],
    };
  }

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + settings.maxAdvanceDays);
  if (targetDate > maxDate) {
    return {
      restaurantName: restaurant.name,
      date: dateStr,
      partySize,
      onlineCapacity,
      depositRequired: settings.depositRequired,
      depositAmount,
      slots: [
        {
          time: 'N/A',
          time24: '00:00',
          available: false,
          seatsLeft: 0,
          reason: `Reservations can only be made up to ${settings.maxAdvanceDays} days in advance`,
        },
      ],
    };
  }

  // Operating hours for day
  const dayName = getDayOfWeekName(dateStr);
  const dayHours = restaurant.operatingHours?.find((h) => h.day === dayName);

  if (!dayHours || !dayHours.isOpen) {
    return {
      restaurantName: restaurant.name,
      date: dateStr,
      partySize,
      onlineCapacity,
      depositRequired: settings.depositRequired,
      depositAmount,
      slots: [
        {
          time: 'Closed',
          time24: '00:00',
          available: false,
          seatsLeft: 0,
          reason: `Restaurant is closed on ${dayName}s`,
        },
      ],
    };
  }

  const [openH, openM] = dayHours.openTime.split(':').map(Number);
  const [closeH, closeM] = dayHours.closeTime.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const interval = settings.slotIntervalMinutes || 30;
  const duration = settings.slotDurationMinutes || 90;

  // Retrieve all active reservations for this restaurant overlapping this day
  const dayStart = new Date(qYear, qMonth - 1, qDay, 0, 0, 0, 0);
  const dayEnd = new Date(qYear, qMonth - 1, qDay, 23, 59, 59, 999);

  const activeReservations = await Reservation.find({
    restaurantId,
    status: { $in: ['pending', 'confirmed', 'seated'] },
    startDateTime: { $lte: dayEnd },
    endDateTime: { $gte: dayStart },
  }).lean();

  const now = new Date();
  const minLeadTimeMs = (settings.minLeadTimeHours || 0) * 60 * 60 * 1000;
  const minAllowedDateTime = new Date(now.getTime() + minLeadTimeMs);

  for (let m = openMinutes; m + duration <= closeMinutes; m += interval) {
    const slotH = Math.floor(m / 60);
    const slotM = m % 60;
    const time24 = `${slotH.toString().padStart(2, '0')}:${slotM.toString().padStart(2, '0')}`;
    const time12 = formatTime12(time24);

    const slotStart = new Date(qYear, qMonth - 1, qDay, slotH, slotM, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

    // Lead time check
    if (slotStart <= minAllowedDateTime) {
      slots.push({
        time: time12,
        time24,
        available: false,
        seatsLeft: 0,
        reason: 'Too soon (advance notice required)',
      });
      continue;
    }

    // Overlapping reservations calculation
    const overlapping = activeReservations.filter((res) => {
      const resStart = new Date(res.startDateTime);
      const resEnd = new Date(res.endDateTime);
      return resStart < slotEnd && resEnd > slotStart;
    });

    const usedSeats = overlapping.reduce((sum, r) => sum + r.partySize, 0);
    const seatsLeft = Math.max(0, onlineCapacity - usedSeats);

    if (seatsLeft < partySize) {
      slots.push({
        time: time12,
        time24,
        available: false,
        seatsLeft,
        reason: 'Fully booked',
      });
    } else {
      slots.push({
        time: time12,
        time24,
        available: true,
        seatsLeft,
      });
    }
  }

  return {
    restaurantName: restaurant.name,
    date: dateStr,
    partySize,
    onlineCapacity,
    depositRequired: settings.depositRequired,
    depositAmount,
    slots,
  };
};

// ── Atomic Reservation Creator ───────────────────────────────────

export const createReservationWithCapacityCheck = async ({
  restaurantId,
  customerId,
  guestInfo,
  partySize,
  date,
  time,
  specialRequests,
  source = 'online',
  statusOverride,
  assignedTables = [],
}: {
  restaurantId: string | Types.ObjectId;
  customerId?: string | Types.ObjectId;
  guestInfo: { name: string; phone: string; email?: string };
  partySize: number;
  date: string;
  time: string;
  specialRequests?: string;
  source?: 'online' | 'manual' | 'walk_in';
  statusOverride?: ReservationStatus;
  assignedTables?: string[];
}) => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.isActive || restaurant.deletedAt) {
    throw new NotFoundError('Restaurant not found or inactive');
  }

  const settings: IReservationSettings = restaurant.reservationSettings || {
    isEnabled: false,
    totalSeats: 40,
    tables: [],
    walkInAllocationType: 'percentage',
    walkInAllocationValue: 20,
    minPartySize: 1,
    maxPartySize: 10,
    slotDurationMinutes: 90,
    slotIntervalMinutes: 30,
    maxAdvanceDays: 30,
    minLeadTimeHours: 2,
    closedDates: [],
    autoConfirm: true,
    cancellationWindowHours: 2,
    noShowGracePeriodMinutes: 15,
    depositRequired: false,
    depositAmountPerGuest: 0,
  };

  if (!settings.isEnabled && source === 'online') {
    throw new ValidationError(
      'This restaurant is not currently accepting online table reservations',
    );
  }

  if (source === 'online') {
    if (partySize < settings.minPartySize) {
      throw new ValidationError(
        `Minimum party size for this restaurant is ${settings.minPartySize}`,
      );
    }
    if (partySize > settings.maxPartySize) {
      throw new ValidationError(
        `Maximum party size for this restaurant is ${settings.maxPartySize}`,
      );
    }
  }

  const duration = settings.slotDurationMinutes || 90;
  const startDateTime = buildDateTime(date, time);
  const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
  const endTime = computeEndTime(time, duration);

  const now = new Date();
  if (source === 'online') {
    const minLeadTimeMs = (settings.minLeadTimeHours || 0) * 60 * 60 * 1000;
    if (startDateTime.getTime() < now.getTime() + minLeadTimeMs) {
      throw new ValidationError(
        `Reservations require at least ${settings.minLeadTimeHours} hours notice`,
      );
    }
  }

  const onlineCapacity =
    source === 'walk_in'
      ? settings.totalSeats || 40 // Walk-ins can use total capacity
      : getOnlineCapacity(settings);

  // Atomic conflict check: ensure (overlapping party sizes + partySize) <= onlineCapacity
  const overlappingActive = await Reservation.find({
    restaurantId,
    status: { $in: ['pending', 'confirmed', 'seated'] },
    startDateTime: { $lt: endDateTime },
    endDateTime: { $gt: startDateTime },
  });

  const usedSeats = overlappingActive.reduce((sum, r) => sum + r.partySize, 0);

  if (usedSeats + partySize > onlineCapacity) {
    throw new ConflictError(
      'This time slot has reached full capacity. Please select another time.',
    );
  }

  // Determine initial status:
  // If deposit required & source === 'online' -> pending (awaiting payment)
  // Else if autoConfirm -> confirmed, else pending (awaiting vendor approval)
  const depositRequired = Boolean(
    source === 'online' && settings.depositRequired,
  );
  const depositAmount = depositRequired
    ? (settings.depositAmountPerGuest || 0) * partySize
    : 0;

  let initialStatus: ReservationStatus;
  if (statusOverride) {
    initialStatus = statusOverride;
  } else if (depositRequired) {
    initialStatus = 'pending';
  } else if (settings.autoConfirm) {
    initialStatus = 'confirmed';
  } else {
    initialStatus = 'pending';
  }

  const reservationNumber = generateReservationNumber();

  const reservation = await Reservation.create({
    reservationNumber,
    restaurantId: new Types.ObjectId(restaurantId.toString()),
    customerId: customerId
      ? new Types.ObjectId(customerId.toString())
      : undefined,
    guestInfo,
    partySize,
    date,
    time,
    endTime,
    startDateTime,
    endDateTime,
    assignedTables,
    specialRequests,
    source,
    status: initialStatus,
    statusHistory: [
      {
        status: initialStatus,
        timestamp: new Date(),
        updatedBy: customerId
          ? new Types.ObjectId(customerId.toString())
          : undefined,
        reason:
          source === 'walk_in'
            ? 'Walk-in guest'
            : source === 'manual'
              ? 'Manual booking by staff'
              : depositRequired
                ? 'Reservation created (deposit pending)'
                : settings.autoConfirm
                  ? 'Auto-confirmed'
                  : 'Pending vendor confirmation',
      },
    ],
    deposit: {
      required: depositRequired,
      amount: depositAmount,
      status: depositRequired ? 'pending' : 'none',
    },
  });

  return reservation;
};
