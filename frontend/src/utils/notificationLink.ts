/**
 * Resolve the in-app destination for a notification, based on its `data`
 * payload and the recipient's role. Returns `null` when there's nowhere
 * meaningful to navigate.
 */
import type { AppNotification } from "@/types/notification";

export function getNotificationLink(
  notification: AppNotification,
  role?: string,
): string | null {
  const data = notification.data ?? {};
  const orderId = typeof data.orderId === "string" ? data.orderId : undefined;
  const ticketId = typeof data.ticketId === "string" ? data.ticketId : undefined;

  if (orderId) {
    switch (role) {
      case "vendor":
        return `/vendor/orders/${orderId}`;
      case "driver":
        return `/rider/active`;
      case "admin":
      case "support":
        return `/admin/orders/${orderId}`;
      default:
        return `/orders/${orderId}`;
    }
  }

  if (ticketId) {
    switch (role) {
      case "vendor":
        return `/vendor/support/${ticketId}`;
      case "driver":
        return `/rider/support/${ticketId}`;
      case "admin":
      case "support":
        return `/admin/support/${ticketId}`;
      default:
        return `/support/${ticketId}`;
    }
  }

  return null;
}
