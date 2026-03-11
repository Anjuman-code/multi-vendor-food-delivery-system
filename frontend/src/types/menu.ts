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
}

export interface MenuItem {
  _id: string;
  restaurantId: string;
  categoryId?: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  dietaryTags: string[];
  variants: MenuItemVariant[];
  addons: MenuItemAddon[];
  isAvailable: boolean;
  preparationTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  _id: string;
  restaurantId: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
