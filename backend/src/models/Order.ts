/**
 * Order Mongoose model – customer orders from restaurants.
 */
import mongoose, { Model, Schema, Types } from 'mongoose';

// ── Enums ──────────────────────────────────────────────────────

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// ── Types ──────────────────────────────────────────────────────

export interface IOrderItem {
  menuItemId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  variants?: { variantId?: Types.ObjectId; name: string; price: number }[];
  addons?: { addonId?: Types.ObjectId; name: string; price: number }[];
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
  actorId?: Types.ObjectId;
  actorRole?: string;
  note?: string;
}

export interface IDeliveryProof {
  photoUrl: string;
  timestamp: Date;
  note?: string;
}

export interface IRefundLineItem {
  menuItemId: Types.ObjectId;
  itemName: string;
  quantity: number;
  refundAmount: number;
  reason: string;
}

export enum PaymentMethod {
  CASH_ON_DELIVERY = 'cash_on_delivery',
  CARD = 'card',
  WALLET = 'wallet',
  UPI = 'upi',
}

/**
 * Fine-grained courier progress within the delivery leg. Purely rider-facing —
 * it does NOT replace `OrderStatus` (which the customer/vendor consume), it
 * enriches it so the rider app can show DoorDash/Uber-style step granularity.
 */
export enum DeliveryStage {
  HEADING_TO_STORE = 'heading_to_store',
  AT_STORE = 'at_store',
  PICKED_UP = 'picked_up',
  HEADING_TO_CUSTOMER = 'heading_to_customer',
  ARRIVED = 'arrived',
}

export interface IOrder {
  orderNumber: string;
  customerId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  groupOrderId?: Types.ObjectId;
  driverId?: Types.ObjectId;
  items: IOrderItem[];
  deliveryAddress: IDeliveryAddress;
  status: OrderStatus;
  deliveryStage?: DeliveryStage;
  statusHistory: IStatusHistoryEntry[];
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  codCollected?: boolean;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  tipAmount: number;
  total: number;
  couponCode?: string;
  specialInstructions?: string;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  scheduledFor?: Date;
  vendorAcceptedAt?: Date;
  deliveryProof?: IDeliveryProof;
  refundLineItems: IRefundLineItem[];
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
      ref: 'MenuItem',
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
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
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String },
    note: { type: String },
  },
  { _id: false },
);

const deliveryProofSchema = new Schema<IDeliveryProof>(
  {
    photoUrl: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, maxlength: 300 },
  },
  { _id: false },
);

const refundLineItemSchema = new Schema<IRefundLineItem>(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    refundAmount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, maxlength: 300 },
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
      ref: 'User',
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    groupOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v: IOrderItem[]) => v.length > 0,
        message: 'Order must have at least one item',
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
    deliveryStage: {
      type: String,
      enum: Object.values(DeliveryStage),
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
    codCollected: { type: Boolean, default: false },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tipAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    couponCode: { type: String },
    specialInstructions: { type: String, maxlength: 500 },
    estimatedDeliveryTime: { type: Date },
    actualDeliveryTime: { type: Date },
    scheduledFor: { type: Date },
    vendorAcceptedAt: { type: Date },
    deliveryProof: { type: deliveryProofSchema },
    refundLineItems: { type: [refundLineItemSchema], default: [] },
    cancelReason: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ groupOrderId: 1 });

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', orderSchema);

export default Order;
