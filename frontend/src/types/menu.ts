// Menu types

export interface MenuItemVariant {
  _id: string;
  name: string;
  price: number;
}

export interface MenuItemAddon {
  _id: string;
  name: string;
  price: number;
  isRequired?: boolean;
}

export type StockStatus = "available" | "out_of_stock" | "hidden";
export type SpiceLevel = "none" | "mild" | "medium" | "hot" | "extra-hot";

export interface MenuItem {
  _id: string;
  restaurantId: string;
  categoryId?: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image?: string;
  imageGallery?: string[];
  dietaryTags: string[];
  variants: MenuItemVariant[];
  addons: MenuItemAddon[];
  isAvailable: boolean;
  stockStatus: StockStatus;
  preparationTime: number;
  displayOrder?: number;
  isPopular?: boolean;
  isFeatured?: boolean;
  spiceLevel?: SpiceLevel;
  calories?: number;
  servingSize?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  _id: string;
  restaurantId: string;
  name: string;
  description?: string;
  image?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  availableFrom?: string;
  availableUntil?: string;
  createdAt: string;
  updatedAt: string;
}
