import {
  OrderCancelledPayload,
  OrderDeliveredPayload,
  OrderOutForDeliveryPayload,
  OrderPlacedCustomerPayload,
  OrderRefundIssuedPayload,
  OrderVendorNewOrderPayload,
} from '../email.types';
import {
  alertCallout,
  divider,
  keyValList,
  orderItemsTable,
  primaryButton,
  statusBadge,
} from './components';
import { renderEmailLayout, RenderedEmail } from './layout';
import { escapeHtml, formatTaka } from './utils';

export function renderOrderPlacedCustomer(
  data: OrderPlacedCustomerPayload,
): RenderedEmail {
  const name = escapeHtml(data.customerName || 'there');
  const subject = `Order Confirmed: #${data.orderNumber}`;
  const preheader = `We've received your order #${data.orderNumber} totaling ${formatTaka(data.total)}.`;

  const address = `${escapeHtml(data.deliveryAddress.street)}, ${data.deliveryAddress.apartment ? `${escapeHtml(data.deliveryAddress.apartment)}, ` : ''}${escapeHtml(data.deliveryAddress.area)}, ${escapeHtml(data.deliveryAddress.district)}`;

  // Build vendor tables (consolidated for multi-vendor carts)
  const vendorTablesHtml = data.vendors
    .map((v) =>
      orderItemsTable(
        v.items,
        {
          subtotal: v.subtotal,
          deliveryFee: v.deliveryFee,
          tax: v.tax,
          total: v.subtotal + v.deliveryFee + v.tax,
        },
        data.vendors.length > 1 ? `Restaurant: ${v.restaurantName}` : undefined,
      ),
    )
    .join('');

  const metaPairs = [
    { label: 'Order Number', value: `#${data.orderNumber}` },
    { label: 'Payment Method', value: data.paymentMethod.replace(/_/g, ' ').toUpperCase() },
    { label: 'Delivery Address', value: address },
  ];

  if (data.estimatedDeliveryTime) {
    metaPairs.push({ label: 'Estimated Delivery', value: data.estimatedDeliveryTime });
  }

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;" class="text-dark">Order Confirmation</h1>
      ${statusBadge('confirmed', 'Confirmed', 'success')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Thank you for your order, ${name}! Your order has been placed and sent to the kitchen.
    </p>

    ${keyValList(metaPairs)}

    <h2 style="margin:24px 0 8px;font-size:16px;font-weight:700;color:#111827;" class="text-dark">Order Summary</h2>
    ${vendorTablesHtml}

    ${
      data.discount > 0 || data.tipAmount > 0
        ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;border-top:1px dashed #e5e7eb;padding-top:12px;">
        ${data.discount > 0 ? `<tr><td style="font-size:14px;color:#059669;padding:4px 0;">Discount Applied</td><td style="font-size:14px;color:#059669;font-weight:600;text-align:right;">-${formatTaka(data.discount)}</td></tr>` : ''}
        ${data.tipAmount > 0 ? `<tr><td style="font-size:14px;color:#6b7280;padding:4px 0;">Courier Tip</td><td style="font-size:14px;color:#111827;font-weight:500;text-align:right;">${formatTaka(data.tipAmount)}</td></tr>` : ''}
        <tr><td style="font-size:18px;font-weight:800;color:#111827;padding:12px 0;">Grand Total</td><td style="font-size:20px;font-weight:800;color:#ea580c;text-align:right;">${formatTaka(data.total)}</td></tr>
      </table>`
        : ''
    }

    ${primaryButton('Track Your Order Live', data.trackingUrl)}
  `;

  const contentText = `
Order Confirmed: #${data.orderNumber}
Thank you, ${data.customerName}!

Total: ${formatTaka(data.total)}
Payment: ${data.paymentMethod.replace(/_/g, ' ').toUpperCase()}
Delivery Address: ${address}
${data.estimatedDeliveryTime ? `Estimated Delivery: ${data.estimatedDeliveryTime}\n` : ''}
Track your order in real time:
${data.trackingUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
    recipientEmail: data.customerEmail,
  });
}

export function renderOrderVendorNewOrder(
  data: OrderVendorNewOrderPayload,
): RenderedEmail {
  const subject = `New Order: #${data.orderNumber} (${formatTaka(data.total)})`;
  const preheader = `New incoming order #${data.orderNumber} for ${data.restaurantName}. Please review and prepare.`;

  const address = `${escapeHtml(data.deliveryAddress.street)}, ${escapeHtml(data.deliveryAddress.area)}, ${escapeHtml(data.deliveryAddress.district)}`;

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;" class="text-dark">New Incoming Order</h1>
      ${statusBadge('pending', 'New Order', 'brand')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      A new order has been placed for <strong>${escapeHtml(data.restaurantName)}</strong>. Please accept and begin preparation promptly to ensure on-time delivery.
    </p>

    ${keyValList([
      { label: 'Order Number', value: `#${data.orderNumber}` },
      { label: 'Customer', value: data.customerName },
      { label: 'Delivery Location', value: address },
      { label: 'Payment Method', value: data.paymentMethod.replace(/_/g, ' ').toUpperCase() },
      ...(data.specialInstructions ? [{ label: 'Special Instructions', value: data.specialInstructions }] : []),
    ])}

    <h2 style="margin:20px 0 8px;font-size:16px;font-weight:700;color:#111827;" class="text-dark">Kitchen Ticket</h2>
    ${orderItemsTable(data.items, {
      subtotal: data.subtotal,
      deliveryFee: 0,
      tax: 0,
      total: data.total,
    })}

    ${primaryButton('Open Dashboard & Manage Order', data.dashboardUrl)}
  `;

  const contentText = `
New Order #${data.orderNumber} for ${data.restaurantName}!
Customer: ${data.customerName}
Delivery Address: ${address}
Total: ${formatTaka(data.total)}
${data.specialInstructions ? `Special Instructions: ${data.specialInstructions}\n` : ''}
Manage this order:
${data.dashboardUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderOrderOutForDelivery(
  data: OrderOutForDeliveryPayload,
): RenderedEmail {
  const subject = `Your order #${data.orderNumber} is on the way! 🚴`;
  const preheader = `Your Food Rush order from ${data.restaurantName} is out for delivery.`;

  const meta = [
    { label: 'Order Number', value: `#${data.orderNumber}` },
    { label: 'Restaurant', value: data.restaurantName },
    ...(data.driverName ? [{ label: 'Courier', value: data.driverName }] : []),
    ...(data.driverPhone ? [{ label: 'Courier Phone', value: data.driverPhone }] : []),
    ...(data.estimatedDeliveryTime ? [{ label: 'Estimated Delivery', value: data.estimatedDeliveryTime }] : []),
  ];

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;" class="text-dark">Your Order is on the Way</h1>
      ${statusBadge('on_the_way', 'On the Way', 'info')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Great news! Your courier has picked up your food from <strong>${escapeHtml(data.restaurantName)}</strong> and is heading to your address.
    </p>

    ${keyValList(meta)}

    ${primaryButton('Track Your Courier Live', data.trackingUrl)}

    ${alertCallout(
      'Please ensure your phone is reachable so your courier can contact you upon arrival.',
      'info',
      'Delivery Tip',
    )}
  `;

  const contentText = `
Your order #${data.orderNumber} from ${data.restaurantName} is on the way!
${data.driverName ? `Courier: ${data.driverName}\n` : ''}
${data.driverPhone ? `Courier Phone: ${data.driverPhone}\n` : ''}
${data.estimatedDeliveryTime ? `Estimated Delivery: ${data.estimatedDeliveryTime}\n` : ''}
Track live:
${data.trackingUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderOrderDelivered(
  data: OrderDeliveredPayload,
): RenderedEmail {
  const subject = `Delivered: Your order #${data.orderNumber} receipt`;
  const preheader = `Your order from ${data.restaurantName} was delivered. Enjoy your meal!`;

  const meta = [
    { label: 'Order Number', value: `#${data.orderNumber}` },
    { label: 'Delivered At', value: data.deliveredAt },
    { label: 'Total Paid', value: formatTaka(data.totalPaid) },
    { label: 'Payment Method', value: data.paymentMethod.replace(/_/g, ' ').toUpperCase() },
  ];

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#065f46;">Order Delivered!</h1>
      ${statusBadge('delivered', 'Delivered', 'success')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Your meal from <strong>${escapeHtml(data.restaurantName)}</strong> has been delivered. We hope you enjoy it!
    </p>

    ${keyValList(meta)}

    ${
      data.deliveryProofUrl
        ? `<p style="margin:16px 0;font-size:14px;color:#6b7280;">
            Delivery confirmation photo: <a href="${escapeHtml(data.deliveryProofUrl)}" target="_blank" style="color:#f97316;text-decoration:underline;">View proof of delivery</a>
          </p>`
        : ''
    }

    ${divider()}

    <h2 style="margin:0 0 8px;font-size:16px;font-weight:700;color:#111827;" class="text-dark">How was your experience?</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#4b5563;" class="text-muted">
      Your feedback helps local kitchens and drivers maintain great quality.
    </p>

    ${primaryButton('Rate & Review Your Order', data.reviewUrl)}
  `;

  const contentText = `
Your order #${data.orderNumber} from ${data.restaurantName} has been delivered!
Total Paid: ${formatTaka(data.totalPaid)}
Delivered At: ${data.deliveredAt}
${data.deliveryProofUrl ? `Proof of delivery photo: ${data.deliveryProofUrl}\n` : ''}
Rate and review your meal:
${data.reviewUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderOrderCancelled(
  data: OrderCancelledPayload,
): RenderedEmail {
  const subject = `Order Cancelled: #${data.orderNumber}`;
  const preheader = `Your Food Rush order #${data.orderNumber} has been cancelled.`;

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#991b1b;">Order Cancelled</h1>
      ${statusBadge('cancelled', 'Cancelled', 'danger')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Your order <strong>#${escapeHtml(data.orderNumber)}</strong> from ${escapeHtml(data.restaurantName)} has been cancelled.
    </p>

    ${alertCallout(
      `Cancellation reason: ${escapeHtml(data.cancelReason || 'Cancelled by restaurant or customer request.')}`,
      'danger',
      'Reason',
    )}

    ${
      data.refundStatus === 'refunded'
        ? alertCallout(
            'A refund has been initiated to your original payment method. Depending on your bank or mobile wallet provider, funds typically reflect within 24 to 72 hours.',
            'success',
            'Refund Information',
          )
        : ''
    }

    <p style="margin:20px 0 0;font-size:14px;color:#6b7280;">
      If you have questions or need assistance, our support team is available 24/7:
    </p>
    ${primaryButton('Contact Customer Support', data.supportUrl)}
  `;

  const contentText = `
Order #${data.orderNumber} Cancelled.
Restaurant: ${data.restaurantName}
Reason: ${data.cancelReason || 'Cancelled upon request.'}
${data.refundStatus === 'refunded' ? 'Refund status: Refund initiated to your original payment method.\n' : ''}
Need help?
${data.supportUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderOrderRefundIssued(
  data: OrderRefundIssuedPayload,
): RenderedEmail {
  const subject = `Refund Processed: #${data.orderNumber} (${formatTaka(data.refundAmount)})`;
  const preheader = `A refund of ${formatTaka(data.refundAmount)} has been issued for order #${data.orderNumber}.`;

  const meta = [
    { label: 'Order Number', value: `#${data.orderNumber}` },
    { label: 'Refund Amount', value: formatTaka(data.refundAmount) },
    { label: 'Refund Reason', value: data.reason },
    { label: 'Payment Method', value: data.paymentMethod.replace(/_/g, ' ').toUpperCase() },
  ];

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#065f46;">Refund Processed</h1>
      ${statusBadge('refunded', 'Refunded', 'success')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      This email confirms that a refund has been issued for order <strong>#${escapeHtml(data.orderNumber)}</strong>.
    </p>

    ${keyValList(meta)}

    ${alertCallout(
      'The funds have been credited back to your original payment method. Depending on your bank or mobile financial service, it may take 1 to 3 business days for the credit to appear on your statement.',
      'info',
      'Credit Timeline',
    )}
  `;

  const contentText = `
Refund Processed: #${data.orderNumber}
Refund Amount: ${formatTaka(data.refundAmount)}
Reason: ${data.reason}
Payment Method: ${data.paymentMethod.replace(/_/g, ' ').toUpperCase()}

Funds should reflect in your account within 1 to 3 business days.
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}
