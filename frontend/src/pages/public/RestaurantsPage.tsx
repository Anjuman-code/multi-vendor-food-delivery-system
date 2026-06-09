import {
  BookingControls,
  BookingModal,
  EmptyState,
  FiltersPanel,
  ImageGalleryModal,
  MapViewToggle,
  RestaurantCard,
  RestaurantCardSkeleton,
  RestaurantMapView,
} from "@/components/restaurants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import apiService from "@/services/apiService";
import type {
  Booking,
  FilterCategory,
  FilterState,
  Restaurant,
  SearchFilters,
  SortOption,
} from "@/types/restaurant";
import { AnimatePresence, motion } from "framer-motion";
import { Award } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface ApiRestaurant {
  _id: string;
  name: string;
  cuisineType?: string[];
  rating?: { average?: number; count?: number };
  address?: {
    street?: string;
    area?: string;
    city?: string;
    district?: string;
    coordinates?: { lat?: number; lng?: number };
  };
  location?: {
    coordinates?: number[];
  };
  images?: { logo?: string; coverPhoto?: string; gallery?: string[] };
  serviceOptions?: string[];
  paymentMethods?: string[];
  tags?: string[];
  deliveryTime?: { min?: number; max?: number };
  deliveryFee?: number;
  priceRange?: number;
  isTemporarilyClosed?: boolean;
}

interface ApiRestaurantsResponse {
  success?: boolean;
  count?: number;
  data?: ApiRestaurant[];
}

interface ApiPopularRestaurantsResponse {
  success?: boolean;
  data?: {
    restaurants?: ApiRestaurant[];
  };
}

const SYLHET_CENTER = { lat: 24.8949, lng: 91.8687 };

const mapCuisine = (cuisine?: string): Restaurant["cuisine"] => {
  const normalized = cuisine?.toLowerCase() || "continental";
  if (
    normalized.includes("sylheti") ||
    normalized.includes("bengali") ||
    normalized.includes("bangladeshi")
  ) {
    return "bengali";
  }
  if (normalized.includes("indian")) return "indian";
  if (normalized.includes("chinese")) return "chinese";
  if (normalized.includes("italian") || normalized.includes("pizza")) {
    return "italian";
  }
  if (normalized.includes("american") || normalized.includes("burger")) {
    return "american";
  }
  if (normalized.includes("thai")) return "thai";
  if (normalized.includes("japanese")) return "japanese";
  if (normalized.includes("mexican")) return "mexican";
  if (normalized.includes("middle")) return "middle-eastern";
  return "continental";
};

const inferType = (restaurant: ApiRestaurant): Restaurant["type"] => {
  const value = `${restaurant.name} ${(restaurant.cuisineType || []).join(" ")}`
    .toLowerCase();
  if (value.includes("cafe") || value.includes("coffee")) return "cafe";
  if (
    value.includes("fast") ||
    value.includes("burger") ||
    value.includes("pizza") ||
    value.includes("kfc") ||
    value.includes("chillox")
  ) {
    return "fast-food";
  }
  return "restaurant";
};

const toPriceRange = (
  schemaPriceRange?: number,
  deliveryFee?: number,
): Restaurant["priceRange"] | undefined => {
  if (schemaPriceRange === 1) return "$";
  if (schemaPriceRange === 2) return "$$";
  if (schemaPriceRange === 3) return "$$$";
  if (schemaPriceRange === 4) return "$$$$";
  if (typeof deliveryFee === "number") {
    if (deliveryFee <= 30) return "$";
    if (deliveryFee <= 60) return "$$";
    return "$$$";
  }
  return undefined;
};

const toAmenities = (restaurant: ApiRestaurant): Restaurant["amenities"] => {
  const amenities = new Set<Restaurant["amenities"][number]>();
  const paymentMethods = (restaurant.paymentMethods || []).map((method) =>
    method.toLowerCase(),
  );
  const serviceOptions = (restaurant.serviceOptions || []).map((option) =>
    option.toLowerCase(),
  );
  const tags = (restaurant.tags || []).map((tag) => tag.toLowerCase());

  if (
    paymentMethods.some(
      (method) => method.includes("card") || method.includes("visa"),
    )
  ) {
    amenities.add("card-payment");
  }

  if (serviceOptions.includes("takeaway")) {
    amenities.add("to-go");
  }

  if (tags.some((tag) => tag.includes("wifi"))) amenities.add("wifi");
  if (tags.some((tag) => tag.includes("parking"))) amenities.add("parking");
  if (tags.some((tag) => tag.includes("kids") || tag.includes("family"))) {
    amenities.add("kids");
  }
  if (tags.some((tag) => tag.includes("garden"))) amenities.add("garden");

  return Array.from(amenities);
};

