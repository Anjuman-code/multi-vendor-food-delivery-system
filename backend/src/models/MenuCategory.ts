/**
 * MenuCategory Mongoose model – groups menu items by category within a restaurant.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export interface IMenuCategory {
  restaurantId: Types.ObjectId;
  name: string;
  description?: string;
  image?: string;
  icon?: string;  // emoji or icon name
  displayOrder: number;
  isActive: boolean;
  availableFrom?: string; // "HH:MM" — for time-restricted categories (e.g. breakfast)
  availableUntil?: string; // "HH:MM"
  createdAt: Date;
  updatedAt: Date;
}

export type MenuCategoryDocument = mongoose.HydratedDocument<IMenuCategory>;

const menuCategorySchema = new Schema<IMenuCategory>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: 80,
    },
    description: { type: String, trim: true, maxlength: 300 },
    image: { type: String, trim: true },
    icon: { type: String, trim: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    availableFrom: { type: String },  // "HH:MM"
    availableUntil: { type: String }, // "HH:MM"
  },
  { timestamps: true },
);

menuCategorySchema.index({ restaurantId: 1, displayOrder: 1 });

const MenuCategory: Model<IMenuCategory> = mongoose.model<IMenuCategory>(
  "MenuCategory",
  menuCategorySchema,
);

export default MenuCategory;
