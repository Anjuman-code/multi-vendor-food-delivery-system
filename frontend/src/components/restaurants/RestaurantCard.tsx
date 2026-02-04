import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, MapPin, Heart, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";
import type { Restaurant } from "@/types/restaurant";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onFavoriteToggle: (id: number) => void;
  onBookClick: (restaurant: Restaurant) => void;
  onCardClick: (restaurant: Restaurant) => void;
  onImageClick: (restaurant: Restaurant) => void;
  isSelected?: boolean;
  isLoading?: boolean;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onFavoriteToggle,
  onBookClick,
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="article"
        aria-label={`${restaurant.name} - ${typeLabel}, ${cuisineLabel}. Rating: ${restaurant.rating} out of 5 with ${restaurant.reviewCount} reviews. Located at ${restaurant.address}`}
        className={cn(
          "bg-white rounded-xl overflow-hidden shadow-sm border flex flex-col md:flex-row transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2",
          isSelected
            ? "border-orange-500 ring-2 ring-orange-200"
            : "border-gray-100",
          restaurant.isRecommended && "relative",
        )}
      >
        {/* Recommended Ribbon */}
        {restaurant.isRecommended && (
          <div className="absolute top-0 left-0 z-20">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-br-lg shadow-lg">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                <span>Recommended</span>
              </div>
            </div>
            {restaurant.recommendedReason && (
              <div className="bg-orange-50 text-orange-700 text-xs px-3 py-1 mt-0.5 rounded-r shadow-sm max-w-[200px] truncate">
                {restaurant.recommendedReason}
              </div>
            )}
          </div>
        )}

        {/* Image Section */}
        <button
          onClick={handleImageClick}
          className="relative w-full md:w-72 h-48 flex-shrink-0 overflow-hidden bg-gray-100 group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
          aria-label={`View photos of ${restaurant.name}`}
          type="button"
        >
          {/* Blur placeholder */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
          )}

          {/* Main image with lazy loading */}
          {!imageError ? (
            <img
              ref={imgRef}
              src={restaurant.image}
              alt={`${restaurant.name} restaurant interior`}
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                imageLoaded ? "opacity-100" : "opacity-0",
                "group-hover:scale-105",
              )}
              loading="lazy"
              decoding="async"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <ImageIcon className="w-12 h-12 text-gray-300" />
            </div>
          )}

          {/* View gallery overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full">
              View Photos
            </span>
          </div>

          {/* Rating Badge - repositioned for recommended cards */}
          <div
            className={cn(
              "absolute bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 shadow-sm",
              restaurant.isRecommended ? "bottom-3 left-3" : "top-3 left-3",
            )}
          >
            <Star
              className="w-3.5 h-3.5 text-orange-500 fill-orange-500"
              aria-hidden="true"
            />
            <span className="text-sm font-bold text-gray-900">
              {restaurant.rating}/5
            </span>
            <span
              className="text-xs text-gray-500"
              aria-label={`${restaurant.reviewCount} reviews`}
            >
              ({restaurant.reviewCount})
            </span>
          </div>

          {/* Distance badge */}
          {restaurant.distance !== undefined && (
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-gray-600 shadow-sm">
              {restaurant.distance < 1
                ? `${Math.round(restaurant.distance * 1000)}m`
                : `${restaurant.distance.toFixed(1)}km`}
            </div>
          )}
        </button>

        {/* Content Section */}
        <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900 hover:text-orange-600 transition-colors truncate flex-1">
                {restaurant.name}
              </h3>
              {restaurant.priceRange && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {restaurant.priceRange}
                </Badge>
              )}
            </div>

            {/* Type and cuisine */}
            <p className="text-sm text-gray-500 mb-3">
              {typeLabel} • {cuisineLabel}
            </p>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-gray-600 mb-3">
              <MapPin
                className="w-4 h-4 text-orange-500 flex-shrink-0"
                aria-hidden="true"
              />
              <span className="text-sm truncate">{restaurant.address}</span>
            </div>

            {/* Amenities */}
            {restaurant.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {restaurant.amenities.slice(0, 4).map((amenity) => (
                  <Badge
                    key={amenity}
                    variant="secondary"
                    className="text-xs capitalize"
                  >
                    {amenity.replace("-", " ")}
                  </Badge>
                ))}
                {restaurant.amenities.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{restaurant.amenities.length - 4} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4 gap-3">
            <Button
              onClick={handleBookClick}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 rounded-lg transition-colors flex-1 md:flex-none"
              size="sm"
              aria-label={`Book a table at ${restaurant.name}`}
            >
              Book a table
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={handleFavoriteClick}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  aria-label={
                    restaurant.isFavorite
                      ? `Remove ${restaurant.name} from favorites`
                      : `Add ${restaurant.name} to favorites`
                  }
                  aria-pressed={restaurant.isFavorite}
                  className={cn(
                    "p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2",
                    restaurant.isFavorite
                      ? "text-red-500 bg-red-50"
                      : "text-gray-400 hover:text-red-500 hover:bg-red-50",
                  )}
                >
                  <Heart
                    className={cn(
                      "w-5 h-5",
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
      </motion.article>
    </TooltipProvider>
  );
};

export default RestaurantCard;
