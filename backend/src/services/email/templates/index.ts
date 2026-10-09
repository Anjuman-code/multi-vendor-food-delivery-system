import { EmailEventKey, EventPayloadMap } from '../email.types';
import {
  renderAuthAccountDeactivated,
  renderAuthAccountReactivated,
  renderAuthAccountSuspended,
  renderAuthPasswordChanged,
  renderAuthPasswordReset,
  renderAuthVerification,
  renderAuthWelcome,
} from './auth.templates';
import {
  renderAdminNewRegistrationAlert,
  renderPayoutFailed,
  renderPayoutProcessed,
} from './financial.templates';
import { RenderedEmail } from './layout';
import {
  renderMarketingAbandonedCart,
  renderMarketingReviewReminder,
} from './marketing.templates';
import {
  renderOrderCancelled,
  renderOrderDelivered,
  renderOrderOutForDelivery,
  renderOrderPlacedCustomer,
  renderOrderRefundIssued,
  renderOrderVendorNewOrder,
} from './order.templates';
import {
  renderDriverApplicationApproved,
  renderDriverApplicationReceived,
  renderDriverApplicationRejected,
  renderDriverOrderAssigned,
  renderVendorApplicationReceived,
  renderVendorRestaurantApproved,
  renderVendorRestaurantRejected,
  renderVendorReviewReceived,
} from './partner.templates';
import {
  renderReservationReminder,
  renderReservationRequestedCustomer,
  renderReservationStatusUpdated,
  renderReservationVendorAlert,
} from './reservation.templates';
import {
  renderSupportAgentReply,
  renderSupportTicketCreated,
  renderSupportTicketResolved,
} from './support.templates';

export * from './layout';
export * from './components';
export * from './utils';

