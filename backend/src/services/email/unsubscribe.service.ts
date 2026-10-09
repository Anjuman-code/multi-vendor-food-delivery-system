import crypto from 'crypto';
import User from '../../models/User';
import { EmailCategory } from './email.types';

function getUnsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'UNSUBSCRIBE_JWT_SECRET must be configured in production environment',
      );
    }
    return 'dev-unsubscribe-secret-mvfds-at-least-32-chars-long';
  }
  if (
    process.env.NODE_ENV === 'production' &&
    secret.includes('super-secret')
  ) {
    throw new Error(
      'UNSUBSCRIBE_JWT_SECRET must not use placeholder values in production',
    );
  }
  return secret;
}

export interface UnsubscribeTokenPayload {
  userId: string;
  category: EmailCategory;
  exp: number; // timestamp in seconds
}

/**
 * Generate a stateless HMAC-signed token carrying userId and category.
 * Format: base64url(payload).signature
 */
export function generateUnsubscribeToken(
  userId: string,
  category: EmailCategory,
  expiresInDays = 90,
): string {
  const secret = getUnsubscribeSecret();
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
  const payload: UnsubscribeTokenPayload = { userId, category, exp };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify HMAC-signed unsubscribe token.
 */
export function verifyUnsubscribeToken(
  token: string,
): UnsubscribeTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const secret = getUnsubscribeSecret();

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadB64)
      .digest('base64url');

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      )
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as UnsubscribeTokenPayload;

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Build RFC 8058 List-Unsubscribe and List-Unsubscribe-Post headers.
 */
export function getListUnsubscribeHeaders(
  userId: string,
  category: EmailCategory,
): Record<string, string> {
  const token = generateUnsubscribeToken(userId, category);
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${token}`;

  return {
    'List-Unsubscribe': `<${unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

/**
 * Process unsubscribe request by updating User.emailPreferences.
 */
export async function executeUnsubscribe(
  token: string,
): Promise<{ success: boolean; message: string; category?: EmailCategory; email?: string }> {
  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return { success: false, message: 'Invalid or expired unsubscribe link' };
  }

  const { userId, category } = payload;
  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: 'User account not found' };
  }

  if (!user.emailPreferences) {
    user.emailPreferences = {
      orderUpdates: true,
      accountAlerts: true,
      reviewRequests: true,
      promotions: false,
      newsletter: false,
    };
  }

  // Update specific category
  if (category === EmailCategory.PROMOTIONS) {
    user.emailPreferences.promotions = false;
  } else if (category === EmailCategory.REVIEW_REQUESTS) {
    user.emailPreferences.reviewRequests = false;
  } else if (category === EmailCategory.NEWSLETTER) {
    user.emailPreferences.newsletter = false;
  } else if (category === EmailCategory.ORDER_UPDATES) {
    user.emailPreferences.orderUpdates = false;
  } else if (category === EmailCategory.ACCOUNT_ALERTS) {
    user.emailPreferences.accountAlerts = false;
  }

  await user.save({ validateBeforeSave: false });

  return {
    success: true,
    message: `Successfully unsubscribed from ${category.replace('_', ' ')} emails`,
    category,
    email: user.email,
  };
}
