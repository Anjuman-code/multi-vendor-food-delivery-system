/**
 * Tag — controlled vocabulary for restaurant and menu item tags.
 * Categories: dietary, amenity, feature, meal_type.
 */
import mongoose, { Model, Schema } from "mongoose";

export type TagCategory = "dietary" | "amenity" | "feature" | "meal_type";

export interface ITag {
  name: string;
  slug: string;
  category: TagCategory;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: {
      type: String,
      enum: ["dietary", "amenity", "feature", "meal_type"],
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

tagSchema.index({ category: 1, displayOrder: 1 });

const Tag: Model<ITag> = mongoose.model<ITag>("Tag", tagSchema);

export default Tag;
