import React, { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Calendar as CalendarIcon, Clock, Search } from "lucide-react";
import { format, isValid, isBefore, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/utils/cn";
import type { SearchFilters } from "@/types/restaurant";

// Generate guest options
const guestOptions = [
  { value: "1", label: "1 Guest" },
  { value: "2", label: "2 Guests" },
  { value: "3", label: "3 Guests" },
  { value: "4", label: "4 Guests" },
  { value: "5", label: "5 Guests" },
  { value: "6", label: "6 Guests" },
  { value: "7", label: "7 Guests" },
  { value: "8", label: "8+ Guests" },
];

// Generate time options (12 PM to 10 PM, 30-min intervals)
const generateTimeOptions = () => {
  const options: { value: string; label: string }[] = [];
  for (let hour = 12; hour <= 22; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 22 && minute === 30) continue;
      const time24 = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      const hour12 = hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? "PM" : "AM";
      const label = `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;
      options.push({ value: time24, label });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

interface BookingControlsProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

const BookingControls: React.FC<BookingControlsProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  isLoading = false,
}) => {
  const [dateOpen, setDateOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Parse the date from filters
  const selectedDate = useMemo(() => {
    if (!filters.date) return undefined;
    const date = new Date(filters.date);
    return isValid(date) ? date : undefined;
  }, [filters.date]);

  // Validate date (not in the past)
  const validateDate = useCallback((date: Date | undefined): boolean => {
    if (!date) return true;
    const today = startOfDay(new Date());
    if (isBefore(date, today)) {
      setErrors((prev) => ({ ...prev, date: "Please select a future date" }));
      return false;
    }
    setErrors((prev) => {
      const { date: _, ...rest } = prev;
      return rest;
    });
    return true;
  }, []);

  const handleGuestsChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, guests: parseInt(value, 10) });
    },
    [filters, onFiltersChange],
  );

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (date && validateDate(date)) {
        onFiltersChange({ ...filters, date: format(date, "yyyy-MM-dd") });
        setDateOpen(false);
      }
    },
    [filters, onFiltersChange, validateDate],
  );

  const handleTimeChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, time: value });
    },
    [filters, onFiltersChange],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Validate before searching
      let valid = true;
      if (selectedDate && !validateDate(selectedDate)) {
        valid = false;
      }

      if (valid) {
        onSearch();
      }
    },
    [selectedDate, validateDate, onSearch],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8"
      role="search"
      aria-label="Restaurant search filters"
    >
      <p className="text-sm text-gray-600 mb-4">
        See restaurants with free tables on your chosen date
      </p>

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        {/* Guests Select */}
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="guests-select" className="sr-only">
            Number of guests
          </label>
          <Select
            value={filters.guests?.toString() || ""}
            onValueChange={handleGuestsChange}
          >
            <SelectTrigger
              id="guests-select"
              className="w-full h-11 bg-white border-gray-300 hover:border-orange-300 focus:border-orange-400 focus:ring-orange-200 shadow-sm"
              aria-describedby="guests-hint"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" aria-hidden="true" />
                <SelectValue placeholder="Guests" />
              </div>
            </SelectTrigger>
            <SelectContent className="z-50 bg-white shadow-lg border border-gray-200">
              {guestOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span id="guests-hint" className="sr-only">
            Select the number of guests for your booking
          </span>
        </div>

        {/* Date Picker */}
        <div className="flex-1 min-w-[160px]">
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-full h-11 flex items-center gap-2 px-3 bg-white border rounded-md text-sm transition-colors shadow-sm",
                  "hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2",
                  errors.date
                    ? "border-red-300 focus:ring-red-400"
                    : "border-gray-300",
                  !selectedDate && "text-gray-500",
                )}
                aria-label={
                  selectedDate
                    ? `Selected date: ${format(selectedDate, "MMMM d, yyyy")}`
                    : "Select a date"
                }
                aria-invalid={!!errors.date}
                aria-describedby={errors.date ? "date-error" : "date-hint"}
                onKeyDown={handleKeyDown}
              >
                <CalendarIcon
                  className="w-4 h-4 text-gray-400"
                  aria-hidden="true"
                />
                {selectedDate ? (
                  format(selectedDate, "MMM d, yyyy")
                ) : (
                  <span>Select date</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 z-50 bg-white shadow-lg border border-gray-200"
              align="start"
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.date && (
            <p id="date-error" className="text-xs text-red-500 mt-1">
              {errors.date}
            </p>
          )}
          <span id="date-hint" className="sr-only">
            Select the date for your restaurant booking. Format: Month Day, Year
          </span>
        </div>

        {/* Time Select */}
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="time-select" className="sr-only">
            Preferred time
          </label>
          <Select value={filters.time || ""} onValueChange={handleTimeChange}>
            <SelectTrigger
              id="time-select"
              className="w-full h-11 bg-white border-gray-300 hover:border-orange-300 focus:border-orange-400 focus:ring-orange-200 shadow-sm"
              aria-describedby="time-hint"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                <SelectValue placeholder="Time" />
              </div>
            </SelectTrigger>
            <SelectContent className="z-50 bg-white shadow-lg border border-gray-200">
              {timeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span id="time-hint" className="sr-only">
            Select your preferred dining time
          </span>
        </div>

        {/* Search Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-orange-500 hover:bg-orange-600 text-white h-11 px-6 min-w-[140px]"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" aria-hidden="true" />
              Find Tables
            </>
          )}
        </Button>
      </div>

      {/* Active filters summary for screen readers */}
      <div className="sr-only" role="status" aria-live="polite">
        {filters.guests && `${filters.guests} guests selected.`}
        {filters.date && `Date: ${filters.date}.`}
        {filters.time && `Time: ${filters.time}.`}
      </div>
    </motion.form>
  );
};

export default BookingControls;
