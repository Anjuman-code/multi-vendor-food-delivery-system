import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  MapPin,
  Heart,
  Search,
  Map,
  Users,
  Calendar,
  Clock,
  ChevronDown,
  Filter,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utils/cn";

// Types
interface Restaurant {
  id: number;
  name: string;
  type: string;
  cuisine: string;
  rating: number;
  reviewCount: number;
  address: string;
  image: string;
  isFavorite: boolean;
  isRecommended?: boolean;
  amenities: string[];
}

interface FilterCategory {
  id: string;
  label: string;
  count: number;
}

// Sylhet Local Restaurants Data
const mockRestaurants: Restaurant[] = [
  {
    id: 1,
    name: "Panshi Restaurant",
    type: "restaurant",
    cuisine: "bengali",
    rating: 4.7,
    reviewCount: 523,
    address: "Zindabazar, Sylhet",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    isFavorite: true,
    isRecommended: true,
    amenities: ["card-payment", "parking", "kids"],
  },
  {
    id: 2,
    name: "Pach Bhai Restaurant",
    type: "restaurant",
    cuisine: "bengali",
    rating: 4.5,
    reviewCount: 412,
    address: "Amberkhana, Sylhet",
    image:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: true,
    amenities: ["card-payment", "to-go"],
  },
  {
    id: 3,
    name: "Satkora Restaurant",
    type: "restaurant",
    cuisine: "sylheti",
    rating: 4.8,
    reviewCount: 289,
    address: "Bondor Bazar, Sylhet",
    image:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: true,
    amenities: ["garden", "parking", "kids"],
  },
  {
    id: 4,
    name: "Cafe Mezban",
    type: "cafe",
    cuisine: "continental",
    rating: 4.3,
    reviewCount: 178,
    address: "Shahjalal Upashahar, Sylhet",
    image:
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["card-payment", "wifi"],
  },
  {
    id: 5,
    name: "Woondaal",
    type: "restaurant",
    cuisine: "bengali",
    rating: 4.6,
    reviewCount: 345,
    address: "Upashahar, Sylhet",
    image:
      "https://images.unsplash.com/photo-1579027989536-b7b1f875659b?auto=format&fit=crop&w=800&q=80",
    isFavorite: true,
    isRecommended: false,
    amenities: ["card-payment", "parking", "garden"],
  },
  {
    id: 6,
    name: "Pizza Inn Sylhet",
    type: "fast-food",
    cuisine: "italian",
    rating: 4.2,
    reviewCount: 234,
    address: "Zindabazar, Sylhet",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["card-payment", "to-go", "kids"],
  },
  {
    id: 7,
    name: "The Daily Grind",
    type: "cafe",
    cuisine: "continental",
    rating: 4.4,
    reviewCount: 156,
    address: "Subhanighat, Sylhet",
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["wifi", "card-payment"],
  },
  {
    id: 8,
    name: "Khana Khazana",
    type: "restaurant",
    cuisine: "indian",
    rating: 4.5,
    reviewCount: 267,
    address: "Mendibagh, Sylhet",
    image:
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["card-payment", "parking"],
  },
  {
    id: 9,
    name: "Foodie's Paradise",
    type: "restaurant",
    cuisine: "chinese",
    rating: 4.1,
    reviewCount: 189,
    address: "Lamabazar, Sylhet",
    image:
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["to-go", "card-payment"],
  },
  {
    id: 10,
    name: "Arabian Nights",
    type: "restaurant",
    cuisine: "middle-eastern",
    rating: 4.3,
    reviewCount: 145,
    address: "Subidbazar, Sylhet",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
    isFavorite: true,
    isRecommended: false,
    amenities: ["parking", "garden"],
  },
  {
    id: 11,
    name: "KFC Sylhet",
    type: "fast-food",
    cuisine: "american",
    rating: 4.0,
    reviewCount: 456,
    address: "Kumarpara, Sylhet",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["card-payment", "to-go", "kids", "parking"],
  },
  {
    id: 12,
    name: "Chillox Sylhet",
    type: "fast-food",
    cuisine: "american",
    rating: 4.2,
    reviewCount: 312,
    address: "Zindabazar, Sylhet",
    image:
      "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["card-payment", "to-go"],
  },
];