const extractCoordinates = (restaurant: ApiRestaurant) => {
  const addressCoords = restaurant.address?.coordinates;
  if (
    typeof addressCoords?.lat === "number" &&
    typeof addressCoords?.lng === "number"
  ) {
    return { lat: addressCoords.lat, lng: addressCoords.lng };
  }

  const locationCoordinates = restaurant.location?.coordinates;
  if (
    Array.isArray(locationCoordinates) &&
    locationCoordinates.length === 2 &&
    typeof locationCoordinates[0] === "number" &&
    typeof locationCoordinates[1] === "number"
  ) {
    return { lat: locationCoordinates[1], lng: locationCoordinates[0] };
  }

  return undefined;
};

const haversineKm = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const mapRestaurant = (
  item: ApiRestaurant,
  recommendedRestaurantIds: Set<string>,
): Restaurant => {
  const avgRating = item.rating?.average ?? 0;
  const coordinates = extractCoordinates(item);
  const distance = coordinates
    ? haversineKm(SYLHET_CENTER, coordinates)
    : undefined;
  const address = [
    item.address?.street,
    item.address?.area,
    item.address?.city,
    item.address?.district,
  ]
    .filter(Boolean)
    .join(", ");
  const isRecommended =
    recommendedRestaurantIds.has(item._id) || avgRating >= 4.5;

  return {
    id: item._id,
    name: item.name,
    type: inferType(item),
    cuisine: mapCuisine(item.cuisineType?.[0]),
    rating: avgRating,
    reviewCount: item.rating?.count ?? 0,
    address: address || "Address unavailable",
    distance,
    image: item.images?.coverPhoto || item.images?.logo || "",
    images: [item.images?.coverPhoto, ...(item.images?.gallery || [])].filter(
      (image): image is string => Boolean(image),
    ),
    isFavorite: false,
    isRecommended,
    recommendedReason: isRecommended
      ? `Highly rated ${avgRating.toFixed(1)}/5`
      : undefined,
    amenities: toAmenities(item),
    priceRange: toPriceRange(item.priceRange, item.deliveryFee),
    coordinates,
  };
};

const cuisineLabelMap: Record<Restaurant["cuisine"], string> = {
  bengali: "Bengali",
  sylheti: "Sylheti",
  indian: "Indian",
  chinese: "Chinese",
  continental: "Continental",
  italian: "Italian",
  american: "American",
  "middle-eastern": "Middle Eastern",
  thai: "Thai",
  japanese: "Japanese",
  mexican: "Mexican",
};

const amenityLabelMap: Record<Restaurant["amenities"][number], string> = {
  wifi: "WiFi",
  kids: "Kid Friendly",
  garden: "Garden",
  "card-payment": "Card Payment",
  parking: "Parking",
  "to-go": "Takeaway",
  "outdoor-seating": "Outdoor Seating",
  "private-dining": "Private Dining",
  "wheelchair-accessible": "Wheelchair Accessible",
  "pet-friendly": "Pet Friendly",
};

const typeLabelMap: Record<Restaurant["type"], string> = {
  restaurant: "Restaurants",
  cafe: "Cafes",
  "fast-food": "Fast Food",
  bar: "Bars",
  bakery: "Bakeries",
};

// ============================================================================
// Animation Variants
// ============================================================================

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

// ============================================================================
// Default Filter State
// ============================================================================

const defaultFilterState: FilterState = {
  types: [],
  cuisines: [],
  amenities: [],
  rating: 0,
  distance: 50,
  priceRange: [],
  sortBy: "recommended",
};

// ============================================================================
// Items per page for pagination
// ============================================================================

const ITEMS_PER_PAGE = 6;

// ============================================================================
// Main RestaurantsPage Component
// ============================================================================

const RestaurantsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Restaurant data state
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Text search from URL
  const [textSearch, setTextSearch] = useState(() => searchParams.get("q") ?? "");

  // Filter states
  const [filterState, setFilterState] =
    useState<FilterState>(defaultFilterState);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});

  // UI states
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [isMapView, setIsMapView] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  // Modal states
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingRestaurant, setBookingRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryRestaurant, setGalleryRestaurant] = useState<Restaurant | null>(
    null,
  );

  const loadRestaurants = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);

    try {
      const [restaurantsResult, popularResult] = await Promise.allSettled([
        apiService.getAllRestaurants(),
        apiService.getPopularRestaurants(12),
      ]);

      if (restaurantsResult.status !== "fulfilled") {
        throw new Error("Unable to fetch restaurants");
      }

      const restaurantsPayload = restaurantsResult.value
        .data as ApiRestaurantsResponse;
      const allRestaurants = Array.isArray(restaurantsPayload.data)
        ? restaurantsPayload.data
        : [];

      const popularRestaurants =
        popularResult.status === "fulfilled"
          ? ((popularResult.value.data as ApiPopularRestaurantsResponse)?.data
              ?.restaurants ?? [])
          : [];

      const recommendedRestaurantIds = new Set(
        popularRestaurants.map((restaurant) => restaurant._id),
      );

      const normalizedRestaurants =
        allRestaurants.length > 0 ? allRestaurants : popularRestaurants;

      setRestaurants(
        normalizedRestaurants.map((restaurant) =>
          mapRestaurant(restaurant, recommendedRestaurantIds),
        ),
      );
    } catch {
      setRestaurants([]);
      setHasLoadError(true);
      toast({
        title: "Error",
        description: "Failed to load restaurants.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadRestaurants();
  }, [loadRestaurants]);

  useEffect(() => {
    setTextSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  const typeFilters = useMemo<FilterCategory[]>(() => {
    const typeOrder: Restaurant["type"][] = [
      "restaurant",
      "cafe",
      "fast-food",
      "bar",
      "bakery",
    ];

    return typeOrder
      .map((type) => {
        const count = restaurants.filter((restaurant) => restaurant.type === type)
          .length;
        return {
          id: type,
          label: typeLabelMap[type],
          count,
        };
      })
      .filter((entry) => entry.count > 0);
  }, [restaurants]);

  const cuisineFilters = useMemo<FilterCategory[]>(() => {
    const counts = restaurants.reduce(
      (acc, restaurant) => {
        acc[restaurant.cuisine] = (acc[restaurant.cuisine] || 0) + 1;
        return acc;
      },
      {} as Partial<Record<Restaurant["cuisine"], number>>,
    );

    return Object.keys(counts)
      .map((key) => key as Restaurant["cuisine"])
      .map((cuisine) => ({
        id: cuisine,
        label: cuisineLabelMap[cuisine],
        count: counts[cuisine] || 0,
      }))
      .filter((entry) => entry.count > 0)
      .sort((left, right) => right.count - left.count);
  }, [restaurants]);

  const amenityFilters = useMemo<FilterCategory[]>(() => {
    const counts = restaurants.reduce(
      (acc, restaurant) => {
        restaurant.amenities.forEach((amenity) => {
          acc[amenity] = (acc[amenity] || 0) + 1;
        });
        return acc;
      },
      {} as Partial<Record<Restaurant["amenities"][number], number>>,
    );

    return Object.keys(counts)
      .map((key) => key as Restaurant["amenities"][number])
      .map((amenity) => ({
        id: amenity,
        label: amenityLabelMap[amenity],
        count: counts[amenity] || 0,
      }))
      .filter((entry) => entry.count > 0)
      .sort((left, right) => right.count - left.count);
  }, [restaurants]);

  // ============================================================================
  // Filter handlers
  // ============================================================================

  const handleFilterChange = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilterState((prev) => ({ ...prev, [key]: value }));
      setDisplayCount(ITEMS_PER_PAGE); // Reset pagination on filter change
    },
    [],
  );

  const handleClearAllFilters = useCallback(() => {
    setFilterState(defaultFilterState);
    setDisplayCount(ITEMS_PER_PAGE);
  }, []);

  const handleSearchFiltersChange = useCallback((filters: SearchFilters) => {
    setSearchFilters(filters);
  }, []);

  const handleSearch = useCallback(async () => {
    const nextQuery = (searchFilters.query || "").trim();
    setTextSearch(nextQuery);
    setDisplayCount(ITEMS_PER_PAGE);
    await loadRestaurants();
  }, [loadRestaurants, searchFilters.query]);

  // ============================================================================
  // Restaurant filtering and sorting
  // ============================================================================

  const filteredRestaurants = useMemo(() => {
    let result = [...restaurants];

    // Text search filter (from URL param or local state)
    if (textSearch.trim()) {
      const q = textSearch.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          r.address?.toLowerCase().includes(q),
      );
    }

    // Type filter
    if (filterState.types.length > 0) {
      result = result.filter((r) => filterState.types.includes(r.type));
    }

    // Cuisine filter
    if (filterState.cuisines.length > 0) {
      result = result.filter((r) => filterState.cuisines.includes(r.cuisine));
    }    // Amenities filter (must have ALL selected amenities)
    if (filterState.amenities.length > 0) {
      result = result.filter((r) =>
        filterState.amenities.every((amenity) =>
          r.amenities.includes(amenity as never),
        ),
      );
    }

    // Rating filter
    if (filterState.rating > 0) {
      result = result.filter((r) => r.rating >= filterState.rating);
    }

    // Distance filter
    if (filterState.distance < 50) {
      result = result.filter(
        (r) => r.distance !== undefined && r.distance <= filterState.distance,
      );
    }

    // Sort
    const sortFunctions: Record<
      SortOption,
      (a: Restaurant, b: Restaurant) => number
    > = {
      recommended: (a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return b.rating - a.rating;
      },
      "rating-high": (a, b) => b.rating - a.rating,
      "rating-low": (a, b) => a.rating - b.rating,
      distance: (a, b) => (a.distance || 0) - (b.distance || 0),
      reviews: (a, b) => b.reviewCount - a.reviewCount,
      "name-asc": (a, b) => a.name.localeCompare(b.name),
      "name-desc": (a, b) => b.name.localeCompare(a.name),
    };

    result.sort(sortFunctions[filterState.sortBy]);

    return result;
  }, [restaurants, filterState, textSearch]);

  // Paginated results
  const displayedRestaurants = useMemo(
    () => filteredRestaurants.slice(0, displayCount),
    [filteredRestaurants, displayCount],
  );

  // Recommended restaurants
  const recommendedRestaurants = useMemo(
    () => displayedRestaurants.filter((r) => r.isRecommended),
    [displayedRestaurants],
  );

  // Non-recommended restaurants
  const regularRestaurants = useMemo(
    () => displayedRestaurants.filter((r) => !r.isRecommended),
    [displayedRestaurants],
  );

  const hasMore = displayCount < filteredRestaurants.length;

  // ============================================================================
  // Infinite scroll / Load more
  // ============================================================================

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);
    setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
    setIsLoadingMore(false);
  }, []);

  // Optional: Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          // Auto-load more when scrolled to bottom (optional)
          // handleLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore]);

  // ============================================================================
  // Restaurant interaction handlers
  // ============================================================================

  const handleFavoriteToggle = useCallback(
    (id: string | number) => {
      setRestaurants((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, isFavorite: !r.isFavorite } : r,
        ),
      );

      const restaurant = restaurants.find((r) => r.id === id);
      if (restaurant) {
        toast({
          title: restaurant.isFavorite
            ? "Removed from favorites"
            : "Added to favorites",
          description: restaurant.name,
        });
      }
    },
    [restaurants, toast],
  );

  const handleBookClick = useCallback((restaurant: Restaurant) => {
    setBookingRestaurant(restaurant);
    setBookingModalOpen(true);
  }, []);

  const handleCardClick = useCallback(
    (restaurant: Restaurant) => {
      // Navigate to restaurant detail page
      navigate(`/restaurants/${restaurant.id}`);
    },
    [navigate],
  );

  const handleImageClick = useCallback(
    (restaurant: Restaurant) => {
      if (!restaurant.images || restaurant.images.length === 0) {
        navigate(`/restaurants/${restaurant.id}`);
        return;
      }
      setGalleryRestaurant(restaurant);
      setGalleryModalOpen(true);
    },
    [navigate],
  );

  const handleViewInMapClick = useCallback((restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsMapView(true);
  }, []);

  const handleRestaurantSelect = useCallback((restaurant: Restaurant | null) => {
    setSelectedRestaurant(restaurant);
  }, []);

  const handleBookingComplete = useCallback(
    (booking: Booking) => {
      toast({
        title: "Booking Confirmed!",
        description: `Table booked at ${booking.restaurant.name} for ${booking.date} at ${booking.time}`,
      });
    },
    [toast],
  );

  const handleMapToggle = useCallback(() => {
    setIsMapView((prev) => !prev);
    setSelectedRestaurant(null);
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-100/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-red-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Panel (Desktop sidebar + Mobile sheet) */}
          <FiltersPanel
            typeFilters={typeFilters}
            cuisineFilters={cuisineFilters}
            amenityFilters={amenityFilters}
            filterState={filterState}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearAllFilters}
            resultCount={filteredRestaurants.length}
          />

          {/* Main Content */}
          <main
            className="flex-1 min-w-0"
            role="main"
            aria-label="Restaurant listings"
          >
            {/* Header */}
            <motion.header
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
              <MapViewToggle isMapView={isMapView} onToggle={handleMapToggle} />
            </motion.header>

            {/* Booking Controls */}
            <BookingControls
              filters={searchFilters}
              onFiltersChange={handleSearchFiltersChange}
              onSearch={handleSearch}
              isLoading={isLoading}
            />

            {/* Restaurant List */}
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <RestaurantCardSkeleton count={3} />
                </motion.div>
              ) : filteredRestaurants.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <EmptyState
                    type={hasLoadError ? "error" : "no-filters"}
                    onAction={hasLoadError ? () => void loadRestaurants() : handleClearAllFilters}
                    actionLabel={hasLoadError ? "Try again" : "Clear all filters"}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Recommended Section */}
                  {recommendedRestaurants.length > 0 && (
                    <section
                      className="mb-10"
                      aria-labelledby="recommended-heading"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Award className="w-5 h-5 text-orange-500" />
                        <h2
                          id="recommended-heading"
                          className="text-lg font-semibold text-gray-900"
                        >
                          Recommended for you
                        </h2>
                        <Badge variant="orange" className="text-xs">
                          {recommendedRestaurants.length}
                        </Badge>
                      </div>
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 justify-items-start"
                      >
                        {recommendedRestaurants.map((restaurant) => (
                          <RestaurantCard
                            key={restaurant.id}
                            restaurant={restaurant}
                            onFavoriteToggle={handleFavoriteToggle}
                            onBookClick={handleBookClick}
                            onViewMapClick={handleViewInMapClick}
                            onCardClick={handleCardClick}
                            onImageClick={handleImageClick}
                            isSelected={
                              selectedRestaurant?.id === restaurant.id
                            }
                          />
                        ))}
                      </motion.div>
                    </section>
                  )}

                  {/* Visual Divider */}
                  {recommendedRestaurants.length > 0 &&
                    regularRestaurants.length > 0 && (
                      <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-gradient-to-br from-orange-50/50 via-white to-red-50/30 px-4 text-sm text-gray-500">
                            All Restaurants
                          </span>
                        </div>
                      </div>
                    )}

                  {/* All Restaurants Section */}
                  {regularRestaurants.length > 0 && (
                    <section aria-labelledby="all-restaurants-heading">
                      {recommendedRestaurants.length === 0 && (
                        <h2
                          id="all-restaurants-heading"
                          className="text-lg font-semibold text-gray-900 mb-4"
                        >
                          All Restaurants
                        </h2>
                      )}
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 justify-items-start"
                      >
                        {regularRestaurants.map((restaurant) => (
                          <RestaurantCard
                            key={restaurant.id}
                            restaurant={restaurant}
                            onFavoriteToggle={handleFavoriteToggle}
                            onBookClick={handleBookClick}
                            onViewMapClick={handleViewInMapClick}
                            onCardClick={handleCardClick}
                            onImageClick={handleImageClick}
                            isSelected={
                              selectedRestaurant?.id === restaurant.id
                            }
                          />
                        ))}
                      </motion.div>
                    </section>
                  )}

                  {/* Load More */}
                  {hasMore && (
                    <motion.div
                      ref={loadMoreRef}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-10 text-center"
                    >
                      {isLoadingMore ? (
                        <div className="space-y-4">
                          <RestaurantCardSkeleton count={2} />
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          className="px-8 border-gray-300 hover:border-orange-400 hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-all"
                        >
                          Load more restaurants
                          <span className="ml-2 text-sm text-gray-400">
                            ({filteredRestaurants.length - displayCount}{" "}
                            remaining)
                          </span>
                        </Button>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Map View Overlay */}
      <RestaurantMapView
        restaurants={filteredRestaurants}
        selectedRestaurant={selectedRestaurant}
        onRestaurantSelect={handleRestaurantSelect}
        onBookClick={handleBookClick}
        onClose={handleMapToggle}
        isOpen={isMapView}
      />

      {/* Booking Modal */}
      <BookingModal
        restaurant={bookingRestaurant}
        isOpen={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setBookingRestaurant(null);
        }}
        onBookingComplete={handleBookingComplete}
        initialGuests={searchFilters.guests}
        initialDate={searchFilters.date}
        initialTime={searchFilters.time}
      />

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        restaurant={galleryRestaurant}
        isOpen={galleryModalOpen}
        onClose={() => {
          setGalleryModalOpen(false);
          setGalleryRestaurant(null);
        }}
      />
    </div>
  );
};

export default RestaurantsPage;
