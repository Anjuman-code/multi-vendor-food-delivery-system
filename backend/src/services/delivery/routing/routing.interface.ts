/**
 * Routing Provider Interfaces and Models
 */

export interface LatLngPoint {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMin: number;
  provider: string; // e.g. "osrm", "haversine_fallback"
  isEstimate: boolean;
}

export interface RoutingProvider {
  name: string;
  route(origin: LatLngPoint, destination: LatLngPoint): Promise<RouteResult>;
  healthCheck(): Promise<boolean>;
}
