/**
 * OrderMessage – persisted, order-scoped chat between the customer and the two
 * other parties to a delivery. Two independent channels per order:
 *   - customer_driver : customer ↔ assigned rider
 *   - customer_vendor : customer ↔ restaurant
 * Admins/support can read both channels for dispute resolution.
 */
import mongoose, { Model, Schema, Types } from 'mongoose';

export enum MessageChannel {
  CUSTOMER_DRIVER = 'customer_driver',
  CUSTOMER_VENDOR = 'customer_vendor',
}

export interface IOrderMessage {
  orderId: Types.ObjectId;
  channel: MessageChannel;
  senderId: Types.ObjectId;
  senderRole: string;
  text: string;
  attachments: string[];
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type OrderMessageDocument = mongoose.HydratedDocument<IOrderMessage>;

const orderMessageSchema = new Schema<IOrderMessage>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(MessageChannel),
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: { type: String, required: true },
    text: { type: String, required: true, maxlength: 2000 },
    attachments: { type: [String], default: [] },
    readBy: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
  },
  { timestamps: true },
);

orderMessageSchema.index({ orderId: 1, channel: 1, createdAt: 1 });

const OrderMessage: Model<IOrderMessage> = mongoose.model<IOrderMessage>(
  'OrderMessage',
  orderMessageSchema,
);

export default OrderMessage;
