import { z } from "zod";

// ── Restaurant schemas ───────────────────────────────────────────

export const createRestaurantSchema = z.object({
  name: z
    .string()
    .min(2, "Restaurant name must be at least 2 characters")
    .max(100, "Restaurant name cannot exceed 100 characters")
    .trim(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description cannot exceed 1000 characters")
    .trim(),
  cuisineType: z
    .array(z.string().min(1))
    .min(1, "Select at least one cuisine type"),
  phone: z
    .string()
    .min(7, "Phone number is too short")
    .max(20, "Phone number is too long")
    .regex(/^\+?[\d\s\-()]+$/, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address"),
  address: z.object({
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(1, "Zip code is required"),
    country: z.string().min(1, "Country is required"),
  }),
  openingHours: z
    .array(
      z.object({
        day: z.string(),
        open: z.string(),
        close: z.string(),
        isClosed: z.boolean(),
      }),
    )
    .optional(),
  minimumOrder: z
    .number()
    .min(0, "Minimum order cannot be negative")
    .optional(),
  deliveryFee: z.number().min(0, "Delivery fee cannot be negative").optional(),
  estimatedDeliveryTime: z
    .number()
    .min(1, "Delivery time must be at least 1 minute")
    .optional(),
});

export const updateRestaurantSchema = createRestaurantSchema.partial();

// ── Menu category schemas ────────────────────────────────────────

export const menuCategorySchema = z.object({
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name cannot exceed 50 characters")
    .trim(),
  description: z
    .string()
    .max(200, "Description cannot exceed 200 characters")
    .optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ── Menu item schemas ────────────────────────────────────────────

export const menuItemSchema = z.object({
  name: z
    .string()
    .min(2, "Item name must be at least 2 characters")
    .max(100, "Item name cannot exceed 100 characters")
    .trim(),
  description: z
    .string()
    .min(5, "Description must be at least 5 characters")
    .max(500, "Description cannot exceed 500 characters")
    .trim(),
  price: z.number().min(0.01, "Price must be greater than 0"),
  categoryId: z.string().optional(),
  dietaryTags: z.array(z.string()).optional(),
  preparationTime: z
    .number()
    .int()
    .min(1, "Preparation time must be at least 1 minute")
    .optional(),
  isAvailable: z.boolean().optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1, "Variant name is required"),
        price: z.number().min(0, "Variant price cannot be negative"),
      }),
    )
    .optional(),
  addons: z
    .array(
      z.object({
        name: z.string().min(1, "Addon name is required"),
        price: z.number().min(0, "Addon price cannot be negative"),
      }),
    )
    .optional(),
});

// ── Coupon schemas ───────────────────────────────────────────────

const couponSchemaBase = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(20, "Code cannot exceed 20 characters")
    .regex(
      /^[A-Z0-9_-]+$/i,
      "Code can only contain letters, numbers, hyphens, underscores",
    ),
  type: z.enum(["percentage", "fixed"], {
    message: "Discount type is required",
  }),
  value: z.number().min(0.01, "Value must be greater than 0"),
  minimumOrderAmount: z
    .number()
    .min(0, "Minimum order cannot be negative")
    .optional(),
  maxUses: z.number().int().min(1, "Max uses must be at least 1").optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  applicableRestaurants: z
    .array(z.string())
    .min(1, "Select at least one restaurant"),
});

export const couponSchema = couponSchemaBase.refine(
  (data) => {
    if (data.type === "percentage" && data.value > 100) return false;
    return true;
  },
  { message: "Percentage discount cannot exceed 100%", path: ["value"] },
);

export const updateCouponSchema = couponSchemaBase.partial().refine(
  (data) => {
    if (data.type === "percentage" && typeof data.value === "number") {
      return data.value <= 100;
    }
    return true;
  },
  { message: "Percentage discount cannot exceed 100%", path: ["value"] },
);

// ── Review reply schema ──────────────────────────────────────────

export const reviewReplySchema = z.object({
  text: z
    .string()
    .min(1, "Reply cannot be empty")
    .max(500, "Reply cannot exceed 500 characters")
    .trim(),
});

// ── Inferred types ───────────────────────────────────────────────

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type MenuCategoryInput = z.infer<typeof menuCategorySchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ReviewReplyInput = z.infer<typeof reviewReplySchema>;