const typeFilters: FilterCategory[] = [
  { id: "restaurant", label: "Restaurants", count: 6 },
  { id: "cafe", label: "Cafes", count: 2 },
  { id: "fast-food", label: "Fast Food", count: 3 },
];

const foodFilters: FilterCategory[] = [
  { id: "bengali", label: "Bengali", count: 3 },
  { id: "sylheti", label: "Sylheti", count: 1 },
  { id: "indian", label: "Indian", count: 1 },
  { id: "chinese", label: "Chinese", count: 1 },
  { id: "continental", label: "Continental", count: 2 },
  { id: "italian", label: "Italian", count: 1 },
  { id: "american", label: "American", count: 2 },
  { id: "middle-eastern", label: "Middle Eastern", count: 1 },
];

const amenityFilters: FilterCategory[] = [
  { id: "wifi", label: "WiFi", count: 2 },
  { id: "kids", label: "Kid Friendly", count: 4 },
  { id: "garden", label: "Garden", count: 3 },
  { id: "card-payment", label: "Card Payment", count: 10 },
  { id: "parking", label: "Parking", count: 5 },
  { id: "to-go", label: "Takeaway", count: 5 },
];

// Guest options
const guestOptions = [
  "1 Guest",
  "2 Guests",
  "3 Guests",
  "4 Guests",
  "5+ Guests",
];
const timeOptions = [
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const cardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const collapseVariants = {
  open: { height: "auto", opacity: 1 },
  closed: { height: 0, opacity: 0 },
};

// Filter Section Component
interface FilterSectionProps {
  title: string;
  filters: FilterCategory[];
  selectedFilters: string[];
  onFilterChange: (id: string) => void;
  searchable?: boolean;
  defaultOpen?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  filters,
  selectedFilters,
  onFilterChange,
  searchable = false,
  defaultOpen = true,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const filteredFilters = useMemo(() => {
    if (!searchTerm) return filters;
    return filters.filter((f) =>
      f.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [filters, searchTerm]);

  const selectedCount = filters.filter((f) =>
    selectedFilters.includes(f.id),
  ).length;

  return (
    <motion.div variants={itemVariants} className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 group"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {selectedCount > 0 && (
            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
              {selectedCount}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-orange-500 transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={collapseVariants}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-3">
              {searchable && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm bg-gray-50 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                  />
                </div>
              )}
              <div className="space-y-2">
                {filteredFilters.map((filter) => (
                  <motion.label
                    key={filter.id}
                    className="flex items-center gap-3 cursor-pointer group"
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Checkbox
                      checked={selectedFilters.includes(filter.id)}
                      onCheckedChange={() => onFilterChange(filter.id)}
                      className="border-gray-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors flex-1">
                      {filter.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({filter.count})
                    </span>
                  </motion.label>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Restaurant Card Component
interface RestaurantCardProps {
  restaurant: Restaurant;
  onFavoriteToggle: (id: number) => void;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onFavoriteToggle,
}) => {
  const typeLabel =
    restaurant.type === "fast-food"
      ? "Fast Food"
      : restaurant.type.charAt(0).toUpperCase() + restaurant.type.slice(1);
  const cuisineLabel =
    restaurant.cuisine.charAt(0).toUpperCase() + restaurant.cuisine.slice(1);

  return (
    <motion.div
      variants={cardVariants}
      layout
      whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col md:flex-row transition-shadow duration-300"
    >
      {/* Image Section */}
      <div className="relative w-full md:w-72 h-48 md:h-auto flex-shrink-0 overflow-hidden">
        <motion.img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.4 }}
        />
        {/* Rating Badge */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 shadow-sm">
          <Star className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
          <span className="text-sm font-bold text-gray-900">
            {restaurant.rating}/5
          </span>
          <span className="text-xs text-gray-500">
            ({restaurant.reviewCount} reviews)
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1 hover:text-orange-600 transition-colors cursor-pointer truncate">
            {restaurant.name}
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            {typeLabel}, {cuisineLabel}
          </p>
          <div className="flex items-center gap-1.5 text-gray-600">
            <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="text-sm truncate">{restaurant.address}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 rounded-lg transition-colors"
            size="sm"
          >
            Book a table
          </Button>
          <motion.button
            onClick={() => onFavoriteToggle(restaurant.id)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "p-2 rounded-full transition-colors",
              restaurant.isFavorite
                ? "text-red-500 bg-red-50"
                : "text-gray-400 hover:text-red-500 hover:bg-red-50",
            )}
          >
            <Heart
              className={cn("w-5 h-5", restaurant.isFavorite && "fill-current")}
            />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// Dropdown Select Component with actual functionality
interface DropdownSelectProps {
  icon: React.ReactNode;
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

const DropdownSelect: React.FC<DropdownSelectProps> = ({
  icon,
  label,
  options,
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50/50 transition-colors group min-w-[140px]"
      >
        <span className="text-gray-400 group-hover:text-orange-500 transition-colors">
          {icon}
        </span>
        <span className="text-sm text-gray-600 flex-1 text-left">
          {value || label}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden"
            >
              {options.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm hover:bg-orange-50 transition-colors",
                    value === option
                      ? "bg-orange-50 text-orange-600 font-medium"
                      : "text-gray-700",
                  )}
                >
                  {option}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Date Picker Component
interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange }) => {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50/50 transition-colors group">
        <Calendar className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm text-gray-600 bg-transparent border-none outline-none cursor-pointer"
          min={new Date().toISOString().split("T")[0]}
        />
      </div>
    </div>
  );
};

// Main RestaurantsPage Component
const RestaurantsPage: React.FC = () => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [restaurants, setRestaurants] = useState(mockRestaurants);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Form state for booking filters
  const [guests, setGuests] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleTypeChange = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleFoodChange = (id: string) => {
    setSelectedFoods((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleAmenityChange = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleFavoriteToggle = (id: number) => {
    setRestaurants((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r)),
    );
  };

  // Filter restaurants based on selected filters
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
      // Type filter
      if (
        selectedTypes.length > 0 &&
        !selectedTypes.includes(restaurant.type)
      ) {
        return false;
      }

      // Cuisine filter
      if (
        selectedFoods.length > 0 &&
        !selectedFoods.includes(restaurant.cuisine)
      ) {
        return false;
      }

      // Amenities filter (must have ALL selected amenities)
      if (selectedAmenities.length > 0) {
        const hasAllAmenities = selectedAmenities.every((amenity) =>
          restaurant.amenities.includes(amenity),
        );
        if (!hasAllAmenities) {
          return false;
        }
      }

      return true;
    });
  }, [restaurants, selectedTypes, selectedFoods, selectedAmenities]);

  const recommendedRestaurants = useMemo(
    () => filteredRestaurants.filter((r) => r.isRecommended),
    [filteredRestaurants],
  );

  const allRestaurants = useMemo(
    () => filteredRestaurants.filter((r) => !r.isRecommended),
    [filteredRestaurants],
  );

  const totalActiveFilters =
    selectedTypes.length + selectedFoods.length + selectedAmenities.length;

  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSelectedFoods([]);
    setSelectedAmenities([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/50 via-white to-red-50/30 overflow-x-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-100/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-red-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 pt-8 pb-16 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowMobileFilters(true)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {totalActiveFilters > 0 && (
                <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {totalActiveFilters}
                </span>
              )}
            </Button>
            {totalActiveFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear all
              </Button>
            )}
          </div>

          {/* Mobile Filters Overlay */}
          <AnimatePresence>
            {showMobileFilters && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 lg:hidden"
                onClick={() => setShowMobileFilters(false)}
              >
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {totalActiveFilters > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-orange-600 hover:text-orange-700 mb-4"
                    >
                      Clear all filters
                    </button>
                  )}
                  <FilterSection
                    title="Type"
                    filters={typeFilters}
                    selectedFilters={selectedTypes}
                    onFilterChange={handleTypeChange}
                  />
                  <FilterSection
                    title="Cuisine"
                    filters={foodFilters}
                    selectedFilters={selectedFoods}
                    onFilterChange={handleFoodChange}
                    searchable
                  />
                  <FilterSection
                    title="Amenities"
                    filters={amenityFilters}
                    selectedFilters={selectedAmenities}
                    onFilterChange={handleAmenityChange}
                    searchable
                  />
                  <Button
                    onClick={() => setShowMobileFilters(false)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-4"
                  >
                    Show {filteredRestaurants.length} Results
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Sidebar Filters */}
          <motion.aside
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="hidden lg:block w-64 flex-shrink-0"
          >
            <div className="sticky top-24 space-y-1">
              {totalActiveFilters > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-orange-600 hover:text-orange-700 mb-3 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear all filters
                </button>
              )}
              <FilterSection
                title="Type"
                filters={typeFilters}
                selectedFilters={selectedTypes}
                onFilterChange={handleTypeChange}
              />
              <FilterSection
                title="Cuisine"
                filters={foodFilters}
                selectedFilters={selectedFoods}
                onFilterChange={handleFoodChange}
                searchable
              />
              <FilterSection
                title="Amenities"
                filters={amenityFilters}
                selectedFilters={selectedAmenities}
                onFilterChange={handleAmenityChange}
                searchable
                defaultOpen={false}
              />
            </div>
          </motion.aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4"
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Sylhet
                </h1>
                <p className="text-gray-500 mt-1">
                  {filteredRestaurants.length} restaurants found
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 text-orange-600 font-medium hover:text-orange-700 transition-colors self-start sm:self-auto"
              >
                <Map className="w-4 h-4" />
                Show on map
              </motion.button>
            </motion.div>

            {/* Booking Filter Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8"
            >
              <p className="text-sm text-gray-600 mb-4">
                See places with free tables on your chosen date
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <DropdownSelect
                  icon={<Users className="w-4 h-4" />}
                  label="Guests"
                  options={guestOptions}
                  value={guests}
                  onChange={setGuests}
                />
                <DatePicker value={date} onChange={setDate} />
                <DropdownSelect
                  icon={<Clock className="w-4 h-4" />}
                  label="Time"
                  options={timeOptions}
                  value={time}
                  onChange={setTime}
                />
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  Show locals
                </Button>
              </div>
            </motion.div>

            {/* No Results */}
            {filteredRestaurants.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="text-gray-400 mb-4">
                  <Search className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No restaurants found
                </h3>
                <p className="text-gray-500 mb-4">
                  Try adjusting your filters to see more results
                </p>
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  Clear all filters
                </Button>
              </motion.div>
            )}

            {/* Recommended Section */}
            <AnimatePresence mode="wait">
              {recommendedRestaurants.length > 0 && (
                <motion.section
                  key="recommended"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-10"
                >
                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-lg font-semibold text-gray-900 mb-4"
                  >
                    Recommended
                  </motion.h2>
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    <AnimatePresence>
                      {recommendedRestaurants.map((restaurant) => (
                        <RestaurantCard
                          key={restaurant.id}
                          restaurant={restaurant}
                          onFavoriteToggle={handleFavoriteToggle}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* All Restaurants Section */}
            <AnimatePresence mode="wait">
              {allRestaurants.length > 0 && (
                <motion.section
                  key="all"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-lg font-semibold text-gray-900 mb-4"
                  >
                    All Restaurants
                  </motion.h2>
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    <AnimatePresence>
                      {allRestaurants.map((restaurant) => (
                        <RestaurantCard
                          key={restaurant.id}
                          restaurant={restaurant}
                          onFavoriteToggle={handleFavoriteToggle}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Load More */}
            {filteredRestaurants.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-10 text-center"
              >
                <Button
                  variant="outline"
                  className="px-8 border-gray-300 hover:border-orange-400 hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-all"
                >
                  Load more restaurants
                </Button>
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default RestaurantsPage;
