import React, { useCallback, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, List, Star, Navigation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import type { Restaurant } from "@/types/restaurant";

interface MapViewToggleProps {
  isMapView: boolean;
  onToggle: () => void;
}

export const MapViewToggle: React.FC<MapViewToggleProps> = ({
  isMapView,
  onToggle,
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className="flex items-center gap-2 text-orange-600 font-medium hover:text-orange-700 transition-colors"
      aria-label={isMapView ? "Switch to list view" : "Switch to map view"}
    >
      {isMapView ? (
        <>
          <List className="w-4 h-4" />
          <span>Show list</span>
        </>
      ) : (
        <>
          <Map className="w-4 h-4" />
          <span>Show on map</span>
        </>
      )}
    </motion.button>
  );
};

interface RestaurantMapViewProps {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  onRestaurantSelect: (restaurant: Restaurant) => void;
  onBookClick: (restaurant: Restaurant) => void;
  onClose: () => void;
  isOpen: boolean;
}

// Mock map pin component (placeholder for real map integration)
const MapPin_: React.FC<{
  restaurant: Restaurant;
  isSelected: boolean;
  onClick: () => void;
  style: React.CSSProperties;
}> = ({ restaurant, isSelected, onClick, style }) => {
  return (
    <motion.button
      onClick={onClick}
      style={style}
      initial={{ scale: 0, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      whileHover={{ scale: 1.1, zIndex: 50 }}
      className={cn(
        "absolute transform -translate-x-1/2 -translate-y-full transition-all duration-200",
        isSelected ? "z-40" : "z-10",
      )}
      aria-label={`View ${restaurant.name}`}
    >
      <div
        className={cn(
          "relative flex flex-col items-center",
          isSelected && "scale-110",
        )}
      >
        {/* Pin head */}
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 transition-colors",
            isSelected
              ? "bg-orange-500 border-orange-600 text-white"
              : "bg-white border-gray-200 text-gray-700 hover:border-orange-300",
          )}
        >
          <span className="text-xs font-bold">{restaurant.rating}</span>
        </div>
        {/* Pin tail */}
        <div
          className={cn(
            "w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent -mt-0.5",
            isSelected ? "border-t-orange-500" : "border-t-white",
          )}
        />
        {/* Shadow */}
        <div className="w-4 h-1 bg-black/20 rounded-full mt-1 blur-sm" />
      </div>
    </motion.button>
  );
};

// Restaurant info card that appears when pin is selected
const RestaurantInfoCard: React.FC<{
  restaurant: Restaurant;
  onBook: () => void;
  onClose: () => void;
}> = ({ restaurant, onBook, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-w-md mx-auto"
    >
      <div className="flex">
        {/* Image */}
        <img
          src={restaurant.image}
          alt=""
          className="w-24 h-24 object-cover flex-shrink-0"
        />

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 truncate">
              {restaurant.name}
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
              <span>{restaurant.rating}</span>
            </div>
            <span>•</span>
            <span className="truncate">{restaurant.address}</span>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Button
              size="sm"
              onClick={onBook}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-4"
            >
              Book a table
            </Button>
            {restaurant.distance !== undefined && (
              <Badge variant="outline" className="text-xs">
                <Navigation className="w-3 h-3 mr-1" />
                {restaurant.distance.toFixed(1)} km
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const RestaurantMapView: React.FC<RestaurantMapViewProps> = ({
  restaurants,
  selectedRestaurant,
  onRestaurantSelect,
  onBookClick,
  onClose,
  isOpen,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Simulate map loading
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setMapLoaded(true), 500);
      return () => clearTimeout(timer);
    } else {
      setMapLoaded(false);
    }
  }, [isOpen]);

  // Generate pseudo-random but consistent positions for pins based on restaurant id
  const getPinPosition = useCallback((restaurant: Restaurant) => {
    const seed = restaurant.id * 137.5;
    const x = 10 + (Math.sin(seed) * 0.5 + 0.5) * 80;
    const y = 15 + (Math.cos(seed * 1.3) * 0.5 + 0.5) * 65;
    return { left: `${x}%`, top: `${y}%` };
  }, []);

  const handlePinClick = useCallback(
    (restaurant: Restaurant) => {
      onRestaurantSelect(restaurant);
    },
    [onRestaurantSelect],
  );

  const handleBookClick = useCallback(() => {
    if (selectedRestaurant) {
      onBookClick(selectedRestaurant);
    }
  }, [selectedRestaurant, onBookClick]);

  const handleInfoClose = useCallback(() => {
    onRestaurantSelect(null as unknown as Restaurant);
  }, [onRestaurantSelect]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gray-100"
          role="dialog"
          aria-label="Restaurant map view"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 bg-white shadow-sm z-40 px-4 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              {restaurants.length} restaurants nearby
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4 mr-1" />
              Close map
            </Button>
          </div>

          {/* Map Container */}
          <div
            ref={mapRef}
            className="absolute inset-0 top-14"
            style={{
              background: `
                linear-gradient(135deg, #f0f4f8 25%, transparent 25%),
                linear-gradient(225deg, #f0f4f8 25%, transparent 25%),
                linear-gradient(45deg, #f0f4f8 25%, transparent 25%),
                linear-gradient(315deg, #f0f4f8 25%, #e8ecf0 25%)
              `,
              backgroundSize: "40px 40px",
              backgroundPosition: "0 0, 20px 0, 20px -20px, 0 20px",
            }}
          >
            {/* Simulated map placeholder */}
            <div className="absolute inset-0 overflow-hidden">
              {/* Fake streets */}
              <div className="absolute top-1/3 left-0 right-0 h-2 bg-gray-300/50" />
              <div className="absolute top-2/3 left-0 right-0 h-1 bg-gray-300/30" />
              <div className="absolute left-1/4 top-0 bottom-0 w-1 bg-gray-300/30" />
              <div className="absolute left-2/3 top-0 bottom-0 w-2 bg-gray-300/50" />

              {/* Loading state */}
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"
                    />
                    <p className="text-sm text-gray-500">Loading map...</p>
                  </div>
                </div>
              )}

              {/* Restaurant pins */}
              {mapLoaded &&
                restaurants.map((restaurant) => (
                  <MapPin_
                    key={restaurant.id}
                    restaurant={restaurant}
                    isSelected={selectedRestaurant?.id === restaurant.id}
                    onClick={() => handlePinClick(restaurant)}
                    style={getPinPosition(restaurant)}
                  />
                ))}

              {/* Current location indicator */}
              {mapLoaded && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
                >
                  <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                  <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping" />
                </motion.div>
              )}
            </div>

            {/* Selected restaurant info card */}
            <AnimatePresence>
              {selectedRestaurant && (
                <RestaurantInfoCard
                  restaurant={selectedRestaurant}
                  onBook={handleBookClick}
                  onClose={handleInfoClose}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Map integration note */}
          <div className="absolute bottom-20 left-4 right-4 text-center">
            <p className="text-xs text-gray-400 bg-white/80 rounded-full px-3 py-1 inline-block">
              🗺️ Integrate with Google Maps, Mapbox, or Leaflet for full
              functionality
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RestaurantMapView;
