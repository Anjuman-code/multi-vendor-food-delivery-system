import EmailLog, { EmailDeliveryStatus } from '../../models/EmailLog';
import EmailOutbox, { EmailOutboxDocument, OutboxStatus } from '../../models/EmailOutbox';
import { decryptAuthPayload } from './email-crypto';
import { EmailCategory, EmailEventKey, EVENT_CATEGORY_MAP } from './email.types';
import { getEmailProvider } from './providers';
import { renderEmailTemplate } from './templates';
import { getListUnsubscribeHeaders } from './unsubscribe.service';

const LEASE_DURATION_MS = 60 * 1000; // 1 minute claim lock
const BACKOFF_INTERVALS_MS = [15 * 1000, 60 * 1000, 300 * 1000]; // 15s, 1m, 5m

class EmailWorker {
  private isProcessing = false;
  private intervalTimer: NodeJS.Timeout | null = null;

  public start(pollIntervalMs = 10000): void {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(() => {
      void this.processQueue();
    }, pollIntervalMs);
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Immediate trigger: attempts to process pending jobs asynchronously.
   */
  public triggerNow(): void {
    setImmediate(() => {
      void this.processQueue();
    });
  }

  /**
   * Recovers any jobs that were abandoned mid-flight due to an unhandled crash or restart.
   */
  public async recoverStaleLeases(): Promise<number> {
    const result = await EmailOutbox.updateMany(
      {
        status: OutboxStatus.PROCESSING,
        leaseExpiresAt: { $lt: new Date() },
      },
      {
        $set: {
          status: OutboxStatus.PENDING,
          leaseExpiresAt: undefined,
          lastError: 'Recovered from expired worker lease',
        },
      },
    );
    return result.modifiedCount;
  }

  /**
   * Main worker loop: fetches and processes one pending job at a time atomically.
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      await this.recoverStaleLeases();

      let hasMore = true;
      while (hasMore) {
        const job = await this.claimNextJob();
        if (!job) {
          hasMore = false;
          break;
        }

        await this.executeJob(job);
      }
    } catch {
      // Swallowed to prevent uncaught exceptions in background loop
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Claim next eligible job using atomic findOneAndUpdate.
   * Guarantees that concurrent workers across processes never pick the same job.
   */
  public async claimNextJob(): Promise<EmailOutboxDocument | null> {
    const now = new Date();
    const leaseExpiry = new Date(now.getTime() + LEASE_DURATION_MS);

    return EmailOutbox.findOneAndUpdate(
      {
        status: OutboxStatus.PENDING,
        nextAttemptAt: { $lte: now },
      },
      {
        $set: {
          status: OutboxStatus.PROCESSING,
          leaseExpiresAt: leaseExpiry,
        },
      },
      {
        sort: { nextAttemptAt: 1 },
        new: true,
      },
    );
  }

  public async executeJob(job: EmailOutboxDocument): Promise<void> {
    const provider = getEmailProvider();
    const currentAttempt = job.attempts + 1;

    try {
      // 1. Combine regular payload with decrypted auth payload if present
      let mergedPayload = { ...job.payload };
      if (job.encryptedAuthPayload) {
        try {
          const authData = decryptAuthPayload<Record<string, unknown>>(
            job.encryptedAuthPayload,
          );
          mergedPayload = { ...mergedPayload, ...authData };
        } catch (decryptErr) {
          throw new Error(`Failed to decrypt auth secrets: ${decryptErr instanceof Error ? decryptErr.message : 'Unknown'}`);
        }
      }

      // 2. Render HTML & plain-text
      const rendered = renderEmailTemplate(
        job.eventKey as EmailEventKey,
        mergedPayload as any,
      );

      // Extract subject line from HTML <title> tag
      const titleMatch = rendered.html.match(/<title>([^<]*)<\/title>/i);
      const subject = titleMatch ? titleMatch[1].trim() : 'Notification from Food Rush';

      // 3. Attach RFC 8058 List-Unsubscribe headers for marketing & review requests
      let headers: Record<string, string> | undefined;
      const category = EVENT_CATEGORY_MAP[job.eventKey as EmailEventKey];
      if (
        job.userId &&
        (category === EmailCategory.PROMOTIONS || category === EmailCategory.REVIEW_REQUESTS)
      ) {
        headers = getListUnsubscribeHeaders(job.userId.toString(), category);
      }

      // 4. Send via provider
      const sendResult = await provider.send({
        to: job.recipient,
        subject,
        html: rendered.html,
        text: rendered.text,
        headers,
      });

      if (sendResult.success) {
        // Success: Mark sent, record delivery log, PURGE encryptedAuthPayload
        await EmailOutbox.updateOne(
          { _id: job._id },
          {
            $set: {
              status: OutboxStatus.SENT,
              attempts: currentAttempt,
              messageId: sendResult.messageId,
              sentAt: new Date(),
              leaseExpiresAt: undefined,
            },
            $unset: {
              encryptedAuthPayload: 1, // Purge sensitive credentials upon completion
            },
          },
        );

        await EmailLog.create({
          outboxId: job._id,
          eventKey: job.eventKey,
          recipient: job.recipient,
          userId: job.userId,
          status: EmailDeliveryStatus.SENT,
          provider: provider.name,
          providerMessageId: sendResult.messageId,
          attempts: currentAttempt,
          sentAt: new Date(),
        });
      } else {
        throw new Error(sendResult.error || 'Provider rejected email');
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Unknown email processing failure';

      const hasMoreAttempts = currentAttempt < job.maxAttempts;
      const backoffDelay =
        BACKOFF_INTERVALS_MS[Math.min(currentAttempt - 1, BACKOFF_INTERVALS_MS.length - 1)];
      const nextAttemptAt = new Date(Date.now() + backoffDelay);

      if (hasMoreAttempts) {
        // Re-queue with exponential backoff
        await EmailOutbox.updateOne(
          { _id: job._id },
          {
            $set: {
              status: OutboxStatus.PENDING,
              attempts: currentAttempt,
              nextAttemptAt,
              lastError: errorMsg,
              leaseExpiresAt: undefined,
            },
          },
        );
      } else {
        // Terminal failure: Mark failed, purge sensitive credentials, record in EmailLog
        await EmailOutbox.updateOne(
          { _id: job._id },
          {
            $set: {
              status: OutboxStatus.FAILED,
              attempts: currentAttempt,
              lastError: errorMsg,
              leaseExpiresAt: undefined,
            },
            $unset: {
              encryptedAuthPayload: 1, // Purge sensitive credentials on terminal failure
            },
          },
        );

        await EmailLog.create({
          outboxId: job._id,
          eventKey: job.eventKey,
          recipient: job.recipient,
          userId: job.userId,
          status: EmailDeliveryStatus.FAILED,
          provider: provider.name,
          attempts: currentAttempt,
          errorSummary: errorMsg,
        });
      }
    }
  }
}

export const emailWorker = new EmailWorker();
