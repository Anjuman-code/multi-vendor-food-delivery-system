import { Types } from 'mongoose';

export enum EmailEventKey {
  // ── Security & Account ──
  AUTH_VERIFICATION = 'auth.email_verification',
  AUTH_WELCOME = 'auth.welcome',
  AUTH_PASSWORD_RESET = 'auth.password_reset',
  AUTH_PASSWORD_CHANGED = 'auth.password_changed',
  AUTH_ACCOUNT_SUSPENDED = 'auth.account_suspended',
  AUTH_ACCOUNT_REACTIVATED = 'auth.account_reactivated',
  AUTH_ACCOUNT_DEACTIVATED = 'auth.account_deactivated',

  // ── Customer Order Lifecycle ──
  ORDER_PLACED_CUSTOMER = 'order.placed_customer',
  ORDER_OUT_FOR_DELIVERY = 'order.out_for_delivery',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_REFUND_ISSUED = 'order.refund_issued',

  // ── Vendor Operations & Lifecycle ──
  ORDER_VENDOR_NEW_ORDER = 'order.vendor_new_order',
  VENDOR_APPLICATION_RECEIVED = 'vendor.application_received',
  VENDOR_RESTAURANT_APPROVED = 'vendor.restaurant_approved',
  VENDOR_RESTAURANT_REJECTED = 'vendor.restaurant_rejected',
  VENDOR_REVIEW_RECEIVED = 'vendor.review_received',

  // ── Rider Lifecycle ──
  DRIVER_APPLICATION_RECEIVED = 'driver.application_received',
  DRIVER_APPLICATION_APPROVED = 'driver.application_approved',
  DRIVER_APPLICATION_REJECTED = 'driver.application_rejected',
  DRIVER_ORDER_ASSIGNED = 'driver.order_assigned',

  // ── Reservations ──
  RESERVATION_REQUESTED_CUSTOMER = 'reservation.requested_customer',
  RESERVATION_VENDOR_ALERT = 'reservation.vendor_alert',
  RESERVATION_STATUS_UPDATED = 'reservation.status_updated',
  RESERVATION_REMINDER = 'reservation.reminder',

  // ── Support Tickets & Contact ──
  SUPPORT_TICKET_CREATED = 'support.ticket_created',
  SUPPORT_AGENT_REPLY = 'support.agent_reply',
  SUPPORT_TICKET_RESOLVED = 'support.ticket_resolved',

  // ── Financial ──
  PAYOUT_PROCESSED = 'payout.processed',
  PAYOUT_FAILED = 'payout.failed',

  // ── Admin Alerts ──
  ADMIN_NEW_VENDOR_ALERT = 'admin.new_vendor_alert',
  ADMIN_NEW_DRIVER_ALERT = 'admin.new_driver_alert',

  // ── Marketing & Engagement (Opt-In / Opt-Out Required) ──
  MARKETING_ABANDONED_CART = 'marketing.abandoned_cart',
  MARKETING_REVIEW_REMINDER = 'marketing.review_reminder',
}

export enum EmailCategory {
  SECURITY = 'security',
  ORDER_UPDATES = 'order_updates',
  ACCOUNT_ALERTS = 'account_alerts',
  REVIEW_REQUESTS = 'review_requests',
  PROMOTIONS = 'promotions',
  NEWSLETTER = 'newsletter',
}

