import nodemailer from 'nodemailer';
import { IEmailProvider, SendOptions, SendResult } from './email-provider.interface';

export class NodemailerSmtpProvider implements IEmailProvider {
  public readonly name = 'smtp';
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER || process.env.EMAIL_ADDRESS;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
      });
    } else {
      // Fallback to Gmail service if SMTP_HOST is not set
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_ADDRESS,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }
  }

  public async send(options: SendOptions): Promise<SendResult> {
    try {
      const fromName = process.env.EMAIL_FROM_NAME || 'Food Rush';
      const fromAddress =
        process.env.EMAIL_FROM_ADDRESS ||
        process.env.EMAIL_ADDRESS ||
        'noreply@foodrush.com';

      const mailOptions: nodemailer.SendMailOptions = {
        from: options.from || `"${fromName}" <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || process.env.EMAIL_SUPPORT_ADDRESS,
        headers: options.headers,
      };

      const info = await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Unknown SMTP delivery error';
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
