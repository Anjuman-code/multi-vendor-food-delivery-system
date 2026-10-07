import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { bdPhoneSchema } from '@/lib/phone';
import { toast } from '@/lib/toast';
import reservationService, {
  CreateReservationResult,
} from '@/services/reservationService';
import type { AvailableSlot, Reservation } from '@/types/reservation';
import type { Restaurant } from '@/types/restaurant';
import { cn } from '@/utils/cn';
import { restaurantFallbackSVG } from '@/utils/fallbackImages';
import { addDays, format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  CalendarPlus,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnifiedPaymentModal } from '@/components/payment/UnifiedPaymentModal';

interface BookingModalProps {
  restaurant: Restaurant | null;
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete?: (reservation: Reservation) => void;
  initialGuests?: number;
  initialDate?: string;
  initialTime?: string;
}

type BookingStep = 'date_party' | 'time' | 'details' | 'confirm' | 'success';

const guestPresets = [1, 2, 3, 4, 5, 6, 8, 10];

export const BookingModal: React.FC<BookingModalProps> = ({
  restaurant,
  isOpen,
  onClose,
  onBookingComplete,
  initialGuests = 2,
  initialDate,
  initialTime,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<BookingStep>('date_party');
  const [selectedGuests, setSelectedGuests] = useState<number>(initialGuests);
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || format(new Date(), 'yyyy-MM-dd'),
  );
  const [selectedTime, setSelectedTime] = useState<string>(initialTime || '');
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // Guest details form state
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Availability state
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [depositRequired, setDepositRequired] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [availabilityMessage, setAvailabilityMessage] = useState<string>('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdReservation, setCreatedReservation] =
    useState<Reservation | null>(null);

  // Payment modal state for deposit
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [pendingReservationResult, setPendingReservationResult] =
    useState<CreateReservationResult | null>(null);

  // Auto-fill logged-in user profile
  useEffect(() => {
    if (user) {
      if (user.firstName || user.lastName) {
        setContactName(
          `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        );
      }
      if (user.email) setContactEmail(user.email);
      const maybePhone = (user as { phoneNumber?: string; phone?: string }).phoneNumber || (user as { phoneNumber?: string; phone?: string }).phone;
      if (maybePhone) setContactPhone(maybePhone);
    }
  }, [user]);

  // Generate 7-day quick date picker items
  const quickDates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i);
      return {
        date: format(d, 'yyyy-MM-dd'),
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(d, 'EEE'),
        subLabel: format(d, 'MMM d'),
      };
    });
  }, []);

  // Fetch real-time availability from server
  const fetchAvailability = useCallback(async () => {
    if (!restaurant?.id || !selectedDate) return;
    setLoadingSlots(true);
    setAvailabilityMessage('');
    try {
      const res = await reservationService.getAvailability(
        String(restaurant.id),
        selectedDate,
        selectedGuests,
      );
      setSlots(res.slots || []);
      setDepositRequired(res.depositRequired);
      setDepositAmount(res.depositAmount);
      if (res.slots.length === 0) {
        setAvailabilityMessage(
          'No available tables for this date and party size.',
        );
      }
    } catch {
      setSlots([]);
      setAvailabilityMessage('Unable to fetch availability for this date.');
    } finally {
      setLoadingSlots(false);
    }
  }, [restaurant?.id, selectedDate, selectedGuests]);

  useEffect(() => {
    if (isOpen && restaurant?.id) {
      void fetchAvailability();
    }
  }, [isOpen, restaurant?.id, selectedDate, selectedGuests, fetchAvailability]);

  // Validate guest details
  const validateDetails = (): boolean => {
    const errors: Record<string, string> = {};
    if (!contactName.trim() || contactName.trim().length < 2) {
      errors.contactName = 'Please enter your name (at least 2 characters)';
    }

    const phoneCheck = bdPhoneSchema.safeParse(contactPhone);
    if (!phoneCheck.success) {
      errors.contactPhone =
        'Valid Bangladeshi phone required (e.g. +8801712345678)';
    }

    if (contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail.trim())) {
        errors.contactEmail = 'Please enter a valid email address';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit booking
  const handleConfirmBooking = async () => {
    if (!restaurant?.id) return;
    setIsSubmitting(true);

    try {
      const payload = {
        restaurantId: String(restaurant.id),
        partySize: selectedGuests,
        date: selectedDate,
        time: selectedTime,
        specialRequests: specialRequests.trim() || undefined,
        guestInfo: {
          name: contactName.trim(),
          phone: contactPhone.trim(),
          email: contactEmail.trim() || undefined,
        },
      };

      const result = await reservationService.createReservation(payload);

      if (result.requiresDeposit && result.depositAmount > 0) {
        // Needs deposit payment
        setPendingReservationResult(result);
        setPaymentModalOpen(true);
      } else {
        // Confirmed immediately
        setCreatedReservation(result.reservation);
        setStep('success');
        toast.success('Reservation Confirmed!', {
          description: `Your table at ${restaurant.name} is reserved.`,
        });
        onBookingComplete?.(result.reservation);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Reservation failed. Please try again.';
      toast.error('Booking Failed', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deposit payment completion
  const handleDepositSuccess = () => {
    setPaymentModalOpen(false);
    if (pendingReservationResult) {
      setCreatedReservation(pendingReservationResult.reservation);
      setStep('success');
      toast.success('Deposit Paid & Reservation Confirmed!', {
        description: `Your table at ${restaurant?.name} is confirmed.`,
      });
      onBookingComplete?.(pendingReservationResult.reservation);
    }
  };

  const handleClose = () => {
    setStep('date_party');
    setSelectedTime('');
    setFormErrors({});
    onClose();
  };

  // Google Calendar link
  const handleAddToCalendar = () => {
    if (!createdReservation || !restaurant) return;
    const [h, m] = selectedTime.split(':');
    const start = new Date(
      `${selectedDate}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`,
    );
    const end = new Date(start.getTime() + 90 * 60 * 1000); // 90 mins

    const formatGoogleDate = (d: Date) =>
      d.toISOString().replace(/-|:|\.\d+/g, '');

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', `Table Reservation at ${restaurant.name}`);
    url.searchParams.set(
      'dates',
      `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
    );
    url.searchParams.set('location', restaurant.address || '');
    url.searchParams.set(
      'details',
      `Reservation #${createdReservation.reservationNumber} for ${selectedGuests} guests at ${restaurant.name}.`,
    );

    window.open(url.toString(), '_blank');
  };

  if (!restaurant) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-full max-w-lg overflow-hidden p-0 sm:rounded-2xl border-0 shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5 text-white">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-3">
                <img
                  src={restaurant.image || restaurantFallbackSVG}
                  alt={restaurant.name}
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-white/30"
                />
                <div className="text-left">
                  <DialogTitle className="text-lg font-bold text-white">
                    {restaurant.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-white/80 flex items-center gap-1.5 mt-0.5">
                    <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                    <span>{restaurant.rating}</span>
                    <span>•</span>
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[200px]">
                      {restaurant.address}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Stepper Dots / Bar */}
            {step !== 'success' && (
              <div className="mt-4 flex items-center justify-between text-xs font-medium text-white/80">
                <span
                  className={cn(
                    'transition-colors',
                    step === 'date_party' && 'text-white font-bold',
                  )}
                >
                  1. Date & Guests
                </span>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                <span
                  className={cn(
                    'transition-colors',
                    step === 'time' && 'text-white font-bold',
                  )}
                >
                  2. Time Slot
                </span>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                <span
                  className={cn(
                    'transition-colors',
                    step === 'details' && 'text-white font-bold',
                  )}
                >
                  3. Details
                </span>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                <span
                  className={cn(
                    'transition-colors',
                    step === 'confirm' && 'text-white font-bold',
                  )}
                >
                  4. Review
                </span>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            <AnimatePresence mode="wait">
              {/* Step 1: Date & Guests */}
              {step === 'date_party' && (
                <motion.div
                  key="date_party"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="space-y-6"
                >
                  {/* Date Selector Rail */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                      <Calendar className="mr-1.5 inline h-4 w-4 text-brand-500" />
                      Select Date
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                      {quickDates.map((item) => {
                        const isSelected = selectedDate === item.date;
                        return (
                          <button
                            key={item.date}
                            type="button"
                            onClick={() => setSelectedDate(item.date)}
                            className={cn(
                              'flex min-w-[76px] flex-col items-center justify-center rounded-xl p-3 text-center transition-all min-h-[58px]',
                              isSelected
                                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-500'
                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/70',
                            )}
                          >
                            <span className="text-xs font-bold leading-tight">
                              {item.label}
                            </span>
                            <span
                              className={cn(
                                'text-[11px] mt-0.5',
                                isSelected ? 'text-white/90' : 'text-gray-500',
                              )}
                            >
                              {item.subLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Party Size Selector */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                        <Users className="mr-1.5 inline h-4 w-4 text-brand-500" />
                        Party Size
                      </label>
                      <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full">
                        {selectedGuests} {selectedGuests === 1 ? 'Guest' : 'Guests'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {guestPresets.map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setSelectedGuests(num)}
                          className={cn(
                            'h-12 rounded-xl text-sm font-semibold transition-all flex items-center justify-center',
                            selectedGuests === num
                              ? 'bg-brand-500 text-white shadow-sm ring-2 ring-brand-500'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/70',
                          )}
                        >
                          {num} {num === 1 ? 'guest' : 'guests'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Deposit Notice if applicable */}
                  {depositRequired && depositAmount > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">Deposit Policy</p>
                        <p className="mt-0.5 text-amber-800">
                          This restaurant requires a refundable booking deposit of
                          ৳{depositAmount} (৳
                          {depositAmount / (selectedGuests || 1)} per guest) to hold
                          the table.
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={() => setStep('time')}
                    className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl text-base shadow-md shadow-brand-500/20"
                  >
                    Select Time Slot
                    <ChevronRight className="ml-1 h-5 w-5" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Time Slot Picker */}
              {step === 'time' && (
                <motion.div
                  key="time"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="space-y-5"
                >
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        Available Times
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(selectedDate), 'EEEE, MMMM d')} •{' '}
                        {selectedGuests} guests
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep('date_party')}
                      className="text-xs text-brand-600 hover:text-brand-700"
                    >
                      Change Date
                    </Button>
                  </div>

                  {loadingSlots ? (
                    <div className="py-12 text-center">
                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-brand-500" />
                      <p className="mt-2 text-xs text-gray-500">
                        Checking restaurant table availability...
                      </p>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="py-10 text-center rounded-xl bg-gray-50 border border-dashed border-gray-300 p-6">
                      <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {availabilityMessage ||
                          'No available slots for this date'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Try selecting another date or a different party size.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                      {slots.map((slot) => {
                        const isSelected = selectedTime === slot.time24;
                        return (
                          <button
                            key={slot.time24}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => {
                              setSelectedTime(slot.time24);
                              setStep('details');
                            }}
                            className={cn(
                              'flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all min-h-[56px]',
                              !slot.available &&
                                'bg-gray-50/80 border-gray-200 text-gray-400 cursor-not-allowed opacity-60',
                              slot.available &&
                                !isSelected &&
                                'bg-white border-gray-200 hover:border-brand-500 hover:bg-brand-50/40 text-gray-800 shadow-sm',
                              slot.available &&
                                isSelected &&
                                'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-500',
                            )}
                          >
                            <span className="text-sm font-bold">
                              {slot.time}
                            </span>
                            {slot.available ? (
                              <span
                                className={cn(
                                  'text-[10px] mt-0.5 font-medium',
                                  isSelected
                                    ? 'text-white/90'
                                    : 'text-emerald-600',
                                )}
                              >
                                {slot.seatsLeft <= 4
                                  ? `${slot.seatsLeft} seats left`
                                  : 'Available'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 mt-0.5 truncate max-w-full">
                                {slot.reason || 'Booked'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('date_party')}
                      className="flex-1 h-11 rounded-xl"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      disabled={!selectedTime}
                      onClick={() => setStep('details')}
                      className="flex-1 h-11 bg-brand-500 hover:bg-brand-600 text-white rounded-xl"
                    >
                      Continue
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Contact & Special Requests */}
              {step === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="space-y-4"
                >
                  <div className="rounded-xl bg-brand-50 p-3 flex items-center justify-between text-xs text-brand-900 border border-brand-100">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-brand-600" />
                        {selectedGuests}
                      </span>
                      <span>•</span>
                      <span className="font-semibold flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-brand-600" />
                        {format(new Date(selectedDate), 'MMM d')}
                      </span>
                      <span>•</span>
                      <span className="font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-brand-600" />
                        {selectedTime}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep('time')}
                      className="font-bold text-brand-600 hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Full Name *
                      </label>
                      <Input
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Tanvir Ahmed"
                        className="h-11 rounded-xl"
                      />
                      {formErrors.contactName && (
                        <p className="text-[11px] text-red-500 mt-1">
                          {formErrors.contactName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Phone Number *
                      </label>
                      <Input
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+880 1712-345678"
                        className="h-11 rounded-xl"
                      />
                      {formErrors.contactPhone && (
                        <p className="text-[11px] text-red-500 mt-1">
                          {formErrors.contactPhone}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Email Address (Optional)
                      </label>
                      <Input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="h-11 rounded-xl"
                      />
                      {formErrors.contactEmail && (
                        <p className="text-[11px] text-red-500 mt-1">
                          {formErrors.contactEmail}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Special Requests (Optional)
                      </label>
                      <Textarea
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="Window seat, anniversary, high chair needed, dietary preferences..."
                        className="resize-none rounded-xl"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('time')}
                      className="flex-1 h-11 rounded-xl"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (validateDetails()) {
                          setStep('confirm');
                        }
                      }}
                      className="flex-1 h-11 bg-brand-500 hover:bg-brand-600 text-white rounded-xl"
                    >
                      Review Booking
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Summary & Confirm */}
              {step === 'confirm' && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="space-y-4"
                >
                  <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-2.5 text-xs">
                    <h4 className="font-bold text-sm text-gray-900 border-b pb-2">
                      Booking Summary
                    </h4>

                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Restaurant</span>
                      <span className="font-semibold text-gray-900">
                        {restaurant.name}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Date</span>
                      <span className="font-semibold text-gray-900">
                        {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Time</span>
                      <span className="font-semibold text-gray-900">
                        {selectedTime}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Guests</span>
                      <span className="font-semibold text-gray-900">
                        {selectedGuests} guests
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Guest Name</span>
                      <span className="font-semibold text-gray-900">
                        {contactName}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-semibold text-gray-900">
                        {contactPhone}
                      </span>
                    </div>

                    {specialRequests && (
                      <div className="pt-2 border-t">
                        <span className="text-gray-500 block mb-0.5">
                          Special Requests:
                        </span>
                        <p className="text-gray-800 italic">{specialRequests}</p>
                      </div>
                    )}

                    {depositRequired && depositAmount > 0 && (
                      <div className="pt-2 border-t flex justify-between items-center text-brand-800 font-bold">
                        <span>Required Deposit:</span>
                        <span className="text-sm">৳{depositAmount}</span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <p>
                      Please arrive 10 minutes prior to your booking. Your table
                      will be held for up to 15 minutes past reservation time.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('details')}
                      className="flex-1 h-12 rounded-xl"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleConfirmBooking}
                      className="flex-1 h-12 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl text-base shadow-md shadow-brand-500/25"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : depositRequired && depositAmount > 0 ? (
                        <>
                          <CreditCard className="mr-1.5 h-4 w-4" />
                          Pay Deposit (৳{depositAmount})
                        </>
                      ) : (
                        'Confirm Table'
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Success */}
              {step === 'success' && createdReservation && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4 space-y-4"
                >
                  <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                    <Check className="h-8 w-8 stroke-[3]" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Table Reserved!
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Your reservation at {restaurant.name} is confirmed.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 border border-gray-200/80 p-4 inline-block w-full text-left">
                    <div className="text-center pb-3 border-b mb-3">
                      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">
                        Reservation Code
                      </p>
                      <p className="text-2xl font-black tracking-wide text-brand-600 mt-0.5">
                        {createdReservation.reservationNumber}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                          Date
                        </span>
                        <span className="font-semibold text-gray-800">
                          {format(new Date(selectedDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                          Time
                        </span>
                        <span className="font-semibold text-gray-800">
                          {selectedTime}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                          Guests
                        </span>
                        <span className="font-semibold text-gray-800">
                          {selectedGuests} guests
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                          Status
                        </span>
                        <span className="font-semibold text-emerald-600 capitalize">
                          {createdReservation.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddToCalendar}
                      className="w-full h-11 rounded-xl text-xs font-semibold"
                    >
                      <CalendarPlus className="mr-2 h-4 w-4 text-brand-600" />
                      Add to Google Calendar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        handleClose();
                        navigate('/reservations');
                      }}
                      className="w-full h-11 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold"
                    >
                      View My Reservations
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unified Payment Modal for Deposit */}
      {paymentModalOpen && pendingReservationResult && (
        <UnifiedPaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          amount={pendingReservationResult.depositAmount}
          purpose="reservation_deposit"
          reservationId={pendingReservationResult.reservation._id}
          title="Reservation Deposit"
          description={`Secure your table booking at ${restaurant.name}`}
          showCodOption={false}
          onSuccess={handleDepositSuccess}
          onCancel={() => setPaymentModalOpen(false)}
        />
      )}
    </>
  );
};

export default BookingModal;
