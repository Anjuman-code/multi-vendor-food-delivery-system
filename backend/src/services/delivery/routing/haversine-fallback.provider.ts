/**
 * Haversine Fallback Routing Provider.
 *
 * Used when OSRM or the primary routing engine is unreachable or disabled.
 * Multiplies straight-line distance by a configurable detour factor (e.g. 1.3)
 * to estimate road distance, and marks isEstimate = true.
 */
import { LatLngPoint, RouteResult, RoutingProvider } from "./routing.interface";

export class HaversineFallbackProvider implements RoutingProvider {
  public readonly name = "haversine_fallback";
  private readonly detourFactor: number;
  private readonly averageSpeedKmh: number;

  constructor(options: { detourFactor?: number; averageSpeedKmh?: number } = {}) {
    this.detourFactor = options.detourFactor ?? 1.3;
    // Default urban delivery speed in Bangladesh traffic: 24 km/h (400 m/min)
    this.averageSpeedKmh = options.averageSpeedKmh ?? 24;
  }

  public async route(
    origin: LatLngPoint,
    destination: LatLngPoint,
  ): Promise<RouteResult> {
    const straightLineMeters = calculateHaversineDistanceMeters(origin, destination);
    const estimatedRoadMeters = Math.round(straightLineMeters * this.detourFactor);
    const distanceKm = Math.round((estimatedRoadMeters / 1000) * 100) / 100;

    // Estimate duration: distance in km / speed in km/h * 3600 seconds
    const durationHours = distanceKm / this.averageSpeedKmh;
    const durationSeconds = Math.round(durationHours * 3600);
    const durationMin = Math.max(1, Math.round(durationSeconds / 60));

    return {
      distanceMeters: estimatedRoadMeters,
      distanceKm,
      durationSeconds,
      durationMin,
      provider: this.name,
      isEstimate: true,
    };
  }

  public async healthCheck(): Promise<boolean> {
    return true; // Always healthy
  }
}

/**
 * Great-circle distance between two coordinates in meters.
 */
export function calculateHaversineDistanceMeters(
  a: LatLngPoint,
  b: LatLngPoint,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLng = Math.sin(dLng / 2);

  const h =
    sinHalfDLat * sinHalfDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfDLng * sinHalfDLng;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
