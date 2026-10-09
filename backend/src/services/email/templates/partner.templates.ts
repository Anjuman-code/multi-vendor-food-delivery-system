import {
  DriverApplicationApprovedPayload,
  DriverApplicationReceivedPayload,
  DriverApplicationRejectedPayload,
  DriverOrderAssignedPayload,
  VendorApplicationReceivedPayload,
  VendorRestaurantApprovedPayload,
  VendorRestaurantRejectedPayload,
  VendorReviewReceivedPayload,
} from '../email.types';
import { alertCallout, keyValList, primaryButton, statusBadge } from './components';
import { renderEmailLayout, RenderedEmail } from './layout';
import { escapeHtml, formatTaka } from './utils';

export function renderVendorApplicationReceived(
  data: VendorApplicationReceivedPayload,
): RenderedEmail {
  const subject = 'Restaurant Partnership Application Received';
  const preheader = `We've received your partnership application for ${data.businessName}.`;

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;" class="text-dark">Application Received</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hi ${escapeHtml(data.contactName)}, thank you for your interest in partnering with Food Rush! We have received your application for <strong>${escapeHtml(data.businessName)}</strong>.
    </p>

    ${alertCallout(
      'Our merchant onboarding team will review your business license, tax identification, and menu details. This review typically takes 24 to 48 business hours.',
      'info',
      'What Happens Next?',
    )}

    <p style="margin:20px 0 0;font-size:14px;color:#6b7280;">
      We will notify you via email as soon as your account has been reviewed.
    </p>
  `;

  const contentText = `
Hi ${data.contactName},

Thank you for applying to partner with Food Rush for ${data.businessName}.
Our onboarding team is reviewing your documents. You will hear from us within 24 to 48 hours.
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
    recipientEmail: data.email,
  });
}

