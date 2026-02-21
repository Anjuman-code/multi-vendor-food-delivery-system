import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  MapPin,
  Star,
  Clock,
  Trash2,
  UtensilsCrossed,
  Search,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import userService from "../services/userService";

// ── Types for populated restaurant from backend ────────────────

interface FavoriteRestaurant {
  _id: string;
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  contactInfo: {
    phone: string;
    email: string;
    website?: string;
  };
  cuisineType: string[];
  images: {
    logo: string;
    coverPhoto: string;
    gallery: string[];
  };
  rating: {
    average: number;
    count: number;
  };
  deliveryTime: string;
  deliveryFee: number;
  minimumOrder: number;
  isActive: boolean;
}

// ── Skeleton Card ──────────────────────────────────────────────

const FavoriteCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <Skeleton className="h-48 w-full" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  </div>
);

// ── Component ──────────────────────────────────────────────────

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await userService.getFavorites();
      if (response.success && response.data) {
        setFavorites((response.data.favorites as FavoriteRestaurant[]) || []);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load favorites.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load favorites. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { state: { from: "/favorites" } });
      return;
    }
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated, authLoading, navigate, fetchFavorites]);

  const handleRemoveFavorite = async (restaurantId: string) => {
    setRemovingId(restaurantId);
    try {
      const response = await userService.removeFavorite(restaurantId);
      if (response.success) {
        setFavorites((prev) => prev.filter((r) => r._id !== restaurantId));
        toast({
          title: "Removed",
          description: "Restaurant removed from favorites.",
        });
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to remove from favorites.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
      setConfirmRemoveId(null);
    }
  };

  const filteredFavorites = favorites.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.cuisineType.some((c) => c.toLowerCase().includes(q)) ||
      r.address.city.toLowerCase().includes(q)
    );
  });

  const restaurantToRemove = favorites.find((r) => r._id === confirmRemoveId);

  // ── Empty state (no favorites at all) ────────────────────────
  const EmptyFavorites: React.FC = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
        <Heart className="w-12 h-12 text-orange-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No favorites yet
      </h3>
      <p className="text-gray-500 text-center max-w-md mb-8">
        Start exploring restaurants and save your favorites here for quick
        access. Tap the heart icon on any restaurant to add it.
      </p>
      <Button
        onClick={() => navigate("/restaurants")}
        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 rounded-full font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300"
      >
        <UtensilsCrossed className="w-5 h-5 mr-2" />
        Explore Restaurants
      </Button>
    </motion.div>
  );

  // ── No search results ────────────────────────────────────────
  const NoSearchResults: React.FC = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <Search className="w-12 h-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-700 mb-1">
        No matches found
      </h3>
      <p className="text-gray-500 text-sm">
        Try a different search term or{" "}
        <button
          onClick={() => setSearchQuery("")}
          className="text-orange-500 hover:text-orange-600 font-medium"
        >
          clear your search
        </button>
      </p>
    </motion.div>
  );

  return (
    <div className="min-h-[60vh] pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-50 via-white to-red-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-orange-600 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Heart className="w-8 h-8 text-red-500 fill-red-500" />
                My Favorites
              </h1>
              <p className="text-gray-500 mt-2">
                {isLoading
                  ? "Loading your favorite restaurants..."
                  : `${favorites.length} saved restaurant${favorites.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {/* Search */}
            {!isLoading && favorites.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative w-full sm:w-72"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search favorites..."
                  className="pl-9 bg-white/80 backdrop-blur-sm border-gray-200 focus:border-orange-300 rounded-xl"
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <FavoriteCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && favorites.length === 0 && <EmptyFavorites />}

        {/* No search results */}
        {!isLoading &&
          favorites.length > 0 &&
          filteredFavorites.length === 0 && <NoSearchResults />}

        {/* Favorites grid */}
        {!isLoading && filteredFavorites.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredFavorites.map((restaurant, index) => (
                <motion.div
                  key={restaurant._id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                  }}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-orange-100 transition-all duration-300 overflow-hidden"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={restaurant.images?.coverPhoto}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmRemoveId(restaurant._id);
                      }}
                      disabled={removingId === restaurant._id}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-red-50 hover:text-red-500 transition-all duration-200 group/btn"
                      aria-label={`Remove ${restaurant.name} from favorites`}
                    >
                      {removingId === restaurant._id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <Heart className="w-4 h-4 text-red-500 fill-red-500 group-hover/btn:scale-110 transition-transform" />
                      )}
                    </button>

                    {/* Rating badge */}
                    {restaurant.rating && restaurant.rating.average > 0 && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-semibold text-gray-900">
                          {restaurant.rating.average.toFixed(1)}
                        </span>
                        {restaurant.rating.count > 0 && (
                          <span className="text-xs text-gray-500">
                            ({restaurant.rating.count})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <Link
                    to={`/restaurants/${restaurant._id}`}
                    className="block p-5"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors line-clamp-1">
                      {restaurant.name}
                    </h3>

                    {restaurant.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {restaurant.description}
                      </p>
                    )}

                    {/* Cuisine tags */}
                    {restaurant.cuisineType &&
                      restaurant.cuisineType.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {restaurant.cuisineType.slice(0, 3).map((cuisine) => (
                            <Badge
                              key={cuisine}
                              variant="secondary"
                              className="text-xs bg-orange-50 text-orange-700 border-0 rounded-full px-2.5 py-0.5"
                            >
                              {cuisine}
                            </Badge>
                          ))}
                          {restaurant.cuisineType.length > 3 && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-gray-50 text-gray-500 border-0 rounded-full px-2.5 py-0.5"
                            >
                              +{restaurant.cuisineType.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                    {/* Meta info */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="line-clamp-1">
                          {restaurant.address?.city},{" "}
                          {restaurant.address?.state}
                        </span>
                      </div>
                      {restaurant.deliveryTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{restaurant.deliveryTime}</span>
                        </div>
                      )}
                    </div>

                    {/* Delivery info */}
                    {(restaurant.deliveryFee !== undefined ||
                      restaurant.minimumOrder !== undefined) && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-50 text-xs text-gray-400">
                        {restaurant.deliveryFee !== undefined && (
                          <span>
                            Delivery:{" "}
                            {restaurant.deliveryFee === 0
                              ? "Free"
                              : `$${restaurant.deliveryFee.toFixed(2)}`}
                          </span>
                        )}
                        {restaurant.minimumOrder !== undefined &&
                          restaurant.minimumOrder > 0 && (
                            <span>
                              Min: ${restaurant.minimumOrder.toFixed(2)}
                            </span>
                          )}
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Confirm removal dialog */}
      <Dialog
        open={!!confirmRemoveId}
        onOpenChange={(open) => !open && setConfirmRemoveId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Remove from favorites?
            </DialogTitle>
            <DialogDescription>
              {restaurantToRemove
                ? `Are you sure you want to remove "${restaurantToRemove.name}" from your favorites? You can always add it back later.`
                : "This restaurant will be removed from your favorites."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmRemoveId(null)}
              disabled={!!removingId}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmRemoveId) handleRemoveFavorite(confirmRemoveId);
              }}
              disabled={!!removingId}
            >
              {removingId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FavoritesPage;
