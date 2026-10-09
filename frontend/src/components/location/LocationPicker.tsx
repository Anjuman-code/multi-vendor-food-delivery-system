/**
 * LocationPicker — Shared OpenStreetMap / Leaflet location picker with draggable pin,
 * geocoding search, reverse geocoding via backend proxy, "Locate Me", and manual fallback.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  Compass,
  Loader2,
  MapPin,
  Navigation,
  Search,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import deliveryService, { GeocodingAddress } from "@/services/deliveryService";
import { cn } from "@/utils/cn";

// Fix standard Leaflet marker icon asset resolution in Vite
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Default to Sylhet city center (Food Rush initial launch market)
const DEFAULT_CENTER: [number, number] = [24.8949, 91.8687];

export interface LocationPickerValue {
  latitude: number;
  longitude: number;
  address?: string;
  street?: string;
  area?: string;
  district?: string;
}

export interface LocationPickerProps {
  value?: { latitude?: number; longitude?: number; address?: string } | null;
  onChange: (val: LocationPickerValue) => void;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  mapHeight?: string;
  showSearch?: boolean;
  showLocateMe?: boolean;
}

function MapController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.flyTo(center, zoom ?? map.getZoom(), { duration: 0.8 });
    }
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  label = "Pin Location on Map",
  helperText,
  error,
  disabled = false,
  className,
  mapHeight = "280px",
  showSearch = true,
  showLocateMe = true,
}) => {
  const hasValidValue =
    typeof value?.latitude === "number" &&
    typeof value?.longitude === "number" &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    (value.latitude !== 0 || value.longitude !== 0);

  const initialLat = hasValidValue ? (value!.latitude as number) : DEFAULT_CENTER[0];
  const initialLng = hasValidValue ? (value!.longitude as number) : DEFAULT_CENTER[1];

  const [position, setPosition] = useState<[number, number]>([initialLat, initialLng]);
  const [hasPinned, setHasPinned] = useState<boolean>(hasValidValue);
  const [resolvedLabel, setResolvedLabel] = useState<string>(value?.address || "");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<GeocodingAddress[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [showResultsDropdown, setShowResultsDropdown] = useState<boolean>(false);
  const [isManualMode, setIsManualMode] = useState<boolean>(false);

  const tileUrl =
    import.meta.env.VITE_OSM_TILE_URL ||
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal position when external value changes
  useEffect(() => {
    if (hasValidValue) {
      setPosition([value!.latitude as number, value!.longitude as number]);
      setHasPinned(true);
      if (value?.address) {
        setResolvedLabel(value.address);
      }
    }
  }, [value?.latitude, value?.longitude, value?.address, hasValidValue]);

  // Reverse geocode handler
  const handleReverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setIsReverseGeocoding(true);
      try {
        const res = await deliveryService.geocodeReverse(lat, lng);
        if (res.success && res.data?.address) {
          const addr = res.data.address;
          const display = addr.displayName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setResolvedLabel(display);
          onChange({
            latitude: lat,
            longitude: lng,
            address: display,
            street: addr.street,
            area: addr.area,
            district: addr.district,
          });
        } else {
          const fallbackDisplay = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setResolvedLabel(fallbackDisplay);
          onChange({
            latitude: lat,
            longitude: lng,
            address: fallbackDisplay,
          });
        }
      } catch {
        const fallbackDisplay = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setResolvedLabel(fallbackDisplay);
        onChange({
          latitude: lat,
          longitude: lng,
          address: fallbackDisplay,
        });
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [onChange],
  );

  // Pin movement (click or drag)
  const handleLocationUpdate = useCallback(
    (lat: number, lng: number) => {
      if (disabled) return;
      setPosition([lat, lng]);
      setHasPinned(true);
      setShowResultsDropdown(false);
      handleReverseGeocode(lat, lng);
    },
    [disabled, handleReverseGeocode],
  );

  // Debounced search
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!q || q.trim().length < 2) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await deliveryService.geocodeSearch(q.trim());
        if (res.success && res.data?.results) {
          setSearchResults(res.data.results);
          setShowResultsDropdown(true);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleSelectSearchResult = (result: GeocodingAddress) => {
    setSearchQuery(result.displayName);
    setShowResultsDropdown(false);
    setPosition([result.lat, result.lng]);
    setHasPinned(true);
    setResolvedLabel(result.displayName);
    onChange({
      latitude: result.lat,
      longitude: result.lng,
      address: result.displayName,
      street: result.street,
      area: result.area,
      district: result.district,
    });
  };

  // HTML5 Geolocation "Locate Me"
  const handleLocateMe = () => {
    if (disabled) return;
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        handleLocationUpdate(latitude, longitude);
      },
      () => {
        setIsLocating(false);
        alert("Unable to retrieve your location. Please check your browser permissions or click directly on the map.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  // Marker drag end handler
  const markerEventHandlers = useMemo(
    () => ({
      dragend(e: L.DragEndEvent) {
        const marker = e.target;
        const latLng = marker.getLatLng();
        handleLocationUpdate(latLng.lat, latLng.lng);
      },
    }),
    [handleLocationUpdate],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        {label && (
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            {label}
          </label>
        )}
        <button
          type="button"
          onClick={() => setIsManualMode(!isManualMode)}
          className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
        >
          {isManualMode ? "Switch to map view" : "Enter coordinates manually"}
        </button>
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground -mt-1">{helperText}</p>
      )}

      {isManualMode ? (
        <div className="p-4 rounded-lg border border-border bg-card space-y-3">
          <p className="text-xs text-muted-foreground">
            Enter decimal latitude and longitude (e.g. Sylhet Sadar: 24.8949, 91.8687)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Latitude</label>
              <Input
                type="number"
                step="any"
                disabled={disabled}
                placeholder="24.8949"
                value={position[0]}
                onChange={(e) => {
                  const lat = parseFloat(e.target.value);
                  if (Number.isFinite(lat)) {
                    handleLocationUpdate(lat, position[1]);
                  }
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Longitude</label>
              <Input
                type="number"
                step="any"
                disabled={disabled}
                placeholder="91.8687"
                value={position[1]}
                onChange={(e) => {
                  const lng = parseFloat(e.target.value);
                  if (Number.isFinite(lng)) {
                    handleLocationUpdate(position[0], lng);
                  }
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Search bar & Locate Me button */}
          {(showSearch || showLocateMe) && (
            <div className="flex items-center gap-2 relative">
              {showSearch && (
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    disabled={disabled}
                    placeholder="Search area, landmark, or street in Bangladesh…"
                    value={searchQuery}
                    onChange={handleSearchInput}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowResultsDropdown(true);
                    }}
                    className="pl-9 pr-9 text-sm h-10"
                  />
                  {isSearching && (
                    <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  )}

                  {/* Autocomplete Dropdown */}
                  {showResultsDropdown && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-[1000] mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((item, idx) => (
                        <button
                          key={`${item.lat}-${item.lng}-${idx}`}
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          className="w-full text-left px-3 py-2.5 text-xs hover:bg-accent hover:text-accent-foreground flex items-start gap-2 border-b border-border/50 last:border-0 min-h-[44px]"
                        >
                          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{item.displayName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {showLocateMe && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || isLocating}
                  onClick={handleLocateMe}
                  className="h-10 min-w-[44px] px-3 shrink-0 flex items-center gap-1.5"
                  title="Use my current GPS location"
                >
                  {isLocating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <Navigation className="w-4 h-4 text-primary" />
                  )}
                  <span className="hidden sm:inline text-xs">Locate Me</span>
                </Button>
              )}
            </div>
          )}

          {/* Interactive Leaflet Map Container */}
          <div
            className="relative rounded-lg border border-border overflow-hidden shadow-sm"
            style={{ height: mapHeight }}
          >
            <MapContainer
              center={position}
              zoom={hasPinned ? 16 : 14}
              scrollWheelZoom={false}
              className="w-full h-full z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                url={tileUrl}
                maxZoom={19}
              />
              <MapController center={position} />
              <MapClickHandler onLocationSelect={handleLocationUpdate} />
              {hasPinned && (
                <Marker
                  position={position}
                  draggable={!disabled}
                  eventHandlers={markerEventHandlers}
                />
              )}
            </MapContainer>

            {/* Instruction Cue Overlay */}
            {!hasPinned && (
              <div className="absolute inset-x-0 bottom-3 z-[400] flex justify-center pointer-events-none px-4">
                <div className="bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-foreground shadow border border-border flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-primary animate-pulse" />
                  Click anywhere on the map or drag the pin to set delivery location
                </div>
              </div>
            )}

            {/* Loading Indicator for Reverse Geocoding */}
            {isReverseGeocoding && (
              <div className="absolute top-2 right-2 z-[400] bg-background/80 backdrop-blur-sm px-2.5 py-1 rounded text-xs flex items-center gap-1.5 shadow border border-border">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="text-[11px] text-muted-foreground">Finding address…</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected location feedback bar */}
      {hasPinned && (
        <div className="flex items-start gap-2 p-2.5 bg-muted/50 rounded-md border border-border text-xs">
          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {resolvedLabel || "Pinned location"}
            </p>
            <p className="text-muted-foreground text-[11px]">
              {position[0].toFixed(5)}, {position[1].toFixed(5)}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

export default LocationPicker;
