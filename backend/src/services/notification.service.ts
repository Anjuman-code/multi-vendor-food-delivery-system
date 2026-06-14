/**
 * Notification service — the single, canonical way to create in-app
 * notifications.
 *
 * Every call:
 *   1. Persists a `Notification` document, and
 *   2. Pushes it in real time to the recipient via Socket.IO on the
 *      role-agnostic `notify:<userId>` room (event: `notification:new`).
 *
 * Creation is best-effort and never throws into the request lifecycle — a
 * notification failure must never break the action that triggered it.
 */
import { Types } from "mongoose";
import Notification, {
  NotificationType,
  type NotificationDocument,
} from "../models/Notification";
import { getIO } from "../socket";

export { NotificationType };

export interface CreateNotificationInput {
  userId: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/** Wire shape pushed to clients (mirrors the frontend `AppNotification`). */
export interface NotificationPayload {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function serialize(doc: NotificationDocument): NotificationPayload {
  return {
    _id: doc._id.toString(),
    userId: doc.userId.toString(),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    isRead: doc.isRead,
    data: doc.data,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** Emit a real-time notification event to the recipient. Non-blocking. */
function emit(userId: Types.ObjectId | string, doc: NotificationDocument): void {
  try {
    getIO()
      .to(`notify:${userId.toString()}`)
      .emit("notification:new", serialize(doc));
  } catch {
    // Socket not initialised / emit failed — the persisted notification will
    // still be delivered on next fetch. Never throw.
  }
}

/**
 * Create a single notification (persist + real-time push).
 * Returns the created document, or `null` if persistence failed.
 */
export const createNotification = async (
  input: CreateNotificationInput,
): Promise<NotificationDocument | null> => {
  try {
    const doc = await Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data,
      isRead: false,
    });
    emit(input.userId, doc);
    return doc;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
};

/**
 * Create many notifications at once (e.g. group orders, broadcast). Each is
 * persisted and pushed independently; individual failures are swallowed.
 */
export const createNotifications = async (
  inputs: CreateNotificationInput[],
): Promise<void> => {
  await Promise.all(inputs.map((input) => createNotification(input)));
};
