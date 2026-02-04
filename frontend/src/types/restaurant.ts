// Restaurant and Booking Types

export interface Restaurant {
  id: number;
  name: string;
  type: RestaurantType;
  cuisine: CuisineType;
  rating: number;
  reviewCount: number;
  address: string;
  distance?: number; // in km
  priceRange?: PriceRange;
  image: string;
  images?: string[];
  isFavorite: boolean;
  isRecommended?: boolean;
  recommendedReason?: string;
  amenities: AmenityType[];
  openingHours?: OpeningHours;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export type RestaurantType =
  | "restaurant"
  | "cafe"
  | "fast-food"
  | "bar"
  | "bakery";

export type CuisineType =
  | "bengali"
  | "sylheti"
  | "indian"
  | "chinese"
  | "continental"
  | "italian"
  | "american"
  | "middle-eastern"
  | "thai"
  | "japanese"
  | "mexican";

export type AmenityType =
  | "wifi"
  | "kids"
  | "garden"
  | "card-payment"
  | "parking"
  | "to-go"
  | "outdoor-seating"
  | "private-dining"
  | "wheelchair-accessible"
  | "pet-friendly";

export type PriceRange = "$" | "$$" | "$$$" | "$$$$";

export interface OpeningHours {
  [key: string]: {
    open: string;
    close: string;
    isClosed?: boolean;
  };
}

export interface FilterCategory {
  id: string;
  label: string;
  count: number;
}

export interface FilterState {
  types: string[];
  cuisines: string[];
  amenities: string[];
  rating: number;
  distance: number;
  priceRange: PriceRange[];
  sortBy: SortOption;
}

export type SortOption =
  | "recommended"
  | "rating-high"
  | "rating-low"
  | "distance"
  | "reviews"
  | "name-asc"
  | "name-desc";

// Booking Types
export interface BookingFormData {
  restaurantId: number;
  guests: number;
  date: Date;
  time: string;
  specialRequests?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

export interface BookingSlot {
  time: string;
  available: boolean;
  tablesLeft?: number;
}

export interface Booking {
  id: string;
  restaurant: Restaurant;
  guests: number;
  date: string;
  time: string;
  status: BookingStatus;
  confirmationCode?: string;
  specialRequests?: string;
  createdAt: string;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

// Search and Filter Types
export interface SearchFilters {
  query?: string;
  guests?: number;
  date?: string;
  time?: string;
  location?: string;
}

// Pagination
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// API Response Types
export interface RestaurantListResponse {
  data: Restaurant[];
  pagination: PaginationState;
}

export interface BookingResponse {
  success: boolean;
  data?: Booking;
  error?: string;
}