export const EVENT_CATEGORY_MAP: Record<EmailEventKey, EmailCategory> = {
  // Security (cannot be disabled)
  [EmailEventKey.AUTH_VERIFICATION]: EmailCategory.SECURITY,
  [EmailEventKey.AUTH_WELCOME]: EmailCategory.SECURITY,
  [EmailEventKey.AUTH_PASSWORD_RESET]: EmailCategory.SECURITY,
  [EmailEventKey.AUTH_PASSWORD_CHANGED]: EmailCategory.SECURITY,
  [EmailEventKey.AUTH_ACCOUNT_SUSPENDED]: EmailCategory.SECURITY,
  [EmailEventKey.AUTH_ACCOUNT_REACTIVATED]: EmailCategory.SECURITY,
  [EmailEventKey.AUTH_ACCOUNT_DEACTIVATED]: EmailCategory.SECURITY,

  // Orders
  [EmailEventKey.ORDER_PLACED_CUSTOMER]: EmailCategory.ORDER_UPDATES,
  [EmailEventKey.ORDER_OUT_FOR_DELIVERY]: EmailCategory.ORDER_UPDATES,
  [EmailEventKey.ORDER_DELIVERED]: EmailCategory.ORDER_UPDATES,
  [EmailEventKey.ORDER_CANCELLED]: EmailCategory.ORDER_UPDATES,
  [EmailEventKey.ORDER_REFUND_ISSUED]: EmailCategory.ORDER_UPDATES,
  [EmailEventKey.ORDER_VENDOR_NEW_ORDER]: EmailCategory.ORDER_UPDATES,

  // Account & Partner
  [EmailEventKey.VENDOR_APPLICATION_RECEIVED]: EmailCategory.ACCOUNT_ALERTS,
  [EmailEventKey.VENDOR_RESTAURANT_APPROVED]: EmailCategory.ACCOUNT_ALERTS,
  [EmailEventKey.VENDOR_RESTAURANT_REJECTED]: EmailCategory.ACCOUNT_ALERTS,
  [EmailEventKey.VENDOR_REVIEW_RECEIVED]: EmailCategory.ACCOUNT_ALERTS,
  [EmailEventKey.DRIVER_APPLICATION_RECEIVED]: EmailCategory.ACCOUNT_ALERTS,
  [EmailEventKey.DRIVER_APPLICATION_APPROVED]: EmailCategory.ACCOUNT_ALERTS,
  [EmailEventKey.DRIVER_APPLICATION_REJECTED]: EmailCategory.ACCOUNT_ALERTS,
  [EmailEventKey.DRIVER_ORDER_ASSIGNED]: EmailCategory.ORDER_UPDATES,

  // Reservations
  [EmailEventKey.RESERVATION_REQUESTED_CUSTOMER]: EmailCategory.ORDER_UPDATES,
  [EmailEventKey.RESERVATION_VENDOR_ALERT]: EmailCategory.ORDER_UPDATES,
  [EmailEventKey.RESERVATION_STATUS_UPDATED]: EmailCategory.ORDER_UPDATES,
  [EmailEventKey.RESERVATION_REMINDER]: EmailCategory.ORDER_UPDATES,

  // Support
  [EmailEventKey.SUPPORT_TICKET_CREATED]: EmailCategory.ACCOUNT_ALERTS,
  [EmailEventKey.SUPPORT_AGENT_REPLY]: EmailCategory.ACCOUNT_ALERTS,
  [EmailEventKey.SUPPORT_TICKET_RESOLVED]: EmailCategory.ACCOUNT_ALERTS,

  // Financial
  [EmailEventKey.PAYOUT_PROCESSED]: EmailCategory.ACCOUNT_ALERTS,
  [EmailEventKey.PAYOUT_FAILED]: EmailCategory.ACCOUNT_ALERTS,

  // Admin
  [EmailEventKey.ADMIN_NEW_VENDOR_ALERT]: EmailCategory.ACCOUNT_ALERTS,
  [EmailEventKey.ADMIN_NEW_DRIVER_ALERT]: EmailCategory.ACCOUNT_ALERTS,

  // Marketing
  [EmailEventKey.MARKETING_ABANDONED_CART]: EmailCategory.PROMOTIONS,
  [EmailEventKey.MARKETING_REVIEW_REMINDER]: EmailCategory.REVIEW_REQUESTS,
};

// ── Strongly Typed Payloads ─────────────────────────────────────

export interface AuthVerificationPayload {
  firstName: string;
  email: string;
  otp: string;
  verificationToken: string;
  verificationUrl: string;
  expiresInHours: number;
}

export interface AuthWelcomePayload {
  firstName: string;
  email: string;
  role: string;
  dashboardUrl: string;
}

export interface AuthPasswordResetPayload {
  firstName: string;
  email: string;
  resetToken: string;
  resetUrl: string;
  expiresInMinutes: number;
  requestIp?: string;
}

export interface AuthPasswordChangedPayload {
  firstName: string;
  email: string;
  changedAt: string;
  clientIp?: string;
  userAgent?: string;
}

export interface AuthAccountSuspendedPayload {
  firstName: string;
  email: string;
  reason?: string;
  suspendedUntil?: string; // null or formatted date string
  isBanned?: boolean;
  supportUrl: string;
}

export interface AuthAccountReactivatedPayload {
  firstName: string;
  email: string;
  reactivatedAt: string;
  loginUrl: string;
}

export interface AuthAccountDeactivatedPayload {
  firstName: string;
  email: string;
  deactivatedAt: string;
}

export interface OrderItemDetail {
  name: string;
  quantity: number;
  price: number;
  itemTotal: number;
  variants?: Array<{ name: string; price: number }>;
  addons?: Array<{ name: string; price: number }>;
  specialInstructions?: string;
}

