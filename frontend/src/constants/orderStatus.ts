/**
 * Canonical Order Status enums, labels, and transition rules.
 * Keeps status state-machine behavior identical across Customer, Vendor, Rider, and Admin.
 */

export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  READY: "ready",
  PICKED_UP: "picked_up",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type OrderStatusType =
  | (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]
  | "ready_for_pickup"
  | "on_the_way";

/**
 * Linear happy path progression of an order.
 */
export const ORDER_PROGRESSION: OrderStatusType[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "picked_up",
  "delivered",
];

/**
 * Valid forward transitions allowed per user role.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<
  "vendor" | "driver" | "customer" | "admin",
  Record<string, string[]>
> = {
  vendor: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["cancelled"],
  },
  driver: {
    ready: ["picked_up"],
    picked_up: ["delivered"],
  },
  customer: {
    pending: ["cancelled"],
  },
  admin: {
    pending: ["confirmed", "preparing", "ready", "picked_up", "delivered", "cancelled"],
    confirmed: ["preparing", "ready", "picked_up", "delivered", "cancelled"],
    preparing: ["ready", "picked_up", "delivered", "cancelled"],
    ready: ["picked_up", "delivered", "cancelled"],
    picked_up: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  },
};

/**
 * Validates whether an actor role can transition an order from currentStatus to nextStatus.
 */
export function canTransitionOrder(
  currentStatus: string,
  nextStatus: string,
  role: "vendor" | "driver" | "customer" | "admin"
): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[role]?.[currentStatus];
  return Array.isArray(allowed) && allowed.includes(nextStatus);
}
