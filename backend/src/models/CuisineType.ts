/**
 * CuisineType — controlled vocabulary reference for restaurant cuisine types.
 * Replaces the free-text cuisineType[] on Restaurant with ObjectId references.
 */
import mongoose, { Model, Schema } from "mongoose";

export interface ICuisineType {
  name: string;
  slug: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const cuisineTypeSchema = new Schema<ICuisineType>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    icon: { type: String, trim: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

cuisineTypeSchema.index({ displayOrder: 1 });

const CuisineType: Model<ICuisineType> = mongoose.model<ICuisineType>(
  "CuisineType",
  cuisineTypeSchema,
);

export default CuisineType;
