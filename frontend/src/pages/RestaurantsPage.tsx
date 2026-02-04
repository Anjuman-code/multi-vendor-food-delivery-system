import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  RestaurantCard,
  RestaurantCardSkeleton,
  FiltersPanel,
  BookingControls,
  BookingModal,
  RestaurantMapView,
  MapViewToggle,
  ImageGalleryModal,
  EmptyState,
} from "@/components/restaurants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  Restaurant,
  FilterState,
  FilterCategory,
  SearchFilters,
  SortOption,
  Booking,
} from "@/types/restaurant";

// ============================================================================
// Mock Data - Sylhet Local Restaurants
// ============================================================================

const mockRestaurants: Restaurant[] = [
  {
    id: 1,
    name: "Panshi Restaurant",
    type: "restaurant",
    cuisine: "bengali",
    rating: 4.7,
    reviewCount: 523,
    address: "Zindabazar, Sylhet",
    distance: 0.8,
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=800&q=80",
    ],
    isFavorite: true,
    isRecommended: true,
    recommendedReason: "Top rated in Sylhet — 4.7/5",
    amenities: ["card-payment", "parking", "kids"],
    priceRange: "$$",
    coordinates: { lat: 24.8949, lng: 91.8687 },
  },
  {
    id: 2,
    name: "Pach Bhai Restaurant",
    type: "restaurant",
    cuisine: "bengali",
    rating: 4.5,
    reviewCount: 412,
    address: "Amberkhana, Sylhet",
    distance: 1.2,
    image:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: true,
    recommendedReason: "Popular for Bengali cuisine",
    amenities: ["card-payment", "to-go"],
    priceRange: "$$",
    coordinates: { lat: 24.901, lng: 91.872 },
  },
  {
    id: 3,
    name: "Satkora Restaurant",
    type: "restaurant",
    cuisine: "sylheti",
    rating: 4.8,
    reviewCount: 289,
    address: "Bondor Bazar, Sylhet",
    distance: 1.5,
    image:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: true,
    recommendedReason: "Best Sylheti cuisine",
    amenities: ["garden", "parking", "kids"],
    priceRange: "$$$",
    coordinates: { lat: 24.892, lng: 91.865 },
  },
  {
    id: 4,
    name: "Cafe Mezban",
    type: "cafe",
    cuisine: "continental",
    rating: 4.3,
    reviewCount: 178,
    address: "Shahjalal Upashahar, Sylhet",
    distance: 2.1,
    image:
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["card-payment", "wifi"],
    priceRange: "$$",
    coordinates: { lat: 24.915, lng: 91.84 },
  },
  {
    id: 5,
    name: "Woondaal",
    type: "restaurant",
    cuisine: "bengali",
    rating: 4.6,
    reviewCount: 345,
    address: "Upashahar, Sylhet",
    distance: 2.3,
    image:
      "https://images.unsplash.com/photo-1579027989536-b7b1f875659b?auto=format&fit=crop&w=800&q=80",
    isFavorite: true,
    isRecommended: false,
    amenities: ["card-payment", "parking", "garden"],
    priceRange: "$$$",
    coordinates: { lat: 24.91, lng: 91.85 },
  },
  {
    id: 6,
    name: "Pizza Inn Sylhet",
    type: "fast-food",
    cuisine: "italian",
    rating: 4.2,
    reviewCount: 234,
    address: "Zindabazar, Sylhet",
    distance: 0.9,
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["card-payment", "to-go", "kids"],
    priceRange: "$$",
    coordinates: { lat: 24.8955, lng: 91.869 },
  },
  {
    id: 7,
    name: "The Daily Grind",
    type: "cafe",
    cuisine: "continental",
    rating: 4.4,
    reviewCount: 156,
    address: "Subhanighat, Sylhet",
    distance: 1.8,
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["wifi", "card-payment"],
    priceRange: "$",
    coordinates: { lat: 24.888, lng: 91.87 },
  },
  {
    id: 8,
    name: "Khana Khazana",
    type: "restaurant",
    cuisine: "indian",
    rating: 4.5,
    reviewCount: 267,
    address: "Mendibagh, Sylhet",
    distance: 2.5,
    image:
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["card-payment", "parking"],
    priceRange: "$$$",
    coordinates: { lat: 24.905, lng: 91.875 },
  },
  {
    id: 9,
    name: "Foodie's Paradise",
    type: "restaurant",
    cuisine: "chinese",
    rating: 4.1,
    reviewCount: 189,
    address: "Lamabazar, Sylhet",
    distance: 1.3,
    image:
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["to-go", "card-payment"],
    priceRange: "$$",
    coordinates: { lat: 24.893, lng: 91.868 },
  },
  {
    id: 10,
    name: "Arabian Nights",
    type: "restaurant",
    cuisine: "middle-eastern",
    rating: 4.3,
    reviewCount: 145,
    address: "Subidbazar, Sylhet",
    distance: 1.7,
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
    isFavorite: true,
    isRecommended: false,
    amenities: ["parking", "garden"],
    priceRange: "$$$",
    coordinates: { lat: 24.899, lng: 91.866 },
  },
  {
    id: 11,
    name: "KFC Sylhet",
    type: "fast-food",
    cuisine: "american",
    rating: 4.0,
    reviewCount: 456,
    address: "Kumarpara, Sylhet",
    distance: 0.6,
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["card-payment", "to-go", "kids", "parking"],
    priceRange: "$",
    coordinates: { lat: 24.897, lng: 91.8695 },
  },
  {
    id: 12,
    name: "Chillox Sylhet",
    type: "fast-food",
    cuisine: "american",
    rating: 4.2,
    reviewCount: 312,
    address: "Zindabazar, Sylhet",
    distance: 0.7,
    image:
      "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80",
    isFavorite: false,
    isRecommended: false,
    amenities: ["card-payment", "to-go"],
    priceRange: "$",
    coordinates: { lat: 24.896, lng: 91.8688 },
  },
];

