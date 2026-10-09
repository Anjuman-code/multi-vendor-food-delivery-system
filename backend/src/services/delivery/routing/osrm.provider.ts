/**
 * OSRM Routing Provider (Self-Hosted osrm-backend).
 *
 * Query format:
 * GET {baseUrl}/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=false
 */
import axios, { AxiosInstance } from "axios";
import { LatLngPoint, RouteResult, RoutingProvider } from "./routing.interface";

export interface OsrmRouteResponse {
  code: string;
  routes?: Array<{
    distance: number; // in meters
    duration: number; // in seconds
    weight_name?: string;
    weight?: number;
  }>;
  message?: string;
}

export class OsrmProvider implements RoutingProvider {
  public readonly name = "osrm";
  private readonly baseUrl: string;
  private readonly client: AxiosInstance;

  constructor(options: { baseUrl?: string; timeoutMs?: number } = {}) {
    this.baseUrl = (options.baseUrl || process.env.OSRM_BASE_URL || "http://localhost:5000").replace(
      /\/+$/,
      "",
    );
    const timeout = options.timeoutMs ?? parseInt(process.env.ROUTING_TIMEOUT_MS || "2000", 10);

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout,
      headers: {
        Accept: "application/json",
      },
    });
  }

  public async route(
    origin: LatLngPoint,
    destination: LatLngPoint,
  ): Promise<RouteResult> {
    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const url = `/route/v1/driving/${coordinates}?overview=false`;

    const response = await this.client.get<OsrmRouteResponse>(url);
    const data = response.data;

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM routing failed with code ${data.code}: ${data.message || "No route found"}`);
    }

    const route = data.routes[0];
    const distanceMeters = Math.round(route.distance);
    const distanceKm = Math.round((distanceMeters / 1000) * 100) / 100;
    const durationSeconds = Math.round(route.duration);
    const durationMin = Math.max(1, Math.round(durationSeconds / 60));

    return {
      distanceMeters,
      distanceKm,
      durationSeconds,
      durationMin,
      provider: this.name,
      isEstimate: false,
    };
  }

  public async healthCheck(): Promise<boolean> {
    try {
      // Test Sylhet center to nearby point
      const res = await this.client.get<OsrmRouteResponse>(
        "/route/v1/driving/91.8687,24.8994;91.8700,24.9000?overview=false",
        { timeout: 1500 },
      );
      return res.status === 200 && res.data.code === "Ok";
    } catch {
      return false;
    }
  }
}
