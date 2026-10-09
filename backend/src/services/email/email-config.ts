/**
 * Validates email configuration environment variables at server boot.
 */
export function validateEmailConfig(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const mode = (
    process.env.EMAIL_MODE || (isProduction ? 'smtp' : 'sandbox')
  ).toLowerCase();

  // In production, refuse to start with missing or placeholder UNSUBSCRIBE_JWT_SECRET
  const unsubscribeSecret = process.env.UNSUBSCRIBE_JWT_SECRET;
  if (isProduction) {
    if (!unsubscribeSecret || unsubscribeSecret.includes('super-secret') || unsubscribeSecret.length < 32) {
      throw new Error(
        '[EMAIL CONFIG] FATAL: UNSUBSCRIBE_JWT_SECRET must be configured with a secure 32+ character key in production',
      );
    }
  }

  // In SMTP mode, ensure credentials or host are provided
  if (mode === 'smtp') {
    const hasHost = !!process.env.SMTP_HOST;
    const hasUser = !!(process.env.SMTP_USER || process.env.EMAIL_ADDRESS);
    const hasPass = !!(process.env.SMTP_PASS || process.env.EMAIL_PASSWORD);

    if (!hasUser || !hasPass) {
      throw new Error(
        '[EMAIL CONFIG] FATAL: EMAIL_MODE is set to "smtp" but SMTP credentials (user/password) are missing',
      );
    }
  }
}
