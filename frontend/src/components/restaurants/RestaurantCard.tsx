import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Restaurant } from "@/types/restaurant";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import { Heart, Map, MapPin, Star } from "lucide-react";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onFavoriteToggle: (id: string | number) => void;
  onBookClick: (restaurant: Restaurant) => void;
  onViewMapClick: (restaurant: Restaurant) => void;
  onCardClick: (restaurant: Restaurant) => void;
  onImageClick: (restaurant: Restaurant) => void;
  isSelected?: boolean;
  isLoading?: boolean;
}

const RestaurantCard: React.FC<RestaurantCardProps> = memo(
  ({
    restaurant,
    onFavoriteToggle,
    onBookClick,
    onViewMapClick,
    onCardClick,
    onImageClick,
    isSelected = false,
  }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Format type label
    const typeLabel =
      restaurant.type === "fast-food"
        ? "Fast Food"
        : restaurant.type.charAt(0).toUpperCase() + restaurant.type.slice(1);

    // Format cuisine label
    const cuisineLabel =
      restaurant.cuisine.charAt(0).toUpperCase() + restaurant.cuisine.slice(1);

    const distanceLabel =
      restaurant.distance === undefined
        ? null
        : restaurant.distance < 1
          ? `${Math.round(restaurant.distance * 1000)}m`
          : `${restaurant.distance.toFixed(1)}km`;

    const imageSrc = imageError || !restaurant.image
      ? "/table.png"
      : restaurant.image;

    // Handle image lazy loading
    useEffect(() => {
      if (imgRef.current && imgRef.current.complete) {
        setImageLoaded(true);
      }
    }, []);

    const handleImageLoad = useCallback(() => {
      setImageLoaded(true);
    }, []);

    const handleImageError = useCallback(() => {
      setImageError(true);
      setImageLoaded(true);
    }, []);

    const handleFavoriteClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onFavoriteToggle(restaurant.id);
      },
      [restaurant.id, onFavoriteToggle],
    );

    const handleBookClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onBookClick(restaurant);
      },
      [restaurant, onBookClick],
    );

    const handleImageClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onImageClick(restaurant);
      },
      [restaurant, onImageClick],
    );

    const handleCardClick = useCallback(() => {
      onCardClick(restaurant);
    }, [restaurant, onCardClick]);

    const handleViewMapClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onViewMapClick(restaurant);
      },
      [restaurant, onViewMapClick],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCardClick(restaurant);
        }
      },
      [restaurant, onCardClick],
    );

    return (
      <TooltipProvider>
        <motion.article
          layout
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          whileHover={{ y: -3, boxShadow: "0 14px 32px rgba(15,23,42,0.12)" }}
          onClick={handleCardClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="article"
          aria-label={`${restaurant.name} - ${typeLabel}, ${cuisineLabel}. Rating: ${restaurant.rating} out of 5 with ${restaurant.reviewCount} reviews. Located at ${restaurant.address}`}
          className={cn(
            "bg-white rounded-2xl overflow-hidden shadow-sm border flex flex-col w-full max-w-[430px] transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
            isSelected
              ? "border-brand-400 ring-2 ring-brand-100"
              : "border-gray-200/80",
          )}
        >
          {/* Image Section */}
          <button
            onClick={handleImageClick}
            className="relative w-full h-44 flex-shrink-0 overflow-hidden bg-gray-100 group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
            aria-label={`View photos of ${restaurant.name}`}
            type="button"
          >
            {/* Blur placeholder */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
            )}

            <img
              ref={imgRef}
              src={imageSrc}
              alt={`${restaurant.name} restaurant interior`}
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                imageLoaded || imageSrc === "/table.png"
                  ? "opacity-100"
                  : "opacity-0",
                "group-hover:scale-105",
              )}
              loading="lazy"
              decoding="async"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />

            <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-2">
              <div className="bg-white/95 backdrop-blur rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-sm border border-white/80">
                <Star
                  className="w-3.5 h-3.5 text-brand-500 fill-brand-500"
                  aria-hidden="true"
                />
                <span className="text-xs font-bold text-gray-900">
                  {restaurant.rating.toFixed(1)}
                </span>
                <span
                  className="text-[11px] text-gray-500"
                  aria-label={`${restaurant.reviewCount} reviews`}
                >
                  ({restaurant.reviewCount})
                </span>
              </div>

              {distanceLabel && (
                <div className="bg-white/95 backdrop-blur rounded-full px-2.5 py-1 text-[11px] font-medium text-gray-700 shadow-sm border border-white/80">
                  {distanceLabel}
                </div>
              )}
            </div>

            {restaurant.isRecommended && (
              <div className="absolute left-2 bottom-2 bg-gradient-to-r from-brand-500 to-amber-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Recommended
              </div>
            )}

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>

          {/* Content Section */}
          <div className="flex-1 px-4 py-3 flex flex-col justify-between min-w-0 gap-3">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 hover:text-brand-600 transition-colors truncate">
                    {restaurant.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                    <span>{typeLabel}</span>
                    <span className="text-gray-300">•</span>
                    <span>{cuisineLabel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {restaurant.priceRange && (
                    <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">
                      {restaurant.priceRange}
                    </Badge>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        onClick={handleFavoriteClick}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.94 }}
                        type="button"
                        aria-label={
                          restaurant.isFavorite
                            ? `Remove ${restaurant.name} from favorites`
                            : `Add ${restaurant.name} to favorites`
                        }
                        aria-pressed={restaurant.isFavorite}
                        className={cn(
                          "p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
                          restaurant.isFavorite
                            ? "text-red-500 bg-red-50"
                            : "text-gray-400 hover:text-red-500 hover:bg-red-50",
                        )}
                      >
                        <Heart
                          className={cn(
                            "w-4.5 h-4.5",
                            restaurant.isFavorite && "fill-current",
                          )}
                          aria-hidden="true"
                        />
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {restaurant.isFavorite
                        ? "Remove from favorites"
                        : "Add to favorites"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-gray-600">
                <MapPin
                  className="w-4 h-4 text-brand-500 flex-shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm truncate">{restaurant.address}</span>
              </div>

              {restaurant.recommendedReason && restaurant.isRecommended && (
                <p className="text-xs text-brand-700 bg-brand-50/70 border border-brand-100 px-2.5 py-1 rounded-lg inline-flex max-w-full truncate">
                  {restaurant.recommendedReason}
                </p>
              )}

              {restaurant.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {restaurant.amenities.slice(0, 3).map((amenity) => (
                    <Badge
                      key={amenity}
                      variant="secondary"
                      className="text-[11px] capitalize px-2 py-0.5"
                    >
                      {amenity.replace("-", " ")}
                    </Badge>
                  ))}
                  {restaurant.amenities.length > 3 && (
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                      +{restaurant.amenities.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleBookClick}
                className="bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 rounded-lg transition-colors h-9"
                size="sm"
                aria-label={`Book a table at ${restaurant.name}`}
              >
                Book a table
              </Button>
              <Button
                onClick={handleViewMapClick}
                variant="outline"
                size="sm"
                className="h-9 px-3 border-gray-300 hover:border-brand-300 hover:text-brand-600"
                aria-label={`View ${restaurant.name} on map`}
              >
                <Map className="w-4 h-4 mr-1" />
                View in map
              </Button>
            </div>
          </div>
        </motion.article>
      </TooltipProvider>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for memoization
    return (
      prevProps.restaurant.id === nextProps.restaurant.id &&
      prevProps.restaurant.isFavorite === nextProps.restaurant.isFavorite &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isLoading === nextProps.isLoading
    );
  },
);

export default RestaurantCard;
