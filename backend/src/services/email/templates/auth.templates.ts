import {
  AuthAccountDeactivatedPayload,
  AuthAccountReactivatedPayload,
  AuthAccountSuspendedPayload,
  AuthPasswordChangedPayload,
  AuthPasswordResetPayload,
  AuthVerificationPayload,
  AuthWelcomePayload,
} from '../email.types';
import { alertCallout, otpBox, primaryButton } from './components';
import { renderEmailLayout, RenderedEmail } from './layout';
import { escapeHtml } from './utils';

export function renderAuthVerification(
  data: AuthVerificationPayload,
): RenderedEmail {
  const name = escapeHtml(data.firstName || 'there');
  const subject = `${data.otp} is your Food Rush verification code`;
  const preheader = `Use code ${data.otp} to verify your Food Rush account.`;

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;" class="text-dark">Verify your email address</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hi ${name}, thanks for signing up with Food Rush! Please enter the 6-digit code below to confirm your email and activate your account:
    </p>

    ${otpBox(data.otp)}

    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Or simply verify by clicking the button below:
    </p>

    ${primaryButton('Verify Email Address', data.verificationUrl)}

    ${alertCallout(
      `This code will expire in ${data.expiresInHours} hours. If you did not create a Food Rush account, you can safely ignore this email.`,
      'brand',
      'Security Note',
    )}
  `;

  const contentText = `
Hi ${data.firstName || 'there'},

Thanks for signing up with Food Rush! Please verify your email address to get started.

YOUR VERIFICATION CODE: ${data.otp}

Or verify using this link:
${data.verificationUrl}

This code will expire in ${data.expiresInHours} hours. If you did not request this, you can safely ignore this email.
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
    recipientEmail: data.email,
  });
}

export function renderAuthWelcome(data: AuthWelcomePayload): RenderedEmail {
  const name = escapeHtml(data.firstName || 'there');
  const subject = 'Welcome to Food Rush! 🍔';
  const preheader = 'Your email has been verified. Discover delicious restaurants near you.';

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;" class="text-dark">Welcome to Food Rush, ${name}!</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Your email has been successfully verified. You're now ready to explore top-rated restaurants, track fast deliveries, and discover exclusive meals in your area.
    </p>

    <div style="background-color:#f9fafb;border-radius:8px;padding:20px;margin:24px 0;" class="bg-subtle">
      <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:12px;" class="text-dark">Quick Tips to Get Started:</div>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#4b5563;line-height:1.7;" class="text-muted">
        <li>Save your delivery address for instant checkout.</li>
        <li>Browse trending cuisines and top-rated dishes.</li>
        <li>Track your rider in real time from kitchen to doorstep.</li>
      </ul>
    </div>

    ${primaryButton('Start Exploring Food', data.dashboardUrl)}
  `;

  const contentText = `
Welcome to Food Rush, ${data.firstName || 'there'}!

Your email has been successfully verified. You are now ready to order from the best local restaurants.

Start exploring:
${data.dashboardUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
    recipientEmail: data.email,
  });
}

export function renderAuthPasswordReset(
  data: AuthPasswordResetPayload,
): RenderedEmail {
  const name = escapeHtml(data.firstName || 'there');
  const subject = 'Reset your Food Rush password';
  const preheader = `Password reset request received. This link expires in ${data.expiresInMinutes} minutes.`;

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;" class="text-dark">Password Reset Request</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hi ${name}, we received a request to reset the password for your Food Rush account. Click the button below to choose a new password:
    </p>

    ${primaryButton('Reset My Password', data.resetUrl)}

    ${alertCallout(
      `This password reset link will expire in ${data.expiresInMinutes} minutes. If you did not make this request, please ignore this email or reach out to our security team. Your account password remains unchanged.`,
      'warning',
      'Important Security Information',
    )}
  `;

  const contentText = `
Hi ${data.firstName || 'there'},

We received a request to reset your Food Rush password. Click the link below to choose a new password:

${data.resetUrl}

This link is valid for ${data.expiresInMinutes} minutes. If you did not request this, you can safely ignore this email.
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
    recipientEmail: data.email,
  });
}

