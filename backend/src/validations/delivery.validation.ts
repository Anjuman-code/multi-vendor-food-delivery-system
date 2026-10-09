/**
 * Zod validation schemas for Delivery endpoints.
 */
import { z } from "zod";

export const latLngSchema = z
  .object({
    latitude: z.number().optional(),
    lat: z.number().optional(),
    longitude: z.number().optional(),
    lng: z.number().optional(),
  })
  .transform((data) => ({
    latitude: data.latitude ?? data.lat,
    longitude: data.longitude ?? data.lng,
  }))
  .refine(
    (data): data is { latitude: number; longitude: number } =>
      typeof data.latitude === "number" &&
      Number.isFinite(data.latitude) &&
      data.latitude >= -90 &&
      data.latitude <= 90,
    {
      message: "Latitude must be a finite number between -90 and 90",
      path: ["latitude"],
    },
  )
  .refine(
    (data): data is { latitude: number; longitude: number } =>
      typeof data.longitude === "number" &&
      Number.isFinite(data.longitude) &&
      data.longitude >= -180 &&
      data.longitude <= 180,
    {
      message: "Longitude must be a finite number between -180 and 180",
      path: ["longitude"],
    },
  );

const quoteRestaurantItemSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  itemsSubtotal: z.number().min(0, "Subtotal must be non-negative"),
});

export const quoteDeliverySchema = z
  .object({
    destination: latLngSchema,
    restaurants: z.array(quoteRestaurantItemSchema).optional(),
    subOrders: z.array(quoteRestaurantItemSchema).optional(),
  })
  .transform((data) => ({
    destination: data.destination,
    restaurants: data.restaurants || data.subOrders || [],
  }))
  .refine((data) => data.restaurants.length >= 1, {
    message: "At least one restaurant is required to quote delivery",
    path: ["restaurants"],
  })
  .refine((data) => data.restaurants.length <= 5, {
    message: "Cannot quote more than 5 restaurants simultaneously",
    path: ["restaurants"],
  });

export const geocodeSearchSchema = z.object({
  q: z.string().trim().min(2, "Search query must be at least 2 characters").max(200),
});

export const geocodeReverseSchema = z
  .object({
    lat: z.coerce.number().optional(),
    latitude: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
  })
  .transform((data) => ({
    lat: data.lat ?? data.latitude,
    lng: data.lng ?? data.longitude,
  }))
  .refine(
    (data): data is { lat: number; lng: number } =>
      typeof data.lat === "number" &&
      Number.isFinite(data.lat) &&
      data.lat >= -90 &&
      data.lat <= 90,
    {
      message: "Valid latitude is required",
      path: ["lat"],
    },
  )
  .refine(
    (data): data is { lat: number; lng: number } =>
      typeof data.lng === "number" &&
      Number.isFinite(data.lng) &&
      data.lng >= -180 &&
      data.lng <= 180,
    {
      message: "Valid longitude is required",
      path: ["lng"],
    },
  );

export const updateDeliverySettingsSchema = z.object({
  minFee: z.number().min(10, "Minimum delivery fee cannot be less than ৳10").optional(),
  includedKm: z.number().min(0, "Included km cannot be negative").optional(),
  includedDistanceFee: z.number().min(0, "Included distance fee cannot be negative").optional(),
  perKmRate: z.number().min(0, "Per km rate cannot be negative").optional(),
  maxFee: z.number().min(10).optional().nullable(),
  maxDeliveryDistanceKm: z.number().min(1, "Max distance must be at least 1 km").max(100).optional(),
  detourFactor: z.number().min(1.0).max(3.0).optional(),
});

export const deliveryCampaignSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  label: z.string().trim().min(2, "Label must be at least 2 characters").max(120),
  description: z.string().trim().max(500).optional(),
  minSubtotal: z.number().min(0, "Minimum subtotal must be non-negative"),
  restaurantIds: z.array(z.string()).optional().default([]),
  maxDistanceKm: z.number().min(0.1).optional().nullable(),
  maxWaivedAmount: z.number().min(1).optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().optional().default(true),
}).refine(
  (data) => {
    if (data.startsAt && data.endsAt) {
      return data.endsAt > data.startsAt;
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["endsAt"],
  },
);

export const simulateDeliverySchema = z.object({
  distanceKm: z.number().min(0, "Distance must be non-negative").optional(),
  origin: latLngSchema.optional(),
  destination: latLngSchema.optional(),
  itemsSubtotal: z.number().min(0, "Subtotal must be non-negative"),
  restaurantId: z.string().optional(),
});
