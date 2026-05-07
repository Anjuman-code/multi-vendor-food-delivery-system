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
  deletedAt?: Date;
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
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

menuCategorySchema.index({ restaurantId: 1, displayOrder: 1 });
menuCategorySchema.index({ deletedAt: 1 });

menuCategorySchema.pre(
  /^find/,
  function (this: mongoose.Query<unknown, unknown>) {
    if (this.getFilter().deletedAt === undefined) {
      this.setQuery({ ...this.getFilter(), deletedAt: null });
    }
  },
);

menuCategorySchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, deletedAt: null });
};

interface IMenuCategoryModel extends Model<IMenuCategory> {
  findActive(filter?: Record<string, unknown>): ReturnType<Model<IMenuCategory>["find"]>;
}

const MenuCategory = mongoose.model<IMenuCategory, IMenuCategoryModel>(
  "MenuCategory",
  menuCategorySchema,
);

export default MenuCategory;
