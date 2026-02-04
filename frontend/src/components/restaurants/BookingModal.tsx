import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Star,
  Check,
  AlertCircle,
  Loader2,
  CalendarPlus,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// Badge import removed - not currently used
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/utils/cn";
import { useToast } from "@/hooks/use-toast";
import type { Restaurant, BookingSlot, Booking } from "@/types/restaurant";

// Validation schema
const bookingSchema = z.object({
  guests: z
    .number()
    .min(1, "At least 1 guest required")
    .max(20, "Maximum 20 guests"),
  date: z.string().min(1, "Please select a date"),
  time: z.string().min(1, "Please select a time"),
  contactName: z.string().min(2, "Name is required"),
  contactPhone: z.string().min(10, "Valid phone number required"),
  contactEmail: z.string().email("Valid email required"),
  specialRequests: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingModalProps {
  restaurant: Restaurant | null;
  isOpen: boolean;
  onClose: () => void;
  onBookingComplete?: (booking: Booking) => void;
  initialGuests?: number;
  initialDate?: string;
  initialTime?: string;
}

// Mock time slots - in production this would come from API
const generateTimeSlots = (_date: string): BookingSlot[] => {
  const slots: BookingSlot[] = [];
  const baseHour = 12;

  for (let hour = baseHour; hour <= 21; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 21 && minute === 30) continue;

      const hour12 = hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? "PM" : "AM";

      // Random availability for demo
      const available = Math.random() > 0.2;
      const tablesLeft = available ? Math.floor(Math.random() * 5) + 1 : 0;

      slots.push({
        time: `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`,
        available,
        tablesLeft: available ? tablesLeft : undefined,
      });
    }
  }

  return slots;
};

// Quick date options
const getQuickDates = () => {
  const today = new Date();
  return [
    { label: "Today", date: format(today, "yyyy-MM-dd"), isToday: true },
    {
      label: "Tomorrow",
      date: format(addDays(today, 1), "yyyy-MM-dd"),
      isToday: false,
    },
    {
      label: format(addDays(today, 2), "EEE"),
      date: format(addDays(today, 2), "yyyy-MM-dd"),
      isToday: false,
    },
    {
      label: format(addDays(today, 3), "EEE"),
      date: format(addDays(today, 3), "yyyy-MM-dd"),
      isToday: false,
    },
  ];
};

// Guest options
const guestOptions = [1, 2, 3, 4, 5, 6, 7, 8];

// Booking steps
type BookingStep = "select" | "details" | "confirm" | "success";

