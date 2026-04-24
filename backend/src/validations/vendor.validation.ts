/**
 * Zod validation schemas for vendor endpoints.
 */
import { z } from "zod";

// ── Reusable field schemas ─────────────────────────────────────

const phoneSchema = z
  .string()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^\+?[\d\s\-()]+$/, "Please enter a valid phone number");

const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .transform((v) => v.toLowerCase().trim());

// ── Vendor Registration (extends base register) ────────────────

export const vendorRegisterSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
      "Password must contain at least one special character",
    ),
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name cannot exceed 50 characters")
    .trim(),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name cannot exceed 50 characters")
    .trim(),
  phoneNumber: phoneSchema,
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name cannot exceed 100 characters")
    .trim(),
  businessLicense: z
    .string()
    .min(1, "Business license is required")
    .max(100, "Business license cannot exceed 100 characters")
    .trim(),
  taxId: z
    .string()
    .min(1, "Tax ID is required")
    .max(50, "Tax ID cannot exceed 50 characters")
    .trim(),
});

export type VendorRegisterInput = z.infer<typeof vendorRegisterSchema>;

// ── Vendor Profile Update ──────────────────────────────────────

export const updateVendorProfileSchema = z.object({
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name cannot exceed 100 characters")
    .trim()
    .optional(),
  businessLicense: z
    .string()
    .min(1, "Business license is required")
    .max(100, "Business license cannot exceed 100 characters")
    .trim()
    .optional(),
  taxId: z
    .string()
    .min(1, "Tax ID is required")
    .max(50, "Tax ID cannot exceed 50 characters")
    .trim()
    .optional(),
});

export type UpdateVendorProfileInput = z.infer<
  typeof updateVendorProfileSchema
>;

// ── Restaurant CRUD ────────────────────────────────────────────

const coordinatesSchema = z
  .object({
    lat: z.number(),
    lng: z.number(),
  })
  .optional();

const addressSchema = z.object({
  street: z.string().min(1, "Street is required").trim(),
  city: z.string().min(1, "City is required").trim(),
  state: z.string().min(1, "State is required").trim(),
  zipCode: z.string().min(1, "Zip code is required").trim(),
  country: z.string().min(1, "Country is required").trim(),
  coordinates: coordinatesSchema,
});

const contactInfoSchema = z.object({
  phone: phoneSchema,
  email: emailSchema,
  website: z.string().trim().optional(),
});

