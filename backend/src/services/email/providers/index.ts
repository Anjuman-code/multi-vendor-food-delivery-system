import { IEmailProvider } from './email-provider.interface';
import { NodemailerSmtpProvider } from './nodemailer-smtp.provider';
import { SandboxEmailProvider } from './sandbox-email.provider';

export * from './email-provider.interface';
export * from './nodemailer-smtp.provider';
export * from './sandbox-email.provider';

let cachedProvider: IEmailProvider | null = null;

export function getEmailProvider(): IEmailProvider {
  if (cachedProvider) return cachedProvider;

  const mode = (process.env.EMAIL_MODE || (process.env.NODE_ENV === 'production' ? 'smtp' : 'sandbox')).toLowerCase();

  if (mode === 'smtp') {
    cachedProvider = new NodemailerSmtpProvider();
  } else {
    // Default to sandbox mode in development
    cachedProvider = new SandboxEmailProvider();
  }

  return cachedProvider;
}

/** Set custom provider (useful for testing) */
export function setEmailProvider(provider: IEmailProvider | null): void {
  cachedProvider = provider;
}
