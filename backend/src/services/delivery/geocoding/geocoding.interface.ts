/**
 * Geocoding Interfaces
 */

export interface GeocodingAddress {
  street?: string;
  houseNumber?: string;
  area?: string;
  district?: string;
  city?: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

export interface GeocodingProvider {
  name: string;
  search(query: string): Promise<GeocodingAddress[]>;
  reverse(latitude: number, longitude: number): Promise<GeocodingAddress | null>;
}
