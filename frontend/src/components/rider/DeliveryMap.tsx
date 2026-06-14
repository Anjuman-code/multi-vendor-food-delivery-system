/**
 * DeliveryMap — Leaflet map for an active delivery. Plots the restaurant
 * (pickup), the customer (drop-off) and, when available, the rider's live
 * position, then fits the viewport to whatever points exist.
 */
import L from "leaflet";
import { Navigation } from "lucide-react";
import * as React from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import { Button } from "@/components/ui/button";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DeliveryMapProps {
  store?: LatLng | null;
  customer?: LatLng | null;
  driver?: LatLng | null;
  /** Where the rider should currently navigate — drives the "Navigate" CTA. */
  navigateTo?: LatLng | null;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125]; // Dhaka

const pinIcon = (color: string, glyph: string) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:30px;height:30px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff;">
      <span style="transform:rotate(45deg);font-size:14px;line-height:1;">${glyph}</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
  });

const driverIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#2563eb;border:3px solid #fff;
    box-shadow:0 0 0 4px rgba(37,99,235,.25);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const FitBounds: React.FC<{ points: LatLng[] }> = ({ points }) => {
  const map = useMap();
  React.useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }
    map.fitBounds(
      L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])),
      { padding: [40, 40], maxZoom: 16 },
    );
  }, [map, points]);
  return null;
};

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  store,
  customer,
  driver,
  navigateTo,
  className,
}) => {
  const points = [store, customer, driver].filter(Boolean) as LatLng[];
  const center: [number, number] = points[0]
    ? [points[0].lat, points[0].lng]
    : DEFAULT_CENTER;

  const navHref = navigateTo
    ? `https://www.google.com/maps/dir/?api=1&destination=${navigateTo.lat},${navigateTo.lng}&travelmode=driving`
    : null;

  return (
    <div className={className}>
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom={false}
          className="h-full w-full"
          style={{ minHeight: 220 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {store && (
            <Marker position={[store.lat, store.lng]} icon={pinIcon("#f97316", "🏪")} />
          )}
          {customer && (
            <Marker
              position={[customer.lat, customer.lng]}
              icon={pinIcon("#16a34a", "🏠")}
            />
          )}
          {driver && (
            <Marker position={[driver.lat, driver.lng]} icon={driverIcon} />
          )}
          <FitBounds points={points} />
        </MapContainer>

        {navHref && (
          <Button
            asChild
            size="sm"
            className="absolute bottom-3 right-3 z-[1000] shadow-md"
          >
            <a href={navHref} target="_blank" rel="noopener noreferrer">
              <Navigation className="mr-1.5 h-4 w-4" />
              Navigate
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};

export default DeliveryMap;
