/**
 * Notification Mongoose model – in-app notifications for users.
 */
import mongoose, { Schema, Model, Types } from "mongoose";

export enum NotificationType {
  ORDER_UPDATE = "order_update",
  PROMOTION = "promotion",
  SYSTEM = "system",
  REVIEW_REPLY = "review_reply",
}

export interface INotification {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = mongoose.HydratedDocument<INotification>;

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    isRead: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification: Model<INotification> = mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);

export default Notification;
