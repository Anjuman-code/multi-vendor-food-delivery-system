import type { ExploreMenuItem } from "@/services/exploreService";

export interface DishVendorOption {
  item: ExploreMenuItem;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  deliveryTime: { min: number; max: number };
  deliveryFee: number;
  isOpen: boolean;
  isPopular: boolean;
  variants: ExploreMenuItem["variants"];
  addons: ExploreMenuItem["addons"];
}

export interface ClusteredDish {
  clusterKey: string;
  name: string;
  normalizedName: string;
  categoryName: string;
  image?: string;
  description: string;
  dietaryTags: string[];
  minPrice: number;
  maxPrice: number;
  hasPriceRange: boolean;
  vendorCount: number;
  primaryItem: ExploreMenuItem;
  vendors: DishVendorOption[];
}
