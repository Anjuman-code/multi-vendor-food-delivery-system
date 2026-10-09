import { Types } from 'mongoose';
import EmailOutbox, { OutboxStatus } from '../../models/EmailOutbox';
import User from '../../models/User';
import { encryptAuthPayload } from './email-crypto';
import { checkGuestEmailAllowed } from './email-rate-limiter';
import { emailWorker } from './email-worker';
import {
  EmailCategory,
  EmailEventKey,
  EVENT_CATEGORY_MAP,
  EventPayloadMap,
  SendEmailInput,
} from './email.types';

export class EmailService {
  /**
   * Primary entry point for sending a transactional email.
   *
   * Asynchronous, non-blocking, idempotent, and preference-aware.
   * Never throws into the calling controller or request lifecycle.
   */
  public async send<K extends EmailEventKey>(
    eventKey: K,
    input: SendEmailInput<K>,
  ): Promise<{ enqueued: boolean; reason?: string }> {
    try {
      const recipient = input.to.toLowerCase().trim();
      const category = EVENT_CATEGORY_MAP[eventKey] || EmailCategory.ACCOUNT_ALERTS;

      // 1. Resolve recipient user (if userId provided or look up by email)
      let user = null;
      if (input.userId) {
        user = await User.findById(input.userId);
      } else if (category !== EmailCategory.SECURITY) {
        user = await User.findByEmail(recipient);
      }

      // 2. Check Email Preferences (Security events bypass preferences)
      if (category !== EmailCategory.SECURITY && user) {
        const prefs = user.emailPreferences;

        if (category === EmailCategory.ORDER_UPDATES && prefs?.orderUpdates === false) {
          return { enqueued: false, reason: 'User opted out of order updates' };
        }
        if (category === EmailCategory.ACCOUNT_ALERTS && prefs?.accountAlerts === false) {
          return { enqueued: false, reason: 'User opted out of account alerts' };
        }
        if (category === EmailCategory.REVIEW_REQUESTS && prefs?.reviewRequests === false) {
          return { enqueued: false, reason: 'User opted out of review reminders' };
        }
        if (category === EmailCategory.PROMOTIONS && (!prefs || prefs.promotions !== true)) {
          return { enqueued: false, reason: 'User has not opted into promotional emails' };
        }
        if (category === EmailCategory.NEWSLETTER && (!prefs || prefs.newsletter !== true)) {
          return { enqueued: false, reason: 'User has not opted into newsletters' };
        }

        // 3. Non-security emails to registered account holders only send if email is verified
        if (!user.isEmailVerified) {
          return { enqueued: false, reason: 'Recipient email is not verified' };
        }
      }

      // 4. Abuse protection for guest / unauthenticated emails
      if (!user && category !== EmailCategory.SECURITY) {
        const rateCheck = checkGuestEmailAllowed(recipient);
        if (!rateCheck.allowed) {
          return { enqueued: false, reason: rateCheck.reason };
        }
      }

      // 5. Handle auth secrets encryption (for verification OTP / reset token)
      let encryptedAuthPayload: string | undefined;
      let expiresAt: Date;

      if (input.authSecrets) {
        encryptedAuthPayload = encryptAuthPayload({
          otp: input.authSecrets.otp,
          rawToken: input.authSecrets.rawToken,
        });
        expiresAt =
          input.authSecrets.expiresAt ||
          new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours TTL
      } else {
        // Standard retention: 7 days TTL
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }

      // 6. Enqueue into EmailOutbox
      try {
        await EmailOutbox.create({
          eventKey,
          recipient,
          userId: user?._id || (input.userId ? new Types.ObjectId(input.userId) : undefined),
          idempotencyKey: input.idempotencyKey,
          payload: input.data as unknown as Record<string, unknown>,
          encryptedAuthPayload,
          status: OutboxStatus.PENDING,
          expiresAt,
          nextAttemptAt: new Date(),
        });
      } catch (insertErr: unknown) {
        // E11000 duplicate key error -> email was already queued/sent for this exact event & transition
        if (
          insertErr &&
          typeof insertErr === 'object' &&
          'code' in insertErr &&
          (insertErr as { code: number }).code === 11000
        ) {
          return { enqueued: false, reason: 'Duplicate event already dispatched (idempotent)' };
        }
        throw insertErr;
      }

      // 7. Trigger immediate non-blocking worker execution
      emailWorker.triggerNow();

      return { enqueued: true };
    } catch {
      // Email failure must NEVER fail the business action
      return { enqueued: false, reason: 'Enqueue failure swallowed' };
    }
  }
}

export const emailService = new EmailService();
