// Notification types

export type NotificationType =
  | "order_update"
  | "promotion"
  | "system"
  | "review_reply";

export interface AppNotification {
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
