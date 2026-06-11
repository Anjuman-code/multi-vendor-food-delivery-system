import httpClient from "@/lib/httpClient";

export interface ServerCartItem {
  key?: string;
  menuItemId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  variants: { variantId?: string; optionId?: string; name: string; price: number }[];
  addons: { addonId?: string; optionId?: string; name: string; price: number }[];
  specialInstructions?: string;
}

export interface ServerCart {
  _id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  items: ServerCartItem[];
  expiresAt: string;
}

export const cartService = {
  /** Get the current server cart */
  getCart: async (): Promise<ServerCart | null> => {
    const res = await httpClient.get("/api/cart");
    return res.data?.data?.cart || null;
  },

  /** Add an item to the cart */
  addToCart: async (payload: {
    restaurantId: string;
    restaurantName: string;
    item: ServerCartItem;
  }): Promise<ServerCart> => {
    const res = await httpClient.post("/api/cart/add", payload);
    return res.data.data.cart;
  },

  /** Update item quantity (0 removes) */
  updateCartItem: async (
    itemKey: string,
    quantity: number,
  ): Promise<ServerCart | null> => {
    const res = await httpClient.patch(
      `/api/cart/item/${encodeURIComponent(itemKey)}`,
      { quantity },
    );
    return res.data?.data?.cart || null;
  },

  /** Remove a single item from the cart */
  removeCartItem: async (itemKey: string): Promise<ServerCart | null> => {
    const res = await httpClient.delete(
      `/api/cart/item/${encodeURIComponent(itemKey)}`,
    );
    return res.data?.data?.cart || null;
  },

  /** Clear the entire cart */
  clearCart: async (): Promise<void> => {
    await httpClient.delete("/api/cart");
  },

  /** Full cart sync (used on login or cross-device) */
  syncCart: async (payload: {
    restaurantId: string;
    restaurantName: string;
    items: ServerCartItem[];
  }): Promise<ServerCart> => {
    const res = await httpClient.post("/api/cart/sync", payload);
    return res.data.data.cart;
  },

  /** Merge local guest cart into server cart (used on login) */
  mergeCart: async (payload: {
    restaurantId: string;
    restaurantName: string;
    items: ServerCartItem[];
  }): Promise<ServerCart> => {
    const res = await httpClient.post("/api/cart/merge", payload);
    return res.data.data.cart;
  },
};
