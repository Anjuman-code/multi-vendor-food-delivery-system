/**
 * Routing/ETA utility.
 *
 * OpenStreetMap tiles + Leaflet only draw the map — they do NOT compute driving
 * routes. Routing needs a routing engine built on OSM data. We use OSRM here,
 * wrapped so the base URL is swappable: the public demo server is fine for dev,
 * production should point `VITE_OSRM_URL` at a self-hosted/managed instance.
 *
 * Every call degrades gracefully: if OSRM errors or rate-limits, we fall back to
 * a straight-line geometry + a haversine/average-speed ETA so the map and ETA
 * never break.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResult {
  /** Ordered points to draw as a polyline. */
  geometry: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  /** True when the result is the straight-line fallback, not a real road route. */
  fallback: boolean;
}

const OSRM_BASE =
  (import.meta.env.VITE_OSRM_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://router.project-osrm.org';

/** Average urban delivery speed (km/h) used for the straight-line ETA fallback. */
const FALLBACK_SPEED_KMH = 22;

const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates, in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function straightLineFallback(waypoints: LatLng[]): RouteResult {
  let distanceMeters = 0;
  for (let i = 1; i < waypoints.length; i++) {
    distanceMeters += haversineMeters(waypoints[i - 1], waypoints[i]);
  }
  const durationSeconds = (distanceMeters / 1000 / FALLBACK_SPEED_KMH) * 3600;
  return { geometry: waypoints, distanceMeters, durationSeconds, fallback: true };
}

/**
 * Get a driving route (and duration) through the given waypoints. Needs at least
 * two points; returns the straight-line fallback on any failure.
 */
export async function getRoute(waypoints: LatLng[]): Promise<RouteResult | null> {
  const pts = waypoints.filter(
    (p): p is LatLng =>
      !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng),
  );
  if (pts.length < 2) return null;

  // OSRM expects lng,lat pairs separated by semicolons.
  const coords = pts.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);

    const data = await res.json();
    const route = data?.routes?.[0];
    const line = route?.geometry?.coordinates as [number, number][] | undefined;
    if (!route || !line?.length) throw new Error('No route');

    return {
      geometry: line.map(([lng, lat]) => ({ lat, lng })),
      distanceMeters: route.distance ?? 0,
      durationSeconds: route.duration ?? 0,
      fallback: false,
    };
  } catch {
    return straightLineFallback(pts);
  }
}

/** Round a route duration to whole minutes (min 1 when there's any distance). */
export function etaMinutesFromRoute(route: RouteResult | null): number | null {
  if (!route) return null;
  if (route.durationSeconds <= 0) return route.distanceMeters > 0 ? 1 : 0;
  return Math.max(1, Math.round(route.durationSeconds / 60));
}
