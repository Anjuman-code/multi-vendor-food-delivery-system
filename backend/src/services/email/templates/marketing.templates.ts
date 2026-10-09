import {
  MarketingAbandonedCartPayload,
  MarketingReviewReminderPayload,
} from '../email.types';
import { alertCallout, primaryButton } from './components';
import { renderEmailLayout, RenderedEmail } from './layout';
import { escapeHtml, formatTaka } from './utils';

export function renderMarketingAbandonedCart(
  data: MarketingAbandonedCartPayload,
): RenderedEmail {
  const subject = 'Did you leave something delicious behind? 🍕';
  const preheader = `You left ${data.itemsCount} item(s) in your cart. Complete your order now!`;

  const itemsList = data.topItemNames.map((i) => `<li>${escapeHtml(i)}</li>`).join('');

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;" class="text-dark">Your cart is waiting for you!</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hi ${escapeHtml(data.customerName || 'there')}, we saved the items you left in your cart so you can easily pick up where you left off:
    </p>

    <div style="background-color:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;" class="bg-subtle">
      <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:8px;" class="text-dark">Cart Summary (${data.itemsCount} items):</div>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#4b5563;line-height:1.6;" class="text-muted">
        ${itemsList}
      </ul>
      <div style="margin-top:12px;font-size:16px;font-weight:700;color:#ea580c;">Estimated Total: ${formatTaka(data.totalValue)}</div>
    </div>

    ${primaryButton('Complete Your Order Now', data.checkoutUrl)}

    ${alertCallout(
      'Your cart items are reserved temporarily based on restaurant kitchen availability. Don’t miss out!',
      'info',
      'Fresh from the Kitchen',
    )}
  `;

  const contentText = `
Hi ${data.customerName || 'there'},

You left ${data.itemsCount} item(s) in your cart totaling ${formatTaka(data.totalValue)}.

Items:
${data.topItemNames.map((n) => `• ${n}`).join('\n')}

Complete your order:
${data.checkoutUrl}

Unsubscribe from promotional emails:
${data.unsubscribeUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
    unsubscribeUrl: data.unsubscribeUrl,
    isMarketing: true,
  });
}

export function renderMarketingReviewReminder(
  data: MarketingReviewReminderPayload,
): RenderedEmail {
  const subject = `How was your meal from ${data.restaurantName}? ⭐️`;
  const preheader = `Share your feedback on order #${data.orderNumber} to help the kitchen improve.`;

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;" class="text-dark">How was your food?</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hi ${escapeHtml(data.customerName || 'there')}, you recently ordered from <strong>${escapeHtml(data.restaurantName)}</strong> (Order #${escapeHtml(data.orderNumber)}).
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Taking 30 seconds to rate your meal and driver helps our restaurant partners maintain great culinary quality and helps your neighbors find the best food.
    </p>

    ${primaryButton('Leave a 30-Second Review', data.reviewUrl)}
  `;

  const contentText = `
Hi ${data.customerName || 'there'},

How was your recent order #${data.orderNumber} from ${data.restaurantName}?
Leave a quick review to let the restaurant know how they did:

${data.reviewUrl}

Unsubscribe from review requests:
${data.unsubscribeUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
    unsubscribeUrl: data.unsubscribeUrl,
    isMarketing: true,
  });
}
