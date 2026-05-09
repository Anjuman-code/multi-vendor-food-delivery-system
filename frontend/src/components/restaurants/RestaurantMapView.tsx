import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Restaurant } from "@/types/restaurant";
import { restaurantFallbackSVG } from "@/utils/fallbackImages";
import { AnimatePresence, motion } from "framer-motion";
import L from "leaflet";
import { List, Map, Navigation, Star, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";

const DEFAULT_CENTER: [number, number] = [24.8949, 91.8687];

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
      type="button"
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
  onRestaurantSelect: (restaurant: Restaurant | null) => void;
  onBookClick: (restaurant: Restaurant) => void;
  onClose: () => void;
  isOpen: boolean;
}

interface MappableRestaurant extends Restaurant {
  coordinates: { lat: number; lng: number };
}

const hasCoordinates = (
  restaurant: Restaurant,
): restaurant is MappableRestaurant => {
  const lat = restaurant.coordinates?.lat;
  const lng = restaurant.coordinates?.lng;
  return Number.isFinite(lat) && Number.isFinite(lng);
};

const createMarkerIcon = (rating: number, selected: boolean) =>
  L.divIcon({
    className: "custom-restaurant-marker",
    iconSize: [42, 42],
    iconAnchor: [21, 38],
    popupAnchor: [0, -32],
    html: `<div style="
      width: 42px;
      height: 42px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: ${selected ? "#fff" : "#111827"};
      border: 2px solid ${selected ? "#ea580c" : "#ffffff"};
      background: ${selected ? "#f97316" : "#fed7aa"};
      box-shadow: 0 6px 14px rgba(0,0,0,0.25);
    ">${rating.toFixed(1)}</div>`,
  });

const createUserLocationIcon = () =>
  L.divIcon({
    className: "custom-user-location-marker",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="
      width: 22px;
      height: 22px;
      border-radius: 999px;
      border: 3px solid #ffffff;
      background: #2563eb;
      box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.22);
    "></div>`,
  });

const FitBoundsController: React.FC<{
  positions: [number, number][];
  selectedPosition: [number, number] | null;
}> = ({ positions, selectedPosition }) => {
  const map = useMap();

  React.useEffect(() => {
    if (selectedPosition) {
      map.setView(selectedPosition, 15, { animate: true });
      return;
    }

    if (positions.length === 0) {
      map.setView(DEFAULT_CENTER, 13);
      return;
    }

    if (positions.length === 1) {
      map.setView(positions[0], 14, { animate: true });
      return;
    }

    map.fitBounds(positions, {
      padding: [40, 40],
      maxZoom: 15,
      animate: true,
    });
  }, [map, positions, selectedPosition]);

  return null;
};

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
      className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[1000] max-w-md mx-auto"
    >
      <div className="flex">
        <img
          src={restaurant.image || restaurantFallbackSVG}
          alt=""
          className="w-24 h-24 object-cover flex-shrink-0"
        />

        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 truncate">{restaurant.name}</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              aria-label="Close"
              type="button"
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
  const navigate = useNavigate();
  const [hoveredRestaurant, setHoveredRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        setUserLocation(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setHoveredRestaurant(null);
    }
  }, [isOpen]);

  const mappableRestaurants = useMemo(
    () => restaurants.filter(hasCoordinates),
    [restaurants],
  );

  const selectedWithCoordinates = useMemo(() => {
    if (!selectedRestaurant || !hasCoordinates(selectedRestaurant)) {
      return null;
    }

    return selectedRestaurant;
  }, [selectedRestaurant]);

  const positions = useMemo(() => {
    const restaurantPositions = mappableRestaurants.map(
      (restaurant) =>
        [restaurant.coordinates.lat, restaurant.coordinates.lng] as [number, number],
    );

    if (userLocation) {
      restaurantPositions.push(userLocation);
    }

    return restaurantPositions;
  }, [mappableRestaurants, userLocation]);

  const selectedPosition = selectedWithCoordinates
    ? ([selectedWithCoordinates.coordinates.lat, selectedWithCoordinates.coordinates.lng] as [
        number,
        number,
      ])
    : null;

  const initialCenter = selectedPosition || positions[0] || DEFAULT_CENTER;

  const activeRestaurant = hoveredRestaurant || selectedRestaurant;

  const handleBookClick = useCallback(() => {
    if (activeRestaurant) {
      onBookClick(activeRestaurant);
    }
  }, [activeRestaurant, onBookClick]);

  const handleNavigateToRestaurant = useCallback(
    (restaurant: Restaurant) => {
      onClose();
      navigate(`/restaurants/${restaurant.id}`);
    },
    [navigate, onClose],
  );

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
          <div className="absolute top-0 left-0 right-0 bg-white shadow-sm z-[1000] px-4 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              {mappableRestaurants.length} restaurants on map
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4 mr-1" />
              Close map
            </Button>
          </div>

          <div className="absolute inset-0 top-14">
            {mappableRestaurants.length > 0 ? (
              <MapContainer
                center={initialCenter}
                zoom={13}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitBoundsController
                  positions={positions}
                  selectedPosition={selectedPosition}
                />

                {mappableRestaurants.map((restaurant) => {
                  const selected = selectedRestaurant?.id === restaurant.id;

                  return (
                    <Marker
                      key={String(restaurant.id)}
                      position={[restaurant.coordinates.lat, restaurant.coordinates.lng]}
                      icon={createMarkerIcon(restaurant.rating || 0, selected)}
                      eventHandlers={{
                        mouseover: () => {
                          setHoveredRestaurant(restaurant);
                          onRestaurantSelect(restaurant);
                        },
                        mouseout: () => {
                          setHoveredRestaurant((current) =>
                            current?.id === restaurant.id ? null : current,
                          );
                        },
                        click: () => handleNavigateToRestaurant(restaurant),
                      }}
                    >
                      <Popup>
                        <div className="min-w-[180px]">
                          <p className="font-semibold text-gray-900">{restaurant.name}</p>
                          <p className="text-sm text-gray-600 mt-1">{restaurant.address}</p>
                          <p className="text-xs text-orange-600 mt-1">
                            Rating {restaurant.rating.toFixed(1)}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {userLocation && (
                  <Marker position={userLocation} icon={createUserLocationIcon()}>
                    <Popup>
                      <p className="text-sm font-medium text-gray-800">You are here</p>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
                <div className="text-center px-6">
                  <Map className="w-10 h-10 text-orange-400 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">No restaurant coordinates available</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Restaurant locations will appear here once coordinates are provided.
                  </p>
                </div>
              </div>
            )}

            <AnimatePresence>
              {activeRestaurant && (
                <RestaurantInfoCard
                  restaurant={activeRestaurant}
                  onBook={handleBookClick}
                  onClose={() => {
                    setHoveredRestaurant(null);
                    onRestaurantSelect(null);
                  }}
                />
              )}
            </AnimatePresence>

            {activeRestaurant && (
              <button
                type="button"
                onClick={() => handleNavigateToRestaurant(activeRestaurant)}
                className="absolute bottom-36 left-1/2 -translate-x-1/2 z-[1000] bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-full shadow-md"
              >
                Open details page
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RestaurantMapView;
