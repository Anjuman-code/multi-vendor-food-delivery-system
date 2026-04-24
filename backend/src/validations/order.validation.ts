import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid object ID format");

const selectedOptionSchema = z
  .object({
    optionId: objectIdSchema.optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => value.optionId || value.name, {
    message: "Either optionId or name is required",
  });

const orderItemSchema = z.object({
  menuItemId: objectIdSchema,
  quantity: z.number().int().min(1).max(50),
  variants: z.array(selectedOptionSchema).optional().default([]),
  addons: z.array(selectedOptionSchema).optional().default([]),
  specialInstructions: z.string().trim().max(300).optional(),
});

export const createOrderSchema = z.object({
  restaurantId: objectIdSchema,
  items: z.array(orderItemSchema).min(1, "At least one order item is required"),
  deliveryAddress: z.object({
    street: z.string().trim().min(1).max(200),
    apartment: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    zipCode: z.string().trim().min(1).max(20),
    country: z.string().trim().min(1).max(100),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
  }),
  paymentMethod: z.string().trim().min(1).max(120),
  couponCode: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .transform((v) => v.toUpperCase())
    .optional(),
  specialInstructions: z.string().trim().max(500).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
