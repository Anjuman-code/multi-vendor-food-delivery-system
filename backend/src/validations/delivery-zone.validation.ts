import { z } from "zod";

const feeTierSchema = z.object({
  maxDistanceKm: z.number().min(0),
  fee: z.number().min(0),
  minOrderForFree: z.number().min(0).optional(),
});

export const createDeliveryZoneSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  type: z.enum(["radius", "polygon", "district"]),
  center: z
    .object({
      type: z.literal("Point"),
      coordinates: z.tuple([z.number(), z.number()]),
    })
    .optional(),
  radiusKm: z.number().min(0).optional(),
  polygon: z
    .object({
      type: z.literal("Polygon"),
      coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
    })
    .optional(),
  districts: z.array(z.string()).optional(),
  feeTiers: z.array(feeTierSchema).optional().default([]),
  isActive: z.boolean().optional().default(true),
  minimumOrder: z.number().min(0).optional().default(0),
});

export const updateDeliveryZoneSchema = createDeliveryZoneSchema
  .omit({ restaurantId: true })
  .partial();

export type CreateDeliveryZoneInput = z.infer<typeof createDeliveryZoneSchema>;
export type UpdateDeliveryZoneInput = z.infer<typeof updateDeliveryZoneSchema>;
