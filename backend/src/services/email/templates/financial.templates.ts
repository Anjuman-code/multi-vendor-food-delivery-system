import {
  AdminNewRegistrationAlertPayload,
  PayoutFailedPayload,
  PayoutProcessedPayload,
} from '../email.types';
import { alertCallout, keyValList, primaryButton, statusBadge } from './components';
import { renderEmailLayout, RenderedEmail } from './layout';
import { escapeHtml, formatTaka } from './utils';

export function renderPayoutProcessed(
  data: PayoutProcessedPayload,
): RenderedEmail {
  const subject = `Payout Remittance Voucher: ${formatTaka(data.amount)} (Ref: ${data.transactionRef})`;
  const preheader = `Your payout of ${formatTaka(data.amount)} has been successfully transferred.`;

  const meta = [
    { label: 'Amount Disbursed', value: formatTaka(data.amount) },
    { label: 'Payment Method', value: data.method.toUpperCase() },
    ...(data.bankName ? [{ label: 'Bank Name', value: data.bankName }] : []),
    ...(data.accountNumberMasked ? [{ label: 'Account / Mobile', value: data.accountNumberMasked }] : []),
    { label: 'Transaction Reference', value: data.transactionRef },
    { label: 'Settlement Period', value: `${data.periodStart} to ${data.periodEnd}` },
  ];

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#065f46;">Payout Completed</h1>
      ${statusBadge('completed', 'Disbursed', 'success')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hello ${escapeHtml(data.recipientName)}, your earnings payout has been processed and transferred to your registered account.
    </p>

    ${keyValList(meta)}

    ${alertCallout(
      'Funds typically reflect in your bank account or mobile wallet within 24 hours depending on clearance networks.',
      'info',
      'Remittance Advice',
    )}
  `;

  const contentText = `
Payout Processed!
Recipient: ${data.recipientName}
Amount: ${formatTaka(data.amount)}
Reference: ${data.transactionRef}
Method: ${data.method.toUpperCase()}
Period: ${data.periodStart} to ${data.periodEnd}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderPayoutFailed(data: PayoutFailedPayload): RenderedEmail {
  const subject = `Action Required: Payout Failed (${formatTaka(data.amount)})`;
  const preheader = 'Your recent payout attempt failed. Please verify your banking details.';

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#991b1b;">Payout Failed</h1>
      ${statusBadge('failed', 'Transfer Failed', 'danger')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hello ${escapeHtml(data.recipientName)}, our automated bank transfer of <strong>${formatTaka(data.amount)}</strong> could not be completed.
    </p>

    ${alertCallout(
      data.failureReason || 'Bank declined the transaction. Check account number and routing codes.',
      'danger',
      'Failure Reason',
    )}

    <p style="margin:20px 0 0;font-size:14px;color:#4b5563;">
      Please review and update your banking or mobile wallet details in your portal settings so we can retry disbursement:
    </p>

    ${primaryButton('Update Bank Details', data.settingsUrl)}
  `;

  const contentText = `
Payout Transfer Failed (${formatTaka(data.amount)})!
Recipient: ${data.recipientName}
Reason: ${data.failureReason || 'Bank transfer declined.'}

Update your bank details:
${data.settingsUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderAdminNewRegistrationAlert(
  data: AdminNewRegistrationAlertPayload,
): RenderedEmail {
  const roleName = data.type === 'vendor' ? 'Restaurant Partner' : 'Delivery Courier';
  const subject = `[Admin Alert] New ${roleName} Application: ${data.businessOrVehicleName}`;
  const preheader = `New ${data.type} application awaiting review: ${data.applicantName}.`;

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;" class="text-dark">New ${roleName} Application</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      A new application has been submitted and is waiting in the administrative approval queue.
    </p>

    ${keyValList([
      { label: 'Role', value: roleName },
      { label: 'Applicant Name', value: data.applicantName },
      { label: data.type === 'vendor' ? 'Restaurant / Business' : 'Vehicle', value: data.businessOrVehicleName },
      { label: 'Email', value: data.email },
      ...(data.phone ? [{ label: 'Phone', value: data.phone }] : []),
    ])}

    ${primaryButton('Open Admin Review Queue', data.reviewUrl)}
  `;

  const contentText = `
New ${roleName} Application:
Applicant: ${data.applicantName}
Business/Vehicle: ${data.businessOrVehicleName}
Email: ${data.email}
${data.phone ? `Phone: ${data.phone}\n` : ''}
Review in admin portal:
${data.reviewUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}
