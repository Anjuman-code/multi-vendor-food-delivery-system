import mongoose, { Model, Schema } from 'mongoose';
import { IOperatingHours, IRestaurant } from '../types';
import {
  BD_PHONE_ERROR_MESSAGE,
  isCanonicalBdPhoneNumber,
  normalizeBdPhoneNumber,
} from '../utils/phone.util';

// ── Sub-schema: operating hours ──────────────────────────────────
const operatingHoursSchema = new Schema<IOperatingHours>(
  {
    day: {
      type: String,
      required: true,
      enum: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
    },
    openTime: { type: String, required: true }, // "HH:MM"
    closeTime: { type: String, required: true }, // "HH:MM"
    isOpen: { type: Boolean, default: true },
  },
  { _id: false },
);

// ── Main schema ──────────────────────────────────────────────────
const restaurantSchema = new Schema<IRestaurant>(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      maxlength: [150, 'Restaurant name cannot exceed 150 characters'],
    },
    nameI18n: { type: Map, of: String },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    descriptionI18n: { type: Map, of: String },
    address: {
      street: { type: String, required: true, trim: true },
      area: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      coordinates: { lat: Number, lng: Number },
    },
    // GeoJSON Point for $near / $geoWithin queries (2dsphere index below)
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: { type: [Number] }, // [longitude, latitude]
    },
    contactInfo: {
      phone: {
        type: String,
        required: true,
        trim: true,
        match: [/^\+8801[3-9]\d{8}$/, BD_PHONE_ERROR_MESSAGE],
      },
      email: { type: String, required: true, trim: true, lowercase: true },
      website: { type: String, trim: true, lowercase: true },
    },
    cuisineType: [{ type: String, trim: true }],
    tags: { type: [String], default: [] }, // e.g. ['halal', 'family-friendly']
    images: {
      logo: { type: String, required: true, trim: true },
      coverPhoto: { type: String, required: true, trim: true },
      gallery: [{ type: String, trim: true }],
    },
    operatingHours: { type: [operatingHoursSchema], default: [] },
    isActive: { type: Boolean, default: true },
    isTemporarilyClosed: { type: Boolean, default: false },
    closureReason: { type: String, trim: true, maxlength: 300 },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    rating: {
      average: { type: Number, min: 0, max: 5, default: 0 },
      count: { type: Number, default: 0 },
    },
    // Structured delivery time in minutes — queryable & sortable
    deliveryTime: {
      min: { type: Number, default: 20 },
      max: { type: Number, default: 45 },
    },
    deliveryFee: { type: Number, default: 0 },
    minimumOrder: { type: Number, default: 0 },
    // Price range: 1=৳ 2=৳৳ 3=৳৳৳ 4=৳৳৳৳
    priceRange: { type: Number, enum: [1, 2, 3, 4], default: 2 },
    serviceOptions: {
      type: [String],
      enum: ['delivery', 'dine-in', 'takeaway'],
      default: ['delivery'],
    },
    paymentMethods: {
      type: [String],
      default: ['cash'],
    },
    totalOrders: { type: Number, default: 0 },
    averagePreparationTime: { type: Number, default: 20 }, // minutes
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ── Slug generation ───────────────────────────────────────────────
const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

restaurantSchema.pre('validate', async function () {
  if (this.isModified('contactInfo.phone') && this.contactInfo?.phone) {
    this.contactInfo.phone = normalizeBdPhoneNumber(this.contactInfo.phone);

    if (!isCanonicalBdPhoneNumber(this.contactInfo.phone)) {
      this.invalidate('contactInfo.phone', BD_PHONE_ERROR_MESSAGE);
    }
  }

  if (this.isModified('name') || this.isNew || !this.slug) {
    const baseSlug = slugify(this.name) || 'restaurant';
    let slug = baseSlug;
    let counter = 1;
    const doc = this;
    while (
      await mongoose.model('Restaurant').exists({ slug, _id: { $ne: doc._id } })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    doc.slug = slug;
  }
});

// ── Soft-delete query middleware ─────────────────────────────────
restaurantSchema.pre(
  /^find/,
  function (this: mongoose.Query<unknown, unknown>) {
    if (this.getFilter().deletedAt === undefined) {
      this.setQuery({ ...this.getFilter(), deletedAt: null });
    }
  },
);

// ── Indexes ──────────────────────────────────────────────────────
restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ approvalStatus: 1, isActive: 1 });
restaurantSchema.index({ cuisineType: 1 });
restaurantSchema.index({ 'rating.average': -1 });
restaurantSchema.index({ deletedAt: 1 });

// ── Statics ──────────────────────────────────────────────────────
restaurantSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, deletedAt: null });
};

// ── Export model ─────────────────────────────────────────────────
interface IRestaurantModel extends Model<IRestaurant> {
  findActive(
    filter?: Record<string, unknown>,
  ): ReturnType<Model<IRestaurant>['find']>;
}

const Restaurant = mongoose.model<IRestaurant, IRestaurantModel>(
  'Restaurant',
  restaurantSchema,
);

export default Restaurant;
