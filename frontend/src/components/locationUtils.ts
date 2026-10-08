export interface DistrictData {
  district: string;
  areas: string[];
}

export const DISTRICT_DATA: DistrictData[] = [
  { district: "Sylhet", areas: ["Beanibazar", "Bishwanath", "Companiganj", "Daram", "Fenchuganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Osmani Nagar", "Sylhet Sadar", "Zowra"] },
];

export const DISTRICT_OPTIONS = DISTRICT_DATA.map((d) => ({ value: d.district, label: d.district }));

export function getAreasByDistrict(district: string): { value: string; label: string }[] {
  const found = DISTRICT_DATA.find((d) => d.district.toLowerCase() === district?.toLowerCase());
  if (!found) return DISTRICT_DATA[0].areas.map((a) => ({ value: a, label: a }));
  return found.areas.map((a) => ({ value: a, label: a }));
}

export interface ResolvedAddress {
  street?: string;
  district?: string;
  area?: string;
}

export const reverseGeocodeCoordinates = async (
  latitude: number,
  longitude: number,
): Promise<ResolvedAddress> => {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error("Reverse geocoding failed");
  }

  const data = (await response.json()) as {
    address?: {
      house_number?: string;
      road?: string;
      pedestrian?: string;
      neighbourhood?: string;
      suburb?: string;
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      county?: string;
      state?: string;
      country?: string;
      postcode?: string;
    };
  };

  const address = data.address ?? {};
  const street = [
    address.house_number,
    address.road ||
      address.pedestrian ||
      address.neighbourhood ||
      address.suburb,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    street: street || undefined,
    district: address.county || address.state || undefined,
    area: address.city || address.town || address.village || address.municipality || undefined,
  };
};