import { escapeHtml, formatTaka } from './utils';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral';

const TONE_COLORS: Record<
  StatusTone,
  { bg: string; text: string; border: string }
> = {
  success: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  warning: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  danger: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  info: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  brand: { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  neutral: { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
};

/**
 * Bulletproof primary CTA button with Outlook VML fallback + visible fallback URL.
 */
export function primaryButton(text: string, url: string): string {
  const safeText = escapeHtml(text);
  const safeUrl = escapeHtml(url);

  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;" align="center">
    <tr>
      <td align="center">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="16%" strokecolor="#ea580c" fillcolor="#f97316">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${safeText}</center>
        </v:roundrect>
        <![endif]-->
        <a href="${safeUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;font-size:15px;font-weight:600;line-height:48px;text-align:center;text-decoration:none;padding:0 36px;border-radius:8px;box-shadow:0 2px 4px rgba(234,88,12,0.25);mso-hide:all;">
          ${safeText}
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top:12px;">
        <span style="font-size:12px;color:#9ca3af;">Or copy and paste this link:</span><br/>
        <a href="${safeUrl}" target="_blank" style="font-size:12px;color:#f97316;word-break:break-all;text-decoration:underline;">${safeUrl}</a>
      </td>
    </tr>
  </table>
  `;
}

/**
 * High-visibility OTP code display card.
 */
export function otpBox(otp: string, label = 'Your verification code'): string {
  const safeOtp = escapeHtml(otp);
  const safeLabel = escapeHtml(label);

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td align="center" style="background-color:#fff7ed;border:2px dashed #fed7aa;border-radius:10px;padding:24px 16px;">
        <div style="font-size:12px;font-weight:700;color:#9a3412;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">
          ${safeLabel}
        </div>
        <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#ea580c;font-family:monospace,Consolas,'Courier New',Courier;line-height:1.2;">
          ${safeOtp}
        </div>
      </td>
    </tr>
  </table>
  `;
}

/**
 * Status tone badge pill matching app's StatusBadge.tsx.
 */
export function statusBadge(status: string, label?: string, tone: StatusTone = 'info'): string {
  const displayLabel = escapeHtml(label || status.replace(/_/g, ' ').toUpperCase());
  const colors = TONE_COLORS[tone] || TONE_COLORS.info;

  return `<span style="display:inline-block;padding:4px 10px;font-size:12px;font-weight:700;border-radius:9999px;background-color:${colors.bg};color:${colors.text};border:1px solid ${colors.border};text-transform:uppercase;letter-spacing:0.5px;">${displayLabel}</span>`;
}

/**
 * Info / Alert callout box.
 */
export function alertCallout(
  message: string,
  tone: StatusTone = 'info',
  title?: string,
): string {
  const colors = TONE_COLORS[tone] || TONE_COLORS.info;
  const safeMessage = escapeHtml(message);
  const safeTitle = title ? escapeHtml(title) : '';

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:${colors.bg};border-left:4px solid ${colors.text};border-top:1px solid ${colors.border};border-right:1px solid ${colors.border};border-bottom:1px solid ${colors.border};border-radius:6px;padding:14px 18px;">
        ${safeTitle ? `<div style="font-size:14px;font-weight:700;color:${colors.text};margin-bottom:4px;">${safeTitle}</div>` : ''}
        <div style="font-size:14px;color:${colors.text};line-height:1.5;">${safeMessage}</div>
      </td>
    </tr>
  </table>
  `;
}

/**
 * Key-Value metadata list table.
 */
export function keyValList(pairs: Array<{ label: string; value: string | number }>): string {
  const rows = pairs
    .map(
      (pair) => `
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#6b7280;width:40%;vertical-align:top;">${escapeHtml(pair.label)}</td>
        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;width:60%;text-align:right;vertical-align:top;" class="text-dark">${escapeHtml(pair.value)}</td>
      </tr>`,
    )
    .join('');

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
    ${rows}
  </table>
  `;
}

export interface OrderItemTableRow {
  name: string;
  quantity: number;
  itemTotal: number;
  variants?: Array<{ name: string; price: number }>;
  addons?: Array<{ name: string; price: number }>;
}

export interface OrderTableTotals {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount?: number;
  tipAmount?: number;
  total: number;
}

/**
 * Itemized order receipt table.
 */
export function orderItemsTable(
  items: OrderItemTableRow[],
  totals: OrderTableTotals,
  vendorName?: string,
): string {
  const itemRows = items
    .map((item) => {
      const options = [
        ...(item.variants || []).map((v) => v.name),
        ...(item.addons || []).map((a) => `+${a.name}`),
      ].join(', ');

      return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;line-height:1.4;" class="text-dark">
          <strong>${item.quantity}x</strong> ${escapeHtml(item.name)}
          ${options ? `<div style="font-size:12px;color:#6b7280;">${escapeHtml(options)}</div>` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600;text-align:right;vertical-align:top;" class="text-dark">
          ${formatTaka(item.itemTotal)}
        </td>
      </tr>`;
    })
    .join('');

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    ${vendorName ? `<tr><td colspan="2" style="font-size:15px;font-weight:700;color:#111827;padding-bottom:8px;border-bottom:2px solid #e5e7eb;" class="text-dark">${escapeHtml(vendorName)}</td></tr>` : ''}
    ${itemRows}
    <tr>
      <td style="padding:10px 0 4px;font-size:14px;color:#6b7280;">Subtotal</td>
      <td style="padding:10px 0 4px;font-size:14px;color:#111827;font-weight:500;text-align:right;" class="text-dark">${formatTaka(totals.subtotal)}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;font-size:14px;color:#6b7280;">Delivery Fee</td>
      <td style="padding:4px 0;font-size:14px;color:#111827;font-weight:500;text-align:right;" class="text-dark">${formatTaka(totals.deliveryFee)}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;font-size:14px;color:#6b7280;">Estimated Tax & Fees</td>
      <td style="padding:4px 0;font-size:14px;color:#111827;font-weight:500;text-align:right;" class="text-dark">${formatTaka(totals.tax)}</td>
    </tr>
    ${
      totals.discount && totals.discount > 0
        ? `<tr>
            <td style="padding:4px 0;font-size:14px;color:#059669;">Promo Discount</td>
            <td style="padding:4px 0;font-size:14px;color:#059669;font-weight:600;text-align:right;">-${formatTaka(totals.discount)}</td>
          </tr>`
        : ''
    }
    ${
      totals.tipAmount && totals.tipAmount > 0
        ? `<tr>
            <td style="padding:4px 0;font-size:14px;color:#6b7280;">Courier Tip</td>
            <td style="padding:4px 0;font-size:14px;color:#111827;font-weight:500;text-align:right;" class="text-dark">${formatTaka(totals.tipAmount)}</td>
          </tr>`
        : ''
    }
    <tr>
      <td style="padding:12px 0;font-size:16px;font-weight:800;color:#111827;border-top:2px solid #e5e7eb;" class="text-dark">Total</td>
      <td style="padding:12px 0;font-size:18px;font-weight:800;color:#ea580c;text-align:right;border-top:2px solid #e5e7eb;">${formatTaka(totals.total)}</td>
    </tr>
  </table>
  `;
}

/**
 * Subtle separator line.
 */
export function divider(): string {
  return '<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;" />';
}
