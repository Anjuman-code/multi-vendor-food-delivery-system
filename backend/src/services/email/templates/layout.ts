import { escapeHtml } from './utils';

export interface EmailLayoutOptions {
  subject: string;
  preheader: string;
  contentHtml: string;
  contentText: string;
  recipientEmail?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
  isMarketing?: boolean;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderEmailLayout(options: EmailLayoutOptions): RenderedEmail {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const supportUrl = `${frontendUrl}/support`;
  const helpUrl = `${frontendUrl}/help`;
  const preferencesUrl = options.preferencesUrl || `${frontendUrl}/profile`;
  const year = new Date().getFullYear();

  // ── Plain-Text Version ──────────────────────────────────────────
  const textFooterLines = [
    '------------------------------------------------------------',
    'Food Rush — Delicious food, delivered fast',
    `Need help? Visit our Support Center: ${supportUrl}`,
    options.isMarketing && options.unsubscribeUrl
      ? `To unsubscribe from promotional emails: ${options.unsubscribeUrl}`
      : `Manage email preferences: ${preferencesUrl}`,
    `© ${year} Food Rush, Sylhet, Bangladesh. All rights reserved.`,
  ];

  const plainText = `${options.contentText.trim()}\n\n${textFooterLines.join('\n')}`;

  // ── HTML Version ────────────────────────────────────────────────
  const escapedSubject = escapeHtml(options.subject);
  const escapedPreheader = escapeHtml(options.preheader);

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapedSubject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'SolaimanLipi', 'Bangla'; }
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #111827 !important; }
      .email-card { background-color: #1f2937 !important; border-color: #374151 !important; color: #f9fafb !important; }
      .text-dark { color: #f9fafb !important; }
      .text-muted { color: #9ca3af !important; }
      .table-border { border-color: #374151 !important; }
      .bg-subtle { background-color: #111827 !important; }
    }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; padding: 12px !important; }
      .card-body { padding: 20px 16px !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
      .mobile-center { text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;" class="email-bg">
  <!-- Preheader text (preview in inbox) -->
  <div style="display:none;font-size:1px;color:#f9fafb;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapedPreheader}
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9fafb;" class="email-bg">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <!-- Container: 600px Max Fluid -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;" class="email-container">
          
          <!-- Header: Brand Logo Banner -->
          <tr>
            <td align="center" style="padding:0 0 20px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);border-radius:12px;box-shadow:0 4px 12px rgba(249,115,22,0.25);">
                <tr>
                  <td align="center" style="padding:28px 24px;">
                    <a href="${frontendUrl}" target="_blank" style="text-decoration:none;">
                      <!-- Food Rush Logo -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="font-size:30px;line-height:30px;vertical-align:middle;padding-right:10px;">⚡</td>
                          <td style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;vertical-align:middle;">Food Rush</td>
                        </tr>
                      </table>
                      <div style="margin:4px 0 0;font-size:13px;font-weight:500;color:#ffedd5;letter-spacing:0.5px;">DELICIOUS FOOD, DELIVERED FAST</div>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 1px 3px 0 rgba(0,0,0,0.06);overflow:hidden;" class="email-card">
                <tr>
                  <td style="padding:32px 28px;" class="card-body">
                    ${options.contentHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 16px;text-align:center;">
              <p style="margin:0 0 10px;font-size:13px;color:#6b7280;line-height:1.5;" class="text-muted">
                Need assistance? Visit our <a href="${helpUrl}" target="_blank" style="color:#f97316;text-decoration:none;font-weight:500;">Help Center</a> or contact <a href="${supportUrl}" target="_blank" style="color:#f97316;text-decoration:none;font-weight:500;">Customer Support</a>.
              </p>
              ${
                options.isMarketing && options.unsubscribeUrl
                  ? `<p style="margin:0 0 10px;font-size:12px;color:#9ca3af;line-height:1.4;">
                      You received this email because you opted into promotional updates. 
                      <a href="${options.unsubscribeUrl}" target="_blank" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a> or 
                      <a href="${preferencesUrl}" target="_blank" style="color:#6b7280;text-decoration:underline;">manage email preferences</a>.
                    </p>`
                  : `<p style="margin:0 0 10px;font-size:12px;color:#9ca3af;line-height:1.4;">
                      This is an automated transactional message regarding your Food Rush account or order.
                      <a href="${preferencesUrl}" target="_blank" style="color:#6b7280;text-decoration:underline;">Email settings</a>.
                    </p>`
              }
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${year} Food Rush. Sylhet, Bangladesh. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: options.subject, html, text: plainText };
}
