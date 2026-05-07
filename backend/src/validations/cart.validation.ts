import { z } from "zod";

const cartItemOptionSchema = z.object({
  optionId: z.string().optional(),
  name: z.string().min(1),
  price: z.number().min(0),
});

const cartItemSchema = z.object({
  menuItemId: z.string().min(1, "Menu item ID is required"),
  name: z.string().min(1),
  price: z.number().min(0),
  image: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  variants: z.array(cartItemOptionSchema).optional().default([]),
  addons: z.array(cartItemOptionSchema).optional().default([]),
  specialInstructions: z.string().max(300).optional(),
});

export const addToCartSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  restaurantName: z.string().min(1, "Restaurant name is required"),
  item: cartItemSchema,
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0),
});

export const syncCartSchema = z.object({
  restaurantId: z.string().min(1),
  restaurantName: z.string().min(1),
  items: z.array(cartItemSchema),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type SyncCartInput = z.infer<typeof syncCartSchema>;
