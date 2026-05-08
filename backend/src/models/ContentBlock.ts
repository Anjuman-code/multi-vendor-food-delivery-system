/**
 * ContentBlock — CMS-lite entity for admin-controlled homepage/landing content.
 * Supports banners, featured restaurant lists, and featured menu item lists.
 */
import mongoose, { Model, Schema, Types } from 'mongoose';

export type ContentBlockType = 'banner' | 'featured_restaurants' | 'featured_items';

export interface IContentBlock {
  type: ContentBlockType;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
  /** Ordered list of restaurant or menu-item IDs depending on type */
  entityIds: Types.ObjectId[];
  position: number;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ContentBlockDocument = mongoose.HydratedDocument<IContentBlock>;

const contentBlockSchema = new Schema<IContentBlock>(
  {
    type: {
      type: String,
      enum: ['banner', 'featured_restaurants', 'featured_items'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    ctaText: { type: String, trim: true },
    ctaLink: { type: String, trim: true },
    imageUrl: { type: String },
    entityIds: [{ type: Schema.Types.ObjectId }],
    position: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

contentBlockSchema.index({ type: 1, isActive: 1, position: 1 });
contentBlockSchema.index({ startsAt: 1, endsAt: 1 });

const ContentBlock: Model<IContentBlock> = mongoose.model<IContentBlock>(
  'ContentBlock',
  contentBlockSchema,
);

export default ContentBlock;