// ============================================================================
// Filter Categories
// ============================================================================

const typeFilters: FilterCategory[] = [
  { id: "restaurant", label: "Restaurants", count: 6 },
  { id: "cafe", label: "Cafes", count: 2 },
  { id: "fast-food", label: "Fast Food", count: 3 },
];

const cuisineFilters: FilterCategory[] = [
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
  const { toast } = useToast();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Restaurant data state
  const [restaurants, setRestaurants] = useState<Restaurant[]>(mockRestaurants);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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

  const handleSearch = useCallback(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Search updated",
        description: `Showing restaurants ${searchFilters.date ? `for ${searchFilters.date}` : ""}`,
      });
    }, 500);
  }, [searchFilters, toast]);

  // ============================================================================
  // Restaurant filtering and sorting
  // ============================================================================

  const filteredRestaurants = useMemo(() => {
    let result = [...restaurants];

    // Type filter
    if (filterState.types.length > 0) {
      result = result.filter((r) => filterState.types.includes(r.type));
    }

    // Cuisine filter
    if (filterState.cuisines.length > 0) {
      result = result.filter((r) => filterState.cuisines.includes(r.cuisine));
    }

    // Amenities filter (must have ALL selected amenities)
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
  }, [restaurants, filterState]);

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
    // Simulate loading delay
    setTimeout(() => {
      setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
      setIsLoadingMore(false);
    }, 500);
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
    (id: number) => {
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

  const handleImageClick = useCallback((restaurant: Restaurant) => {
    setGalleryRestaurant(restaurant);
    setGalleryModalOpen(true);
  }, []);

  const handleRestaurantSelect = useCallback((restaurant: Restaurant) => {
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50/50 via-white to-red-50/30 overflow-x-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-100/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-red-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
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
                    type="no-filters"
                    onAction={handleClearAllFilters}
                    actionLabel="Clear all filters"
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
                        className="space-y-4"
                      >
                        {recommendedRestaurants.map((restaurant) => (
                          <RestaurantCard
                            key={restaurant.id}
                            restaurant={restaurant}
                            onFavoriteToggle={handleFavoriteToggle}
                            onBookClick={handleBookClick}
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
                        className="space-y-4"
                      >
                        {regularRestaurants.map((restaurant) => (
                          <RestaurantCard
                            key={restaurant.id}
                            restaurant={restaurant}
                            onFavoriteToggle={handleFavoriteToggle}
                            onBookClick={handleBookClick}
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
