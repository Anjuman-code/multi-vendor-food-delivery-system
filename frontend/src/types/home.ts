export interface TopCategory {
  name: string;
  restaurantCount: number;
  image?: string;
  tags: string[];
}

export interface TrendingItem {
  _id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  restaurantId: string;
  restaurantName: string;
  rating?: number;
  orderCount?: number;
}

export interface PopularRestaurant {
  _id: string;
  name: string;
  description?: string;
  cuisineType?: string[];
  rating?: {
    average?: number;
    count?: number;
  };
  deliveryTime?: string;
  address?: {
    city?: string;
    state?: string;
  };
  images?: {
    coverPhoto?: string;
  };
  menuHighlights: string[];
}
