import Container from "@/components/public/Container";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { fadeInUp } from "@/lib/motion";
import apiService from "@/services/apiService";
import type {
  Booking,
  FilterCategory,
  FilterState,
  PriceRange,
  Restaurant,
  SearchFilters,
  SortOption,
} from "@/types/restaurant";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  CalendarRange,
  MapPin,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
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

const sortLabels: Record<SortOption, string> = {
  recommended: "Recommended",
  "rating-high": "Top rated",
  "rating-low": "Lowest rated",
  distance: "Nearest",
  reviews: "Most reviewed",
  "name-asc": "Name (A–Z)",
  "name-desc": "Name (Z–A)",
};

const priceOptions: PriceRange[] = ["$", "$$", "$$$", "$$$$"];

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

const defaultFilterState: FilterState = {
  types: [],
  cuisines: [],
  amenities: [],
  rating: 0,
  distance: 50,
  priceRange: [],
  sortBy: "recommended",
};

const ITEMS_PER_PAGE = 9;
const TOP_RATED_THRESHOLD = 4.5;
const NEARBY_THRESHOLD_KM = 5;

const RestaurantsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Restaurant data state
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Text search (seeded from ?q=, then driven locally for instant filtering)
  const [textSearch, setTextSearch] = useState(() => searchParams.get("q") ?? "");

  // Filter states
  const [filterState, setFilterState] =
    useState<FilterState>(defaultFilterState);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [showReservation, setShowReservation] = useState(false);

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
      toast.error("Error", {
        description: "Failed to load restaurants.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        const count = restaurants.filter(
          (restaurant) => restaurant.type === type,
        ).length;
        return { id: type, label: typeLabelMap[type], count };
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

  // ── Filter handlers ──────────────────────────────────────────────
  const handleFilterChange = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilterState((prev) => ({ ...prev, [key]: value }));
      setDisplayCount(ITEMS_PER_PAGE);
    },
    [],
  );

  const handleClearAllFilters = useCallback(() => {
    setFilterState(defaultFilterState);
    setTextSearch("");
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

  const handleTextSearch = useCallback((value: string) => {
    setTextSearch(value);
    setDisplayCount(ITEMS_PER_PAGE);
  }, []);

  const toggleCuisine = useCallback(
    (cuisine: string) => {
      const next = filterState.cuisines.includes(cuisine)
        ? filterState.cuisines.filter((entry) => entry !== cuisine)
        : [...filterState.cuisines, cuisine];
      handleFilterChange("cuisines", next);
    },
    [filterState.cuisines, handleFilterChange],
  );

  const togglePrice = useCallback(
    (price: PriceRange) => {
      const next = filterState.priceRange.includes(price)
        ? filterState.priceRange.filter((entry) => entry !== price)
        : [...filterState.priceRange, price];
      handleFilterChange("priceRange", next);
    },
    [filterState.priceRange, handleFilterChange],
  );

  const topRatedActive = filterState.rating >= TOP_RATED_THRESHOLD;
  const nearbyActive = filterState.distance <= NEARBY_THRESHOLD_KM;

  const activeFilterCount =
    filterState.cuisines.length +
    filterState.types.length +
    filterState.amenities.length +
    filterState.priceRange.length +
    (filterState.rating > 0 ? 1 : 0) +
    (filterState.distance < 50 ? 1 : 0) +
    (textSearch.trim() ? 1 : 0);

  // ── Filtering & sorting ──────────────────────────────────────────
  const filteredRestaurants = useMemo(() => {
    let result = [...restaurants];

    if (textSearch.trim()) {
      const q = textSearch.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          r.address?.toLowerCase().includes(q),
      );
    }

    if (filterState.types.length > 0) {
      result = result.filter((r) => filterState.types.includes(r.type));
    }

    if (filterState.cuisines.length > 0) {
      result = result.filter((r) => filterState.cuisines.includes(r.cuisine));
    }

    if (filterState.amenities.length > 0) {
      result = result.filter((r) =>
        filterState.amenities.every((amenity) =>
          r.amenities.includes(amenity as never),
        ),
      );
    }

    if (filterState.priceRange.length > 0) {
      result = result.filter(
        (r) => r.priceRange !== undefined && filterState.priceRange.includes(r.priceRange),
      );
    }

    if (filterState.rating > 0) {
      result = result.filter((r) => r.rating >= filterState.rating);
    }

    if (filterState.distance < 50) {
      result = result.filter(
        (r) => r.distance !== undefined && r.distance <= filterState.distance,
      );
    }

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

  const displayedRestaurants = useMemo(
    () => filteredRestaurants.slice(0, displayCount),
    [filteredRestaurants, displayCount],
  );

  const recommendedRestaurants = useMemo(
    () => displayedRestaurants.filter((r) => r.isRecommended),
    [displayedRestaurants],
  );

  const regularRestaurants = useMemo(
    () => displayedRestaurants.filter((r) => !r.isRecommended),
    [displayedRestaurants],
  );

  const hasMore = displayCount < filteredRestaurants.length;

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);
    setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
    setIsLoadingMore(false);
  }, []);

  // Infinite scroll: auto-load when the sentinel scrolls into view
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore]);

  // ── Restaurant interactions ──────────────────────────────────────
  const handleFavoriteToggle = useCallback(
    (id: string | number) => {
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r)),
      );
      const restaurant = restaurants.find((r) => r.id === id);
      if (restaurant) {
        toast.success(
          restaurant.isFavorite
            ? "Removed from favorites"
            : "Added to favorites",
          { description: restaurant.name },
        );
      }
    },
    [restaurants],
  );

  const handleBookClick = useCallback((restaurant: Restaurant) => {
    setBookingRestaurant(restaurant);
    setBookingModalOpen(true);
  }, []);

  const handleCardClick = useCallback(
    (restaurant: Restaurant) => navigate(`/restaurants/${restaurant.id}`),
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

  const handleRestaurantSelect = useCallback(
    (restaurant: Restaurant | null) => setSelectedRestaurant(restaurant),
    [],
  );

  const handleBookingComplete = useCallback(
    (booking: Booking) => {
      toast.success("Booking Confirmed!", {
        description: `Table booked at ${booking.restaurant.name} for ${booking.date} at ${booking.time}`,
      });
    },
    [],
  );

  const handleMapToggle = useCallback(() => {
    setIsMapView((prev) => !prev);
    setSelectedRestaurant(null);
  }, []);

  const renderGrid = (list: Restaurant[]) => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      {list.map((restaurant) => (
        <RestaurantCard
          key={restaurant.id}
          restaurant={restaurant}
          onFavoriteToggle={handleFavoriteToggle}
          onBookClick={handleBookClick}
          onViewMapClick={handleViewInMapClick}
          onCardClick={handleCardClick}
          onImageClick={handleImageClick}
          isSelected={selectedRestaurant?.id === restaurant.id}
        />
      ))}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* ── Hero / search band ───────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-gray-100 bg-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-brand-100/50 to-transparent blur-3xl" />
          <div className="absolute -bottom-32 right-1/4 h-[420px] w-[420px] rounded-full bg-gradient-to-tl from-red-100/40 to-transparent blur-3xl" />
        </div>
        <Container className="relative z-10 pt-28 pb-8">
          <motion.div variants={fadeInUp} initial="hidden" animate="visible">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-brand-600">
              <MapPin className="h-4 w-4" />
              Delivering across Sylhet
            </div>
            <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
              Find your next meal
            </h1>
            <p className="mt-1 text-gray-500">
              {isLoading
                ? "Loading restaurants…"
                : `${filteredRestaurants.length} ${
                    filteredRestaurants.length === 1 ? "place" : "places"
                  } ready to deliver`}
            </p>

            {/* Search */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={textSearch}
                  onChange={(e) => handleTextSearch(e.target.value)}
                  placeholder="Search restaurants, cuisines, or dishes…"
                  className="h-14 w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-12 text-base shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  aria-label="Search restaurants"
                />
                {textSearch && (
                  <button
                    onClick={() => handleTextSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="xl"
                onClick={() => setShowReservation((prev) => !prev)}
                className="gap-2 rounded-2xl"
              >
                <CalendarRange className="h-5 w-5" />
                Book a table
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {showReservation && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4">
                    <BookingControls
                      filters={searchFilters}
                      onFiltersChange={handleSearchFiltersChange}
                      onSearch={handleSearch}
                      isLoading={isLoading}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </Container>
      </section>

      {/* ── Sticky toolbar: cuisines + quick filters ─────────────── */}
      <div className="sticky top-20 z-30 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <Container className="py-3">
          <div className="flex items-center gap-3">
            {/* Cuisine rail */}
            <div className="flex flex-1 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <FilterChip
                active={filterState.cuisines.length === 0}
                onClick={() => handleFilterChange("cuisines", [])}
              >
                All
              </FilterChip>
              {cuisineFilters.map((cuisine) => (
                <FilterChip
                  key={cuisine.id}
                  active={filterState.cuisines.includes(cuisine.id)}
                  onClick={() => toggleCuisine(cuisine.id)}
                >
                  {cuisine.label}
                </FilterChip>
              ))}
            </div>

            {/* Sort + map (desktop) */}
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              <Select
                value={filterState.sortBy}
                onValueChange={(value) =>
                  handleFilterChange("sortBy", value as SortOption)
                }
              >
                <SelectTrigger className="h-10 w-[170px] rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {sortLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <MapViewToggle isMapView={isMapView} onToggle={handleMapToggle} />
            </div>
          </div>

          {/* Quick filter chips */}
          <div className="mt-2 flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterChip
              icon={<Star className="h-3.5 w-3.5" />}
              active={topRatedActive}
              onClick={() =>
                handleFilterChange("rating", topRatedActive ? 0 : TOP_RATED_THRESHOLD)
              }
            >
              Top rated
            </FilterChip>
            <FilterChip
              icon={<MapPin className="h-3.5 w-3.5" />}
              active={nearbyActive}
              onClick={() =>
                handleFilterChange("distance", nearbyActive ? 50 : NEARBY_THRESHOLD_KM)
              }
            >
              Nearby
            </FilterChip>
            {priceOptions.map((price) => (
              <FilterChip
                key={price}
                active={filterState.priceRange.includes(price)}
                onClick={() => togglePrice(price)}
              >
                {price}
              </FilterChip>
            ))}
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearAllFilters}
                className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-gray-500 transition hover:text-brand-600"
              >
                <X className="h-3.5 w-3.5" />
                Clear ({activeFilterCount})
              </button>
            )}
          </div>
        </Container>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <Container className="py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <FiltersPanel
            typeFilters={typeFilters}
            cuisineFilters={cuisineFilters}
            amenityFilters={amenityFilters}
            filterState={filterState}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearAllFilters}
            resultCount={filteredRestaurants.length}
          />

          <main className="min-w-0 flex-1" aria-label="Restaurant listings">
            {/* Mobile sort + map */}
            <div className="mb-5 flex items-center gap-2 lg:hidden">
              <Select
                value={filterState.sortBy}
                onValueChange={(value) =>
                  handleFilterChange("sortBy", value as SortOption)
                }
              >
                <SelectTrigger className="h-10 flex-1 rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {sortLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <MapViewToggle isMapView={isMapView} onToggle={handleMapToggle} />
            </div>

            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                >
                  <RestaurantCardSkeleton count={6} />
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
                    onAction={
                      hasLoadError
                        ? () => void loadRestaurants()
                        : handleClearAllFilters
                    }
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
                  {recommendedRestaurants.length > 0 && (
                    <section className="mb-10" aria-labelledby="recommended-heading">
                      <div className="mb-4 flex items-center gap-2">
                        <Award className="h-5 w-5 text-brand-500" />
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
                      {renderGrid(recommendedRestaurants)}
                    </section>
                  )}

                  {recommendedRestaurants.length > 0 &&
                    regularRestaurants.length > 0 && (
                      <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-gray-50/60 px-4 text-sm font-medium text-gray-500">
                            All restaurants
                          </span>
                        </div>
                      </div>
                    )}

                  {regularRestaurants.length > 0 && (
                    <section aria-labelledby="all-restaurants-heading">
                      {recommendedRestaurants.length === 0 && (
                        <h2
                          id="all-restaurants-heading"
                          className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900"
                        >
                          <Sparkles className="h-5 w-5 text-brand-500" />
                          All restaurants
                        </h2>
                      )}
                      {renderGrid(regularRestaurants)}
                    </section>
                  )}

                  {/* Infinite-scroll sentinel + fallback button */}
                  {hasMore && (
                    <div ref={loadMoreRef} className="mt-10 text-center">
                      {isLoadingMore ? (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                          <RestaurantCardSkeleton count={3} />
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={handleLoadMore}
                          className="rounded-full px-8"
                        >
                          Load more
                          <span className="ml-2 text-sm text-gray-400">
                            ({filteredRestaurants.length - displayCount} more)
                          </span>
                        </Button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </Container>

      <RestaurantMapView
        restaurants={filteredRestaurants}
        selectedRestaurant={selectedRestaurant}
        onRestaurantSelect={handleRestaurantSelect}
        onBookClick={handleBookClick}
        onClose={handleMapToggle}
        isOpen={isMapView}
      />

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

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const FilterChip: React.FC<FilterChipProps> = ({
  active,
  onClick,
  icon,
  children,
}) => (
  <button
    onClick={onClick}
    className={cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
      active
        ? "border-brand-500 bg-brand-50 text-brand-700"
        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50",
    )}
    aria-pressed={active}
  >
    {icon}
    {children}
  </button>
);

export default RestaurantsPage;