const operatingHoursSchema = z.object({
  day: z.enum([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  isOpen: z.boolean().default(true),
});

export const createRestaurantSchema = z.object({
  name: z
    .string()
    .min(1, "Restaurant name is required")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description cannot exceed 500 characters")
    .trim(),
  address: addressSchema,
  contactInfo: contactInfoSchema,
  cuisineType: z
    .array(z.string().trim())
    .min(1, "At least one cuisine type is required"),
  images: z.object({
    logo: z.string().min(1, "Logo URL is required").trim(),
    coverPhoto: z.string().min(1, "Cover photo URL is required").trim(),
    gallery: z.array(z.string().trim()).optional().default([]),
  }),
  operatingHours: z.array(operatingHoursSchema).optional().default([]),
  deliveryTime: z.string().optional().default("30-45 min"),
  deliveryFee: z.number().min(0).optional().default(0),
  minimumOrder: z.number().min(0).optional().default(0),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;

export const updateRestaurantSchema = z.object({
  name: z
    .string()
    .min(1, "Restaurant name is required")
    .max(100, "Name cannot exceed 100 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description cannot exceed 500 characters")
    .trim()
    .optional(),
  address: addressSchema.optional(),
  contactInfo: contactInfoSchema.optional(),
  cuisineType: z
    .array(z.string().trim())
    .min(1, "At least one cuisine type is required")
    .optional(),
  images: z
    .object({
      logo: z.string().min(1).trim(),
      coverPhoto: z.string().min(1).trim(),
      gallery: z.array(z.string().trim()).optional(),
    })
    .optional(),
  operatingHours: z.array(operatingHoursSchema).optional(),
  deliveryTime: z.string().optional(),
  deliveryFee: z.number().min(0).optional(),
  minimumOrder: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;

// ── Menu Category CRUD ─────────────────────────────────────────

export const createMenuCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(80, "Category name cannot exceed 80 characters")
    .trim(),
  description: z
    .string()
    .max(300, "Description cannot exceed 300 characters")
    .trim()
    .optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
});

export type CreateMenuCategoryInput = z.infer<typeof createMenuCategorySchema>;

export const updateMenuCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(80, "Category name cannot exceed 80 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .max(300, "Description cannot exceed 300 characters")
    .trim()
    .optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateMenuCategoryInput = z.infer<typeof updateMenuCategorySchema>;

// ── Menu Item CRUD ─────────────────────────────────────────────

const variantSchema = z.object({
  name: z.string().min(1, "Variant name is required").trim(),
  price: z.number().min(0, "Variant price must be non-negative"),
});

const addonSchema = z.object({
  name: z.string().min(1, "Addon name is required").trim(),
  price: z.number().min(0, "Addon price must be non-negative"),
});

export const createMenuItemSchema = z.object({
  categoryId: z.string().optional(),
  name: z
    .string()
    .min(1, "Item name is required")
    .max(100, "Item name cannot exceed 100 characters")
    .trim(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description cannot exceed 500 characters")
    .trim(),
  price: z.number().min(0, "Price must be non-negative"),
  image: z.string().trim().optional(),
  dietaryTags: z.array(z.string().trim()).optional().default([]),
  variants: z.array(variantSchema).optional().default([]),
  addons: z.array(addonSchema).optional().default([]),
  isAvailable: z.boolean().optional().default(true),
  preparationTime: z.number().int().min(1).optional().default(15),
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

export const updateMenuItemSchema = z.object({
  categoryId: z.string().nullable().optional(),
  name: z
    .string()
    .min(1, "Item name is required")
    .max(100, "Item name cannot exceed 100 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description cannot exceed 500 characters")
    .trim()
    .optional(),
  price: z.number().min(0, "Price must be non-negative").optional(),
  image: z.string().trim().nullable().optional(),
  dietaryTags: z.array(z.string().trim()).optional(),
  variants: z.array(variantSchema).optional(),
  addons: z.array(addonSchema).optional(),
  isAvailable: z.boolean().optional(),
  preparationTime: z.number().int().min(1).optional(),
});

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

// ── Vendor Order Status Update ─────────────────────────────────

export const updateOrderStatusSchema = z.object({
  status: z.enum(
    ["confirmed", "preparing", "ready", "picked_up", "delivered", "cancelled"],
    {
      message:
        "Status must be one of: confirmed, preparing, ready, picked_up, delivered, cancelled",
    },
  ),
  note: z.string().max(300, "Note cannot exceed 300 characters").optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ── Review Reply ───────────────────────────────────────────────

export const replyToReviewSchema = z.object({
  text: z
    .string()
    .min(1, "Reply text is required")
    .max(500, "Reply cannot exceed 500 characters")
    .trim(),
});

export type ReplyToReviewInput = z.infer<typeof replyToReviewSchema>;

// ── Coupon CRUD ────────────────────────────────────────────────

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(20, "Code cannot exceed 20 characters")
    .trim()
    .transform((v) => v.toUpperCase()),
  type: z.enum(["percentage", "fixed"], {
    message: "Type must be percentage or fixed",
  }),
  value: z.number().min(0, "Value must be non-negative"),
  minOrderAmount: z.number().min(0).optional().default(0),
  maxDiscount: z.number().min(0).optional(),
  validFrom: z.preprocess((value) => {
    if (value instanceof Date) return value;
    if (typeof value === "string" || typeof value === "number") {
      return new Date(value);
    }
    return value;
  }, z.date()),
  validTo: z.preprocess((value) => {
    if (value instanceof Date) return value;
    if (typeof value === "string" || typeof value === "number") {
      return new Date(value);
    }
    return value;
  }, z.date()),
  usageLimit: z.number().int().min(0).optional().default(0),
  applicableRestaurants: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;

export const updateCouponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(20)
    .trim()
    .transform((v) => v.toUpperCase())
    .optional(),
  type: z.enum(["percentage", "fixed"]).optional(),
  value: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).nullable().optional(),
  validFrom: z
    .preprocess((value) => {
      if (value instanceof Date) return value;
      if (typeof value === "string" || typeof value === "number") {
        return new Date(value);
      }
      return value;
    }, z.date())
    .optional(),
  validTo: z
    .preprocess((value) => {
      if (value instanceof Date) return value;
      if (typeof value === "string" || typeof value === "number") {
        return new Date(value);
      }
      return value;
    }, z.date())
    .optional(),
  usageLimit: z.number().int().min(0).optional(),
  applicableRestaurants: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