export function renderAuthPasswordChanged(
  data: AuthPasswordChangedPayload,
): RenderedEmail {
  const name = escapeHtml(data.firstName || 'there');
  const subject = 'Security Alert: Your Food Rush password was changed';
  const preheader = 'Your account password was recently updated. Contact support if this was not you.';

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;" class="text-dark">Password Changed Successfully</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hi ${name}, this email confirms that the password for your Food Rush account was changed on <strong>${escapeHtml(data.changedAt)}</strong>${data.clientIp ? ` from IP address <code>${escapeHtml(data.clientIp)}</code>` : ''}.
    </p>

    ${alertCallout(
      'If you made this change, no further action is required. If you did NOT change your password, your account may be compromised. Please contact Food Rush Support immediately to secure your account.',
      'danger',
      'Did not authorize this change?',
    )}
  `;

  const contentText = `
Hi ${data.firstName || 'there'},

This email confirms that your Food Rush password was updated on ${data.changedAt}.

If you made this change, you can safely ignore this message.
If you did NOT change your password, please contact Food Rush Support immediately as your account may be compromised.
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
    recipientEmail: data.email,
  });
}

export function renderAuthAccountSuspended(
  data: AuthAccountSuspendedPayload,
): RenderedEmail {
  const name = escapeHtml(data.firstName || 'there');
  const isBanned = data.isBanned;
  const title = isBanned ? 'Account Terminated' : 'Account Suspended';
  const subject = `Food Rush account status update: ${title}`;
  const preheader = `Your Food Rush account has been ${isBanned ? 'permanently closed' : 'temporarily suspended'}.`;

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#991b1b;">${title}</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hello ${name}, your Food Rush account privileges have been ${isBanned ? 'permanently deactivated' : 'temporarily suspended'}.
    </p>

    ${alertCallout(
      data.reason
        ? `Reason: ${escapeHtml(data.reason)}`
        : 'Action taken in accordance with Food Rush platform terms and safety policies.',
      'danger',
      'Moderation Notice',
    )}

    ${
      data.suspendedUntil
        ? `<p style="font-size:14px;color:#4b5563;">This suspension is active until: <strong>${escapeHtml(data.suspendedUntil)}</strong>.</p>`
        : ''
    }

    <p style="margin:20px 0 0;font-size:14px;color:#4b5563;">
      If you believe this was done in error, you may file an appeal through our support portal:
    </p>
    ${primaryButton('Contact Appeals & Support', data.supportUrl)}
  `;

  const contentText = `
Hello ${data.firstName || 'there'},

Your Food Rush account has been ${isBanned ? 'permanently closed' : 'temporarily suspended'}.

Reason: ${data.reason || 'Violation of platform terms and safety policies.'}
${data.suspendedUntil ? `Suspended until: ${data.suspendedUntil}\n` : ''}
To appeal this decision, visit:
${data.supportUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
    recipientEmail: data.email,
  });
}

export function renderAuthAccountReactivated(
  data: AuthAccountReactivatedPayload,
): RenderedEmail {
  const name = escapeHtml(data.firstName || 'there');
  const subject = 'Your Food Rush account has been reactivated';
  const preheader = 'Your account privileges have been restored. You can now log back in.';

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#065f46;">Account Access Restored</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hi ${name}, we are pleased to inform you that your Food Rush account has been reviewed and full access has been restored.
    </p>

    ${alertCallout(
      'You can now sign in, browse restaurants, manage your orders, and use all platform features.',
      'success',
      'Account Active',
    )}

    ${primaryButton('Sign In to Food Rush', data.loginUrl)}
  `;

  const contentText = `
Hi ${data.firstName || 'there'},

Your Food Rush account privileges have been restored. You can now sign in and continue using Food Rush:

${data.loginUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
    recipientEmail: data.email,
  });
}

export function renderAuthAccountDeactivated(
  data: AuthAccountDeactivatedPayload,
): RenderedEmail {
  const name = escapeHtml(data.firstName || 'there');
  const subject = 'Your Food Rush account has been closed';
  const preheader = 'Confirmation of account deactivation and personal data retention notice.';

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;" class="text-dark">Account Deactivated</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hello ${name}, this email confirms that your Food Rush account was deactivated on <strong>${escapeHtml(data.deactivatedAt)}</strong> per your request.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;" class="text-muted">
      Your active sessions have been terminated. In compliance with applicable regulations, order and transaction records are retained for auditing purposes in accordance with our Privacy Policy.
    </p>
    <p style="margin:0;font-size:14px;color:#6b7280;">
      We're sorry to see you go! If you ever decide to return, you are always welcome to create a new account.
    </p>
  `;

  const contentText = `
Hello ${data.firstName || 'there'},

This email confirms that your Food Rush account was deactivated on ${data.deactivatedAt} per your request.

We are sorry to see you go and hope to welcome you back in the future.
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
    recipientEmail: data.email,
  });
}