export interface VendorSubOrderSummary {
  restaurantId: string;
  restaurantName: string;
  orderNumber: string;
  items: OrderItemDetail[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
}

export interface OrderPlacedCustomerPayload {
  orderNumber: string;
  groupOrderId?: string;
  customerName: string;
  customerEmail: string;
  deliveryAddress: {
    street: string;
    apartment?: string;
    area: string;
    district: string;
  };
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  tipAmount: number;
  total: number;
  estimatedDeliveryTime?: string; // Exact ISO or formatted time, omitted if missing
  vendors: VendorSubOrderSummary[];
  trackingUrl: string;
}

export interface OrderVendorNewOrderPayload {
  orderNumber: string;
  orderId: string;
  restaurantName: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress: {
    street: string;
    area: string;
    district: string;
  };
  items: OrderItemDetail[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  specialInstructions?: string;
  dashboardUrl: string;
}

export interface OrderOutForDeliveryPayload {
  orderNumber: string;
  orderId: string;
  restaurantName: string;
  driverName?: string;
  driverPhone?: string;
  deliveryAddress: {
    street: string;
    area: string;
  };
  estimatedDeliveryTime?: string;
  trackingUrl: string;
}

export interface OrderDeliveredPayload {
  orderNumber: string;
  orderId: string;
  restaurantName: string;
  deliveredAt: string;
  totalPaid: number;
  paymentMethod: string;
  deliveryProofUrl?: string; // Linked, not embedded
  reviewUrl: string;
  receiptUrl: string;
  items: OrderItemDetail[];
}

export interface OrderCancelledPayload {
  orderNumber: string;
  orderId: string;
  restaurantName: string;
  cancelledBy: string; // 'customer' | 'vendor' | 'admin'
  cancelReason: string;
  refundStatus: string; // 'none' | 'pending' | 'refunded'
  supportUrl: string;
}

export interface OrderRefundIssuedPayload {
  orderNumber: string;
  orderId: string;
  refundAmount: number;
  reason: string;
  paymentMethod: string;
  lineItems?: Array<{ itemName: string; quantity: number; refundAmount: number }>;
}

export interface VendorApplicationReceivedPayload {
  businessName: string;
  contactName: string;
  email: string;
  submittedAt: string;
}

export interface VendorRestaurantApprovedPayload {
  businessName: string;
  restaurantName: string;
  contactName: string;
  dashboardUrl: string;
  menuSetupUrl: string;
}

export interface VendorRestaurantRejectedPayload {
  businessName: string;
  restaurantName: string;
  contactName: string;
  rejectionReason: string;
  supportUrl: string;
}

export interface VendorReviewReceivedPayload {
  restaurantName: string;
  reviewerName: string;
  rating: number; // 1-5
  reviewTitle?: string;
  comment?: string;
  reviewUrl: string;
}

export interface DriverApplicationReceivedPayload {
  driverName: string;
  vehicleType: string;
  licenseNumber: string;
  submittedAt: string;
}

export interface DriverApplicationApprovedPayload {
  driverName: string;
  dashboardUrl: string;
}

export interface DriverApplicationRejectedPayload {
  driverName: string;
  rejectionReason: string;
  supportUrl: string;
}

export interface DriverOrderAssignedPayload {
  orderNumber: string;
  restaurantName: string;
  restaurantAddress: string;
  deliveryAddress: string;
  estimatedEarnings: number;
  orderUrl: string;
}

export interface ReservationRequestedCustomerPayload {
  reservationNumber: string;
  restaurantName: string;
  restaurantAddress: string;
  guestName: string;
  partySize: number;
  date: string;
  time: string;
  specialRequests?: string;
  status: string;
  detailsUrl: string;
}

export interface ReservationVendorAlertPayload {
  reservationNumber: string;
  restaurantName: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  partySize: number;
  date: string;
  time: string;
  specialRequests?: string;
  vendorReservationsUrl: string;
}

export interface ReservationStatusUpdatedPayload {
  reservationNumber: string;
  restaurantName: string;
  guestName: string;
  status: string; // 'confirmed' | 'rejected' | 'cancelled'
  reason?: string;
  date: string;
  time: string;
  partySize: number;
  detailsUrl: string;
}

export interface ReservationReminderPayload {
  reservationNumber: string;
  restaurantName: string;
  restaurantAddress: string;
  date: string;
  time: string;
  partySize: number;
  detailsUrl: string;
}

export interface SupportTicketCreatedPayload {
  ticketId: string;
  subject: string;
  userName: string;
  messagePreview: string;
  priority: string;
  ticketUrl: string;
}

export interface SupportAgentReplyPayload {
  ticketId: string;
  subject: string;
  userName: string;
  agentName: string;
  replyMessage: string;
  ticketUrl: string;
}

export interface SupportTicketResolvedPayload {
  ticketId: string;
  subject: string;
  userName: string;
  resolution?: string;
  ticketUrl: string;
}

export interface PayoutProcessedPayload {
  payoutId: string;
  recipientName: string;
  amount: number;
  method: string;
  bankName?: string;
  accountNumberMasked?: string;
  transactionRef: string;
  periodStart: string;
  periodEnd: string;
}

export interface PayoutFailedPayload {
  payoutId: string;
  recipientName: string;
  amount: number;
  failureReason: string;
  settingsUrl: string;
}

export interface AdminNewRegistrationAlertPayload {
  type: 'vendor' | 'driver';
  applicantName: string;
  businessOrVehicleName: string;
  email: string;
  phone?: string;
  reviewUrl: string;
}

export interface MarketingAbandonedCartPayload {
  customerName: string;
  itemsCount: number;
  topItemNames: string[];
  totalValue: number;
  checkoutUrl: string;
  unsubscribeUrl: string;
}

export interface MarketingReviewReminderPayload {
  customerName: string;
  orderNumber: string;
  restaurantName: string;
  reviewUrl: string;
  unsubscribeUrl: string;
}

// Map event key to its payload type
export type EventPayloadMap = {
  [EmailEventKey.AUTH_VERIFICATION]: AuthVerificationPayload;
  [EmailEventKey.AUTH_WELCOME]: AuthWelcomePayload;
  [EmailEventKey.AUTH_PASSWORD_RESET]: AuthPasswordResetPayload;
  [EmailEventKey.AUTH_PASSWORD_CHANGED]: AuthPasswordChangedPayload;
  [EmailEventKey.AUTH_ACCOUNT_SUSPENDED]: AuthAccountSuspendedPayload;
  [EmailEventKey.AUTH_ACCOUNT_REACTIVATED]: AuthAccountReactivatedPayload;
  [EmailEventKey.AUTH_ACCOUNT_DEACTIVATED]: AuthAccountDeactivatedPayload;
  [EmailEventKey.ORDER_PLACED_CUSTOMER]: OrderPlacedCustomerPayload;
  [EmailEventKey.ORDER_OUT_FOR_DELIVERY]: OrderOutForDeliveryPayload;
  [EmailEventKey.ORDER_DELIVERED]: OrderDeliveredPayload;
  [EmailEventKey.ORDER_CANCELLED]: OrderCancelledPayload;
  [EmailEventKey.ORDER_REFUND_ISSUED]: OrderRefundIssuedPayload;
  [EmailEventKey.ORDER_VENDOR_NEW_ORDER]: OrderVendorNewOrderPayload;
  [EmailEventKey.VENDOR_APPLICATION_RECEIVED]: VendorApplicationReceivedPayload;
  [EmailEventKey.VENDOR_RESTAURANT_APPROVED]: VendorRestaurantApprovedPayload;
  [EmailEventKey.VENDOR_RESTAURANT_REJECTED]: VendorRestaurantRejectedPayload;
  [EmailEventKey.VENDOR_REVIEW_RECEIVED]: VendorReviewReceivedPayload;
  [EmailEventKey.DRIVER_APPLICATION_RECEIVED]: DriverApplicationReceivedPayload;
  [EmailEventKey.DRIVER_APPLICATION_APPROVED]: DriverApplicationApprovedPayload;
  [EmailEventKey.DRIVER_APPLICATION_REJECTED]: DriverApplicationRejectedPayload;
  [EmailEventKey.DRIVER_ORDER_ASSIGNED]: DriverOrderAssignedPayload;
  [EmailEventKey.RESERVATION_REQUESTED_CUSTOMER]: ReservationRequestedCustomerPayload;
  [EmailEventKey.RESERVATION_VENDOR_ALERT]: ReservationVendorAlertPayload;
  [EmailEventKey.RESERVATION_STATUS_UPDATED]: ReservationStatusUpdatedPayload;
  [EmailEventKey.RESERVATION_REMINDER]: ReservationReminderPayload;
  [EmailEventKey.SUPPORT_TICKET_CREATED]: SupportTicketCreatedPayload;
  [EmailEventKey.SUPPORT_AGENT_REPLY]: SupportAgentReplyPayload;
  [EmailEventKey.SUPPORT_TICKET_RESOLVED]: SupportTicketResolvedPayload;
  [EmailEventKey.PAYOUT_PROCESSED]: PayoutProcessedPayload;
  [EmailEventKey.PAYOUT_FAILED]: PayoutFailedPayload;
  [EmailEventKey.ADMIN_NEW_VENDOR_ALERT]: AdminNewRegistrationAlertPayload;
  [EmailEventKey.ADMIN_NEW_DRIVER_ALERT]: AdminNewRegistrationAlertPayload;
  [EmailEventKey.MARKETING_ABANDONED_CART]: MarketingAbandonedCartPayload;
  [EmailEventKey.MARKETING_REVIEW_REMINDER]: MarketingReviewReminderPayload;
};

export interface SendEmailInput<K extends EmailEventKey = EmailEventKey> {
  to: string;
  data: EventPayloadMap[K];
  idempotencyKey: string;
  userId?: Types.ObjectId | string;
  replyTo?: string;
  authSecrets?: {
    // Encrypted into encryptedAuthPayload at rest; purged on terminal status
    otp?: string;
    rawToken?: string;
    expiresAt?: Date;
  };
}