export function renderEmailTemplate<K extends EmailEventKey>(
  eventKey: K,
  payload: EventPayloadMap[K],
): RenderedEmail {
  switch (eventKey) {
    // ── Auth ──
    case EmailEventKey.AUTH_VERIFICATION:
      return renderAuthVerification(payload as EventPayloadMap[EmailEventKey.AUTH_VERIFICATION]);
    case EmailEventKey.AUTH_WELCOME:
      return renderAuthWelcome(payload as EventPayloadMap[EmailEventKey.AUTH_WELCOME]);
    case EmailEventKey.AUTH_PASSWORD_RESET:
      return renderAuthPasswordReset(payload as EventPayloadMap[EmailEventKey.AUTH_PASSWORD_RESET]);
    case EmailEventKey.AUTH_PASSWORD_CHANGED:
      return renderAuthPasswordChanged(payload as EventPayloadMap[EmailEventKey.AUTH_PASSWORD_CHANGED]);
    case EmailEventKey.AUTH_ACCOUNT_SUSPENDED:
      return renderAuthAccountSuspended(payload as EventPayloadMap[EmailEventKey.AUTH_ACCOUNT_SUSPENDED]);
    case EmailEventKey.AUTH_ACCOUNT_REACTIVATED:
      return renderAuthAccountReactivated(payload as EventPayloadMap[EmailEventKey.AUTH_ACCOUNT_REACTIVATED]);
    case EmailEventKey.AUTH_ACCOUNT_DEACTIVATED:
      return renderAuthAccountDeactivated(payload as EventPayloadMap[EmailEventKey.AUTH_ACCOUNT_DEACTIVATED]);

    // ── Orders ──
    case EmailEventKey.ORDER_PLACED_CUSTOMER:
      return renderOrderPlacedCustomer(payload as EventPayloadMap[EmailEventKey.ORDER_PLACED_CUSTOMER]);
    case EmailEventKey.ORDER_VENDOR_NEW_ORDER:
      return renderOrderVendorNewOrder(payload as EventPayloadMap[EmailEventKey.ORDER_VENDOR_NEW_ORDER]);
    case EmailEventKey.ORDER_OUT_FOR_DELIVERY:
      return renderOrderOutForDelivery(payload as EventPayloadMap[EmailEventKey.ORDER_OUT_FOR_DELIVERY]);
    case EmailEventKey.ORDER_DELIVERED:
      return renderOrderDelivered(payload as EventPayloadMap[EmailEventKey.ORDER_DELIVERED]);
    case EmailEventKey.ORDER_CANCELLED:
      return renderOrderCancelled(payload as EventPayloadMap[EmailEventKey.ORDER_CANCELLED]);
    case EmailEventKey.ORDER_REFUND_ISSUED:
      return renderOrderRefundIssued(payload as EventPayloadMap[EmailEventKey.ORDER_REFUND_ISSUED]);

    // ── Partners ──
    case EmailEventKey.VENDOR_APPLICATION_RECEIVED:
      return renderVendorApplicationReceived(payload as EventPayloadMap[EmailEventKey.VENDOR_APPLICATION_RECEIVED]);
    case EmailEventKey.VENDOR_RESTAURANT_APPROVED:
      return renderVendorRestaurantApproved(payload as EventPayloadMap[EmailEventKey.VENDOR_RESTAURANT_APPROVED]);
    case EmailEventKey.VENDOR_RESTAURANT_REJECTED:
      return renderVendorRestaurantRejected(payload as EventPayloadMap[EmailEventKey.VENDOR_RESTAURANT_REJECTED]);
    case EmailEventKey.VENDOR_REVIEW_RECEIVED:
      return renderVendorReviewReceived(payload as EventPayloadMap[EmailEventKey.VENDOR_REVIEW_RECEIVED]);
    case EmailEventKey.DRIVER_APPLICATION_RECEIVED:
      return renderDriverApplicationReceived(payload as EventPayloadMap[EmailEventKey.DRIVER_APPLICATION_RECEIVED]);
    case EmailEventKey.DRIVER_APPLICATION_APPROVED:
      return renderDriverApplicationApproved(payload as EventPayloadMap[EmailEventKey.DRIVER_APPLICATION_APPROVED]);
    case EmailEventKey.DRIVER_APPLICATION_REJECTED:
      return renderDriverApplicationRejected(payload as EventPayloadMap[EmailEventKey.DRIVER_APPLICATION_REJECTED]);
    case EmailEventKey.DRIVER_ORDER_ASSIGNED:
      return renderDriverOrderAssigned(payload as EventPayloadMap[EmailEventKey.DRIVER_ORDER_ASSIGNED]);

    // ── Reservations ──
    case EmailEventKey.RESERVATION_REQUESTED_CUSTOMER:
      return renderReservationRequestedCustomer(payload as EventPayloadMap[EmailEventKey.RESERVATION_REQUESTED_CUSTOMER]);
    case EmailEventKey.RESERVATION_VENDOR_ALERT:
      return renderReservationVendorAlert(payload as EventPayloadMap[EmailEventKey.RESERVATION_VENDOR_ALERT]);
    case EmailEventKey.RESERVATION_STATUS_UPDATED:
      return renderReservationStatusUpdated(payload as EventPayloadMap[EmailEventKey.RESERVATION_STATUS_UPDATED]);
    case EmailEventKey.RESERVATION_REMINDER:
      return renderReservationReminder(payload as EventPayloadMap[EmailEventKey.RESERVATION_REMINDER]);

    // ── Support ──
    case EmailEventKey.SUPPORT_TICKET_CREATED:
      return renderSupportTicketCreated(payload as EventPayloadMap[EmailEventKey.SUPPORT_TICKET_CREATED]);
    case EmailEventKey.SUPPORT_AGENT_REPLY:
      return renderSupportAgentReply(payload as EventPayloadMap[EmailEventKey.SUPPORT_AGENT_REPLY]);
    case EmailEventKey.SUPPORT_TICKET_RESOLVED:
      return renderSupportTicketResolved(payload as EventPayloadMap[EmailEventKey.SUPPORT_TICKET_RESOLVED]);

    // ── Financial & Admin ──
    case EmailEventKey.PAYOUT_PROCESSED:
      return renderPayoutProcessed(payload as EventPayloadMap[EmailEventKey.PAYOUT_PROCESSED]);
    case EmailEventKey.PAYOUT_FAILED:
      return renderPayoutFailed(payload as EventPayloadMap[EmailEventKey.PAYOUT_FAILED]);
    case EmailEventKey.ADMIN_NEW_VENDOR_ALERT:
    case EmailEventKey.ADMIN_NEW_DRIVER_ALERT:
      return renderAdminNewRegistrationAlert(payload as EventPayloadMap[EmailEventKey.ADMIN_NEW_VENDOR_ALERT]);

    // ── Marketing ──
    case EmailEventKey.MARKETING_ABANDONED_CART:
      return renderMarketingAbandonedCart(payload as EventPayloadMap[EmailEventKey.MARKETING_ABANDONED_CART]);
    case EmailEventKey.MARKETING_REVIEW_REMINDER:
      return renderMarketingReviewReminder(payload as EventPayloadMap[EmailEventKey.MARKETING_REVIEW_REMINDER]);

    default:
      throw new Error(`No email template registered for event key: ${eventKey}`);
  }
}
