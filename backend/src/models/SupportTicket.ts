/**
 * SupportTicket — customer support system with threaded messages,
 * priority/status tracking, and agent assignment.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export enum TicketType {
  ORDER_ISSUE = "order_issue",
  REFUND_REQUEST = "refund_request",
  ACCOUNT_ISSUE = "account_issue",
  RESTAURANT_COMPLAINT = "restaurant_complaint",
  DRIVER_COMPLAINT = "driver_complaint",
  GENERAL = "general",
}

export enum TicketPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  WAITING_ON_USER = "waiting_on_user",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

export interface ITicketMessage {
  senderId: Types.ObjectId;
  senderRole: string;
  message: string;
  attachments: string[];
  createdAt: Date;
}

export interface ISupportTicket {
  userId: Types.ObjectId;
  orderId?: Types.ObjectId;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  messages: ITicketMessage[];
  assignedTo?: Types.ObjectId;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SupportTicketDocument = mongoose.HydratedDocument<ISupportTicket>;

const ticketMessageSchema = new Schema<ITicketMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, required: true },
    message: { type: String, required: true, maxlength: 2000 },
    attachments: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    type: {
      type: String,
      enum: Object.values(TicketType),
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(TicketPriority),
      default: TicketPriority.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.OPEN,
    },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    messages: { type: [ticketMessageSchema], default: [] },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    resolution: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });

const SupportTicket: Model<ISupportTicket> = mongoose.model<ISupportTicket>(
  "SupportTicket",
  supportTicketSchema,
);

export default SupportTicket;
