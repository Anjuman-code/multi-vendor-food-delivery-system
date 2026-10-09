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
  try {
    const { deliveryService } = await import("@/services/deliveryService");
    const res = await deliveryService.geocodeReverse(latitude, longitude);
    if (!res.success || !res.data?.address) {
      return {};
    }
    const addr = res.data.address;
    return {
      street: addr.street || undefined,
      district: addr.district || undefined,
      area: addr.area || undefined,
    };
  } catch {
    return {};
  }
};