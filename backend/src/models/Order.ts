/**
 * Order Mongoose model – customer orders from restaurants.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

// ── Enums ──────────────────────────────────────────────────────

export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PREPARING = "preparing",
  READY = "ready",
  PICKED_UP = "picked_up",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
}

// ── Types ──────────────────────────────────────────────────────

export interface IOrderItem {
  menuItemId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  variants?: { name: string; price: number }[];
  addons?: { name: string; price: number }[];
  specialInstructions?: string;
  itemTotal: number;
}

export interface IDeliveryAddress {
  street: string;
  apartment?: string;
  area: string;
  district: string;
  coordinates: { latitude: number; longitude: number };
}

export interface IStatusHistoryEntry {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}

export interface IOrder {
  orderNumber: string;
  customerId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  driverId?: Types.ObjectId;
  items: IOrderItem[];
  deliveryAddress: IDeliveryAddress;
  status: OrderStatus;
  statusHistory: IStatusHistoryEntry[];
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  couponCode?: string;
  specialInstructions?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderDocument = mongoose.HydratedDocument<IOrder>;

// ── Sub-schemas ────────────────────────────────────────────────

const orderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    variants: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    addons: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    specialInstructions: { type: String, maxlength: 300 },
    itemTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const deliveryAddressSchema = new Schema<IDeliveryAddress>(
  {
    street: { type: String, required: true },
    apartment: { type: String },
    area: { type: String, required: true },
    district: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
  },
  { _id: false },
);

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false },
);

// ── Main schema ────────────────────────────────────────────────

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v: IOrderItem[]) => v.length > 0,
        message: "Order must have at least one item",
      },
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    paymentMethod: { type: String, required: true },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    couponCode: { type: String },
    specialInstructions: { type: String, maxlength: 500 },
    estimatedDeliveryTime: { type: String },
    actualDeliveryTime: { type: Date },
    cancelReason: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1 });

const Order: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
