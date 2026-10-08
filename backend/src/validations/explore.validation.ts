import { z } from "zod";

export const exploreMenuItemsQuerySchema = z.object({
  search: z.string().trim().optional(),
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  categories: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  openNow: z.preprocess((val) => {
    if (typeof val === "string") return val.toLowerCase() === "true";
    return Boolean(val);
  }, z.boolean()).optional(),
  dietaryTags: z.string().trim().optional(),
  dietary: z.string().trim().optional(),
  restaurantIds: z.string().trim().optional(),
  cuisines: z.string().trim().optional(),
  sort: z
    .enum(["popular", "price_asc", "price_desc", "rating", "newest"])
    .optional()
    .default("popular"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type ExploreMenuItemsQuery = z.infer<typeof exploreMenuItemsQuerySchema>;
