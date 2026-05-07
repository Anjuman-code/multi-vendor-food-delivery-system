/**
 * MenuItem Mongoose model – individual food items in a restaurant's menu.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

// ── Types ──────────────────────────────────────────────────────

export interface IMenuItemVariant {
  _id?: Types.ObjectId;
  name: string;
  price: number;
}

export interface IMenuItemAddon {
  _id?: Types.ObjectId;
  name: string;
  price: number;
  isRequired?: boolean;
}

export type StockStatus = "available" | "out_of_stock" | "hidden";
export type SpiceLevel = "none" | "mild" | "medium" | "hot" | "extra-hot";

export interface IMenuItem {
  restaurantId: Types.ObjectId;
  categoryId?: Types.ObjectId;
  name: string;
  description: string;
  price: number;
  originalPrice?: number; // price before discount
  image?: string;
  imageGallery: string[];
  dietaryTags: string[];  // e.g. ['halal', 'vegetarian', 'gluten-free']
  variants: IMenuItemVariant[];
  addons: IMenuItemAddon[];
  isAvailable: boolean;
  stockStatus: StockStatus;
  preparationTime: number; // minutes
  displayOrder: number;
  isPopular: boolean;
  isFeatured: boolean;
  spiceLevel: SpiceLevel;
  calories?: number;
  servingSize?: string; // e.g. "1 plate", "300g"
  createdAt: Date;
  updatedAt: Date;
}

export type MenuItemDocument = mongoose.HydratedDocument<IMenuItem>;

// ── Sub-schemas ────────────────────────────────────────────────

const variantSchema = new Schema<IMenuItemVariant>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

const addonSchema = new Schema<IMenuItemAddon>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    isRequired: { type: Boolean, default: false },
  },
  { _id: true },
);

// ── Main schema ────────────────────────────────────────────────

const menuItemSchema = new Schema<IMenuItem>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "MenuCategory",
      index: true,
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 1000,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    originalPrice: { type: Number, min: 0 },
    image: { type: String, trim: true },
    imageGallery: { type: [String], default: [] },
    dietaryTags: { type: [String], default: [] },
    variants: { type: [variantSchema], default: [] },
    addons: { type: [addonSchema], default: [] },
    isAvailable: { type: Boolean, default: true },
    stockStatus: {
      type: String,
      enum: ["available", "out_of_stock", "hidden"],
      default: "available",
    },
    preparationTime: { type: Number, default: 15 },
    displayOrder: { type: Number, default: 0 },
    isPopular: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    spiceLevel: {
      type: String,
      enum: ["none", "mild", "medium", "hot", "extra-hot"],
      default: "none",
    },
    calories: { type: Number, min: 0 },
    servingSize: { type: String, trim: true },
  },
  { timestamps: true },
);

menuItemSchema.index({ restaurantId: 1, isAvailable: 1 });
menuItemSchema.index({ restaurantId: 1, displayOrder: 1 });
menuItemSchema.index({ restaurantId: 1, isPopular: 1 });
menuItemSchema.index({ categoryId: 1, displayOrder: 1 });

const MenuItem: Model<IMenuItem> = mongoose.model<IMenuItem>(
  "MenuItem",
  menuItemSchema,
);

export default MenuItem;
