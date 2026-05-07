/**
 * Cart — server-side persisted cart for cross-device access and
 * abandoned-cart recovery. TTL index auto-cleans after 7 days.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export interface ICartItem {
  menuItemId: Types.ObjectId;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  variants: { variantId?: Types.ObjectId; name: string; price: number }[];
  addons: { addonId?: Types.ObjectId; name: string; price: number }[];
  specialInstructions?: string;
}

export interface ICart {
  userId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  restaurantName: string;
  items: ICartItem[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CartDocument = mongoose.HydratedDocument<ICart>;

const cartItemSchema = new Schema<ICartItem>(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    variants: [
      {
        variantId: { type: Schema.Types.ObjectId },
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    addons: [
      {
        addonId: { type: Schema.Types.ObjectId },
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    specialInstructions: { type: String, maxlength: 300 },
  },
  { _id: false },
);

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    restaurantName: { type: String, required: true },
    items: { type: [cartItemSchema], default: [] },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);

export default Cart;
