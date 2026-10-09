import {
  SupportAgentReplyPayload,
  SupportTicketCreatedPayload,
  SupportTicketResolvedPayload,
} from '../email.types';
import { alertCallout, keyValList, primaryButton, statusBadge } from './components';
import { renderEmailLayout, RenderedEmail } from './layout';
import { escapeHtml } from './utils';

export function renderSupportTicketCreated(
  data: SupportTicketCreatedPayload,
): RenderedEmail {
  const subject = `Support Ticket Received: [${data.ticketId}] ${data.subject}`;
  const preheader = `We've received your inquiry regarding "${data.subject}". Our support team will reply within 24 hours.`;

  const meta = [
    { label: 'Ticket Reference', value: data.ticketId },
    { label: 'Subject', value: data.subject },
    { label: 'Priority', value: data.priority.toUpperCase() },
  ];

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;" class="text-dark">Support Ticket Created</h1>
      ${statusBadge('open', 'Open', 'warning')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hi ${escapeHtml(data.userName || 'there')}, we have received your request. A member of our customer care team will review your inquiry and get back to you shortly.
    </p>

    ${keyValList(meta)}

    <div style="background-color:#f9fafb;border-left:3px solid #f97316;border-radius:4px;padding:14px 16px;margin:20px 0;" class="bg-subtle">
      <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:6px;">Your Message Preview:</div>
      <div style="font-size:14px;color:#374151;line-height:1.5;">${escapeHtml(data.messagePreview)}</div>
    </div>

    ${alertCallout(
      'Our standard response SLA is under 24 hours. You can view progress or reply with additional information in the help portal.',
      'info',
      'Response Time',
    )}

    ${primaryButton('View Ticket in Help Center', data.ticketUrl)}
  `;

  const contentText = `
Support Ticket Received: [${data.ticketId}]
Subject: ${data.subject}
Priority: ${data.priority.toUpperCase()}

Your message:
"${data.messagePreview}"

Our team will respond within 24 hours. You can track this ticket here:
${data.ticketUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderSupportAgentReply(
  data: SupportAgentReplyPayload,
): RenderedEmail {
  const subject = `New Reply on Ticket [${data.ticketId}]: ${data.subject}`;
  const preheader = `${data.agentName} replied to your support ticket.`;

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;" class="text-dark">Support Team Reply</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hi ${escapeHtml(data.userName || 'there')}, <strong>${escapeHtml(data.agentName)}</strong> from Food Rush Support has replied to your inquiry:
    </p>

    <div style="background-color:#fff7ed;border-left:4px solid #ea580c;border-radius:6px;padding:18px;margin:20px 0;">
      <div style="font-size:13px;font-weight:700;color:#9a3412;margin-bottom:8px;">${escapeHtml(data.agentName)} wrote:</div>
      <div style="font-size:14px;color:#111827;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.replyMessage)}</div>
    </div>

    <p style="margin:20px 0 0;font-size:14px;color:#4b5563;">
      To send a response or upload attachments, please reply through the support portal:
    </p>

    ${primaryButton('Open Ticket to Reply', data.ticketUrl)}
  `;

  const contentText = `
New Reply from Food Rush Support on Ticket [${data.ticketId}]:
Subject: ${data.subject}
From: ${data.agentName}

Message:
${data.replyMessage}

Reply online:
${data.ticketUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderSupportTicketResolved(
  data: SupportTicketResolvedPayload,
): RenderedEmail {
  const subject = `Resolved: Ticket [${data.ticketId}] - ${data.subject}`;
  const preheader = `Your Food Rush support ticket [${data.ticketId}] has been marked as resolved.`;

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#065f46;">Ticket Resolved</h1>
      ${statusBadge('resolved', 'Resolved', 'success')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hi ${escapeHtml(data.userName || 'there')}, your support ticket regarding <strong>"${escapeHtml(data.subject)}"</strong> has been marked as resolved.
    </p>

    ${
      data.resolution
        ? alertCallout(
            data.resolution,
            'success',
            'Resolution Summary',
          )
        : ''
    }

    <p style="margin:20px 0 0;font-size:14px;color:#4b5563;">
      If you feel this issue is still unresolved, you can reopen it anytime by visiting the ticket link below:
    </p>

    ${primaryButton('View Resolved Ticket', data.ticketUrl)}
  `;

  const contentText = `
Ticket [${data.ticketId}] Resolved:
Subject: ${data.subject}
${data.resolution ? `Resolution: ${data.resolution}\n` : ''}
If you need further assistance, you can reopen this ticket:
${data.ticketUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}