const BookingModal: React.FC<BookingModalProps> = ({
  restaurant,
  isOpen,
  onClose,
  onBookingComplete,
  initialGuests = 2,
  initialDate,
  initialTime,
}) => {
  const [step, setStep] = useState<BookingStep>("select");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState(initialGuests);
  const [selectedDate, setSelectedDate] = useState(
    initialDate || format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedTime, setSelectedTime] = useState(initialTime || "");
  const [confirmationCode, setConfirmationCode] = useState("");
  const { toast } = useToast();

  // Generate time slots based on selected date
  const timeSlots = useMemo(
    () => generateTimeSlots(selectedDate),
    [selectedDate],
  );
  const quickDates = useMemo(() => getQuickDates(), []);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      guests: initialGuests,
      date: selectedDate,
      time: selectedTime,
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      specialRequests: "",
    },
  });

  // Update form when selections change
  React.useEffect(() => {
    form.setValue("guests", selectedGuests);
    form.setValue("date", selectedDate);
    form.setValue("time", selectedTime);
  }, [selectedGuests, selectedDate, selectedTime, form]);

  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time);
    setStep("details");
  }, []);

  const handleBack = useCallback(() => {
    if (step === "details") {
      setStep("select");
    } else if (step === "confirm") {
      setStep("details");
    }
  }, [step]);

  const handleDetailsSubmit = useCallback(() => {
    setStep("confirm");
  }, []);

  const handleConfirmBooking = useCallback(async () => {
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate confirmation code
      const code = `BK${Date.now().toString(36).toUpperCase()}`;
      setConfirmationCode(code);

      // Mock booking response
      const booking: Booking = {
        id: code,
        restaurant: restaurant!,
        guests: selectedGuests,
        date: selectedDate,
        time: selectedTime,
        status: "confirmed",
        confirmationCode: code,
        specialRequests: form.getValues("specialRequests"),
        createdAt: new Date().toISOString(),
      };

      setStep("success");

      toast({
        title: "Booking Confirmed!",
        description: `Your table at ${restaurant?.name} is booked.`,
      });

      onBookingComplete?.(booking);
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    restaurant,
    selectedGuests,
    selectedDate,
    selectedTime,
    form,
    toast,
    onBookingComplete,
  ]);

  const handleClose = useCallback(() => {
    // Reset state on close
    setStep("select");
    setSelectedTime("");
    form.reset();
    onClose();
  }, [form, onClose]);

  const handleAddToCalendar = useCallback(() => {
    // Generate Google Calendar link
    const startDate = new Date(
      `${selectedDate}T${selectedTime.replace(
        /(\d+):(\d+)\s*(AM|PM)/i,
        (_, h, m, p) => {
          let hour = parseInt(h);
          if (p.toUpperCase() === "PM" && hour !== 12) hour += 12;
          if (p.toUpperCase() === "AM" && hour === 12) hour = 0;
          return `${hour.toString().padStart(2, "0")}:${m}`;
        },
      )}:00`,
    );

    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    const formatGoogleDate = (date: Date) =>
      date.toISOString().replace(/-|:|\.\d+/g, "");

    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", `Dinner at ${restaurant?.name}`);
    url.searchParams.set(
      "dates",
      `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    );
    url.searchParams.set("location", restaurant?.address || "");
    url.searchParams.set(
      "details",
      `Booking for ${selectedGuests} guests. Confirmation: ${confirmationCode}`,
    );

    window.open(url.toString(), "_blank");
  }, [
    restaurant,
    selectedDate,
    selectedTime,
    selectedGuests,
    confirmationCode,
  ]);

  if (!restaurant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <img
              src={restaurant.image}
              alt=""
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div>
              <DialogTitle className="text-left">{restaurant.name}</DialogTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Star className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                <span>{restaurant.rating}</span>
                <span>•</span>
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate max-w-[150px]">
                  {restaurant.address}
                </span>
              </div>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Book a table at {restaurant.name}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Date, Time & Guests */}
          {step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Guest Selection */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  <Users className="w-4 h-4 inline mr-2" />
                  Party Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {guestOptions.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedGuests(num)}
                      className={cn(
                        "w-10 h-10 rounded-lg text-sm font-medium transition-all",
                        selectedGuests === num
                          ? "bg-orange-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                      )}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedGuests(10)}
                    className={cn(
                      "px-4 h-10 rounded-lg text-sm font-medium transition-all",
                      selectedGuests > 8
                        ? "bg-orange-500 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                    )}
                  >
                    9+
                  </button>
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Date
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {quickDates.map((option) => (
                    <button
                      key={option.date}
                      type="button"
                      onClick={() => setSelectedDate(option.date)}
                      className={cn(
                        "flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        selectedDate === option.date
                          ? "bg-orange-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                      )}
                    >
                      <div>{option.label}</div>
                      <div className="text-xs opacity-80">
                        {format(new Date(option.date), "MMM d")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Available Times
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() =>
                        slot.available && handleTimeSelect(slot.time)
                      }
                      disabled={!slot.available}
                      className={cn(
                        "py-2 px-3 rounded-lg text-sm font-medium transition-all",
                        !slot.available &&
                          "opacity-50 cursor-not-allowed bg-gray-50 text-gray-400 line-through",
                        slot.available && selectedTime === slot.time
                          ? "bg-orange-500 text-white shadow-md"
                          : slot.available &&
                              "bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-600",
                      )}
                    >
                      {slot.time}
                      {slot.tablesLeft !== undefined &&
                        slot.tablesLeft <= 2 && (
                          <div className="text-xs text-orange-600">
                            {slot.tablesLeft} left
                          </div>
                        )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Contact Details */}
          {step === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Booking Summary */}
              <div className="bg-orange-50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-orange-500" />
                    {selectedGuests}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    {format(new Date(selectedDate), "MMM d")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-orange-500" />
                    {selectedTime}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  Edit
                </Button>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleDetailsSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+880 1XXX-XXXXXX"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialRequests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Requests (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="High chair needed, birthday celebration, dietary requirements..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-orange-500 hover:bg-orange-600"
                    >
                      Continue
                    </Button>
                  </div>
                </form>
              </Form>
            </motion.div>
          )}

          {/* Step 3: Confirm Booking */}
          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Booking Summary</h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Restaurant</span>
                    <span className="font-medium">{restaurant.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium">
                      {format(new Date(selectedDate), "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Party Size</span>
                    <span className="font-medium">{selectedGuests} guests</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contact</span>
                    <span className="font-medium">
                      {form.getValues("contactName")}
                    </span>
                  </div>
                  {form.getValues("specialRequests") && (
                    <div className="pt-2 border-t">
                      <span className="text-gray-500 block mb-1">
                        Special Requests
                      </span>
                      <span className="text-gray-700">
                        {form.getValues("specialRequests")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800">
                  You'll receive a confirmation email and SMS. Please arrive 10
                  minutes before your reservation.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto"
              >
                <Check className="w-8 h-8 text-green-600" />
              </motion.div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  Booking Confirmed!
                </h3>
                <p className="text-gray-500">
                  Your table at {restaurant.name} is reserved
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 inline-block">
                <p className="text-sm text-gray-500 mb-1">Confirmation Code</p>
                <p className="text-2xl font-bold text-gray-900 tracking-wide">
                  {confirmationCode}
                </p>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {format(new Date(selectedDate), "EEEE, MMMM d, yyyy")}
                </p>
                <p>
                  <Clock className="w-4 h-4 inline mr-1" />
                  {selectedTime}
                </p>
                <p>
                  <Users className="w-4 h-4 inline mr-1" />
                  {selectedGuests} guests
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleAddToCalendar}
                  variant="outline"
                  className="w-full"
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Add to Calendar
                </Button>
                <Button
                  onClick={handleClose}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
