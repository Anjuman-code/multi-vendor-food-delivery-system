/**
 * MenuItem Mongoose model – individual food items in a restaurant's menu.
 */
import mongoose, { Schema, Model, Types } from "mongoose";

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
}

export interface IMenuItem {
  restaurantId: Types.ObjectId;
  categoryId?: Types.ObjectId;
  name: string;
  description: string;
  price: number;
  image?: string;
  dietaryTags: string[];
  variants: IMenuItemVariant[];
  addons: IMenuItemAddon[];
  isAvailable: boolean;
  preparationTime: number; // minutes
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
      maxlength: 500,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    image: { type: String, trim: true },
    dietaryTags: { type: [String], default: [] },
    variants: { type: [variantSchema], default: [] },
    addons: { type: [addonSchema], default: [] },
    isAvailable: { type: Boolean, default: true },
    preparationTime: { type: Number, default: 15 },
  },
  { timestamps: true },
);

menuItemSchema.index({ restaurantId: 1, isAvailable: 1 });

const MenuItem: Model<IMenuItem> = mongoose.model<IMenuItem>(
  "MenuItem",
  menuItemSchema,
);

export default MenuItem;
