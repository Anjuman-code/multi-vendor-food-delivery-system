import httpClient from "@/lib/httpClient";

export interface ServerCartItem {
  key?: string;
  restaurantId: string;
  restaurantName: string;
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
  items: ServerCartItem[];
  expiresAt: string;
}

export const cartService = {
  getCart: async (): Promise<ServerCart | null> => {
    const res = await httpClient.get("/api/cart");
    return res.data?.data?.cart || null;
  },

  addToCart: async (payload: {
    restaurantId: string;
    restaurantName: string;
    item: Omit<ServerCartItem, "restaurantId" | "restaurantName">;
  }): Promise<ServerCart> => {
    const res = await httpClient.post("/api/cart/add", payload);
    return res.data.data.cart;
  },

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

  removeCartItem: async (itemKey: string): Promise<ServerCart | null> => {
    const res = await httpClient.delete(
      `/api/cart/item/${encodeURIComponent(itemKey)}`,
    );
    return res.data?.data?.cart || null;
  },

  clearCart: async (): Promise<void> => {
    await httpClient.delete("/api/cart");
  },

  syncCart: async (payload: {
    items: ServerCartItem[];
  }): Promise<ServerCart> => {
    const res = await httpClient.post("/api/cart/sync", payload);
    return res.data.data.cart;
  },

  mergeCart: async (payload: {
    items: ServerCartItem[];
  }): Promise<ServerCart> => {
    const res = await httpClient.post("/api/cart/merge", payload);
    return res.data.data.cart;
  },
};