export function renderVendorRestaurantApproved(
  data: VendorRestaurantApprovedPayload,
): RenderedEmail {
  const subject = `Congratulations! ${data.restaurantName} is approved on Food Rush 🎉`;
  const preheader = 'Your restaurant has been approved. Start building your menu and receiving orders.';

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#065f46;">Restaurant Approved!</h1>
      ${statusBadge('approved', 'Approved', 'success')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Great news, ${escapeHtml(data.contactName)}! <strong>${escapeHtml(data.restaurantName)}</strong> is now officially approved on Food Rush.
    </p>

    ${alertCallout(
      'You can now access your Vendor Dashboard to upload your menu categories, add food items, set operating hours, and start accepting customer orders.',
      'success',
      'Ready for Business',
    )}

    ${primaryButton('Go to Vendor Portal', data.dashboardUrl)}
  `;

  const contentText = `
Congratulations ${data.contactName}!
${data.restaurantName} is now approved on Food Rush.

Log in to set up your menu and operating hours:
${data.dashboardUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderVendorRestaurantRejected(
  data: VendorRestaurantRejectedPayload,
): RenderedEmail {
  const subject = `Update on your Food Rush application for ${data.restaurantName}`;
  const preheader = 'Important information regarding your restaurant application.';

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#991b1b;">Application Not Approved</h1>
      ${statusBadge('rejected', 'Application Declined', 'danger')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hello ${escapeHtml(data.contactName)}, thank you for applying to partner with Food Rush for <strong>${escapeHtml(data.restaurantName)}</strong>.
    </p>

    ${alertCallout(
      data.rejectionReason || 'Your application did not meet our verification criteria.',
      'danger',
      'Review Feedback',
    )}

    <p style="margin:20px 0 0;font-size:14px;color:#4b5563;">
      You may update your business documents and re-apply at any time. For questions regarding this decision, our merchant support team is ready to assist:
    </p>
    ${primaryButton('Contact Merchant Support', data.supportUrl)}
  `;

  const contentText = `
Hello ${data.contactName},

Regarding your restaurant application for ${data.restaurantName}:
Reason: ${data.rejectionReason || 'Application did not meet verification criteria.'}

You may re-apply or contact support:
${data.supportUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderVendorReviewReceived(
  data: VendorReviewReceivedPayload,
): RenderedEmail {
  const stars = '★'.repeat(Math.max(1, Math.min(5, data.rating))) + '☆'.repeat(5 - Math.max(1, Math.min(5, data.rating)));
  const subject = `New ${data.rating}-Star Review for ${data.restaurantName}`;
  const preheader = `${data.reviewerName} left a ${data.rating}-star review for your restaurant.`;

  const contentHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;" class="text-dark">New Customer Review</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;" class="text-muted">
      A customer has reviewed <strong>${escapeHtml(data.restaurantName)}</strong>:
    </p>

    <div style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;margin:20px 0;">
      <div style="font-size:24px;color:#ea580c;letter-spacing:2px;margin-bottom:8px;">${stars}</div>
      ${data.reviewTitle ? `<div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:6px;">${escapeHtml(data.reviewTitle)}</div>` : ''}
      <div style="font-size:14px;color:#4b5563;font-style:italic;line-height:1.5;">"${escapeHtml(data.comment || 'No text comment provided.')}"</div>
      <div style="margin-top:10px;font-size:12px;color:#9a3412;font-weight:600;">— ${escapeHtml(data.reviewerName)}</div>
    </div>

    ${primaryButton('View & Respond to Review', data.reviewUrl)}
  `;

  const contentText = `
New ${data.rating}-Star Review for ${data.restaurantName}!
Reviewer: ${data.reviewerName}
Rating: ${data.rating}/5
${data.reviewTitle ? `Title: ${data.reviewTitle}\n` : ''}
Comment: "${data.comment || 'No comment provided.'}"

View and reply:
${data.reviewUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderDriverApplicationReceived(
  data: DriverApplicationReceivedPayload,
): RenderedEmail {
  const subject = 'Food Rush Courier Application Received';
  const preheader = `We've received your courier registration for ${data.vehicleType}.`;

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;" class="text-dark">Courier Application Received</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hi ${escapeHtml(data.driverName)}, thanks for applying to become a delivery rider with Food Rush!
    </p>

    ${keyValList([
      { label: 'Vehicle Type', value: data.vehicleType.toUpperCase() },
      { label: 'Driving License', value: data.licenseNumber },
      { label: 'Submitted At', value: data.submittedAt },
    ])}

    ${alertCallout(
      'Our safety and operations team will review your driver license, vehicle registration, and national ID documents within 24 to 48 hours.',
      'info',
      'Verification in Progress',
    )}
  `;

  const contentText = `
Hi ${data.driverName},

We received your application to become a Food Rush courier (${data.vehicleType}).
Our safety team will verify your driving license and registration documents within 24 to 48 hours.
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderDriverApplicationApproved(
  data: DriverApplicationApprovedPayload,
): RenderedEmail {
  const subject = 'Welcome to the Fleet! Your Food Rush Rider Account is Approved 🚴';
  const preheader = 'Your courier documents are verified. You can now go online and earn.';

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#065f46;">Application Approved!</h1>
      ${statusBadge('approved', 'Approved', 'success')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Congratulations, ${escapeHtml(data.driverName)}! Your courier profile has been verified and you are now approved to deliver with Food Rush.
    </p>

    ${alertCallout(
      'Log into your rider dashboard, toggle your status to "Online", and start accepting nearby deliveries to earn competitive delivery fees and keep 100% of customer tips.',
      'success',
      'Ready to Roll',
    )}

    ${primaryButton('Open Rider Portal & Go Online', data.dashboardUrl)}
  `;

  const contentText = `
Congratulations ${data.driverName}!
Your Food Rush courier profile is approved.

Log in to go online and accept orders:
${data.dashboardUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderDriverApplicationRejected(
  data: DriverApplicationRejectedPayload,
): RenderedEmail {
  const subject = 'Update on your Food Rush Rider Application';
  const preheader = 'Important information regarding your courier document verification.';

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#991b1b;">Verification Not Approved</h1>
      ${statusBadge('rejected', 'Application Declined', 'danger')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hello ${escapeHtml(data.driverName)}, thank you for applying to drive with Food Rush.
    </p>

    ${alertCallout(
      data.rejectionReason || 'One or more required documents could not be verified.',
      'danger',
      'Reason',
    )}

    <p style="margin:20px 0 0;font-size:14px;color:#4b5563;">
      You can re-upload clearer photos of your driving license, vehicle registration, or insurance by visiting support:
    </p>
    ${primaryButton('Contact Courier Support', data.supportUrl)}
  `;

  const contentText = `
Hello ${data.driverName},

Regarding your Food Rush courier application:
Reason: ${data.rejectionReason || 'Document verification could not be completed.'}

For assistance or to re-apply:
${data.supportUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderDriverOrderAssigned(
  data: DriverOrderAssignedPayload,
): RenderedEmail {
  const subject = `New Delivery Assigned: #${data.orderNumber} (Est. ${formatTaka(data.estimatedEarnings)})`;
  const preheader = `Pick up from ${data.restaurantName} and deliver to ${data.deliveryAddress}.`;

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;" class="text-dark">New Delivery Assigned</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      You have been assigned order <strong>#${escapeHtml(data.orderNumber)}</strong>:
    </p>

    ${keyValList([
      { label: 'Restaurant', value: data.restaurantName },
      { label: 'Pickup Address', value: data.restaurantAddress },
      { label: 'Delivery Location', value: data.deliveryAddress },
      { label: 'Estimated Earnings', value: formatTaka(data.estimatedEarnings) },
    ])}

    ${primaryButton('Open Delivery Navigator', data.orderUrl)}
  `;

  const contentText = `
New Delivery Assigned: #${data.orderNumber}
Pickup: ${data.restaurantName} (${data.restaurantAddress})
Dropoff: ${data.deliveryAddress}
Estimated Earnings: ${formatTaka(data.estimatedEarnings)}

Open order:
${data.orderUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}
