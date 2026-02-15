/**
 * Email utility – sends transactional emails via Nodemailer (Gmail SMTP).
 */
import nodemailer from "nodemailer";

// ── Transporter (lazy – created on first use so env vars are loaded) ──

let _transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  return _transporter;
};

// ── Helpers ────────────────────────────────────────────────────

const getFrom = () =>
  `"FoodDash" <${process.env.EMAIL_ADDRESS || "noreply@fooddash.com"}>`;

/**
 * Send an email verification message containing both an OTP and a
 * clickable verification link so the user can verify via either method.
 */
export const sendVerificationEmail = async (
  to: string,
  otp: string,
  verificationToken: string,
): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: getFrom(),
    to,
    subject: "Verify your email – FoodDash",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Email Verification</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f9fafb;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#dc2626);padding:32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">FoodDash</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Delicious food, delivered fast</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;">
              <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">Verify your email address</h2>
              <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
                Thanks for signing up! Use the OTP below or click the button to verify your email and get started.
              </p>

              <!-- OTP box -->
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#9a3412;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your verification code</p>
                <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:8px;color:#ea580c;">${otp}</p>
              </div>

              <p style="text-align:center;color:#6b7280;font-size:14px;margin-bottom:24px;">— or —</p>

              <!-- CTA button -->
              <div style="text-align:center;margin-bottom:24px;">
                <a href="${verificationLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#f97316,#dc2626);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 40px;border-radius:8px;">
                  Verify Email
                </a>
              </div>

              <p style="color:#6b7280;font-size:13px;line-height:1.5;">
                This code expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f3f4f6;padding:20px 24px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} FoodDash. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await getTransporter().sendMail(mailOptions);
};

/**
 * Send an email with the password-reset link and/or token.
 * (Placeholder – can be expanded later.)
 */
export const sendPasswordResetEmail = async (
  to: string,
  resetToken: string,
): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: getFrom(),
    to,
    subject: "Reset your password – FoodDash",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8" /></head>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#dc2626);padding:32px 24px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">FoodDash</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              <h2 style="margin:0 0 12px;color:#111827;font-size:22px;">Reset your password</h2>
              <p style="color:#4b5563;font-size:15px;line-height:1.6;">Click the button below to create a new password. This link is valid for 15 minutes.</p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${resetLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#f97316,#dc2626);color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 40px;border-radius:8px;">Reset Password</a>
              </div>
              <p style="color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f3f4f6;padding:20px 24px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} FoodDash. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await getTransporter().sendMail(mailOptions);
};
