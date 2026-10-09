interface RateLimitEntry {
  count: number;
  firstTimestamp: number;
  lastFingerprint?: string;
  lastFingerprintTime?: number;
}

const recipientLimits = new Map<string, RateLimitEntry>();
const ipLimits = new Map<string, RateLimitEntry>();

// Daily window: 24 hours
const DAY_MS = 24 * 60 * 60 * 1000;
// IP hourly window: 1 hour
const HOUR_MS = 60 * 60 * 1000;
// Deduplication window: 60 seconds
const DEDUP_MS = 60 * 1000;

const MAX_GUEST_PER_DAY = 10;
const MAX_GUEST_PER_IP_HOUR = 5;

/**
 * Check if sending to a guest / unauthenticated recipient is allowed.
 * Prevents email flooding, address harvesting abuse, and mail bombing.
 */
export function checkGuestEmailAllowed(
  recipientEmail: string,
  ip?: string,
  fingerprint?: string,
): { allowed: boolean; reason?: string } {
  const normalizedEmail = recipientEmail.toLowerCase().trim();
  const now = Date.now();

  // 1. Recipient daily limit
  const recipientEntry = recipientLimits.get(normalizedEmail);
  if (recipientEntry) {
    if (now - recipientEntry.firstTimestamp > DAY_MS) {
      // Reset window
      recipientLimits.set(normalizedEmail, {
        count: 1,
        firstTimestamp: now,
        lastFingerprint: fingerprint,
        lastFingerprintTime: now,
      });
    } else {
      // Deduplicate near-identical submissions
      if (
        fingerprint &&
        recipientEntry.lastFingerprint === fingerprint &&
        recipientEntry.lastFingerprintTime &&
        now - recipientEntry.lastFingerprintTime < DEDUP_MS
      ) {
        return {
          allowed: false,
          reason: 'Duplicate submission detected within cooldown window',
        };
      }

      if (recipientEntry.count >= MAX_GUEST_PER_DAY) {
        return {
          allowed: false,
          reason: 'Daily email cap reached for this recipient address',
        };
      }

      recipientEntry.count += 1;
      recipientEntry.lastFingerprint = fingerprint;
      recipientEntry.lastFingerprintTime = now;
    }
  } else {
    recipientLimits.set(normalizedEmail, {
      count: 1,
      firstTimestamp: now,
      lastFingerprint: fingerprint,
      lastFingerprintTime: now,
    });
  }

  // 2. IP rate limit
  if (ip) {
    const ipEntry = ipLimits.get(ip);
    if (ipEntry) {
      if (now - ipEntry.firstTimestamp > HOUR_MS) {
        ipLimits.set(ip, { count: 1, firstTimestamp: now });
      } else {
        if (ipEntry.count >= MAX_GUEST_PER_IP_HOUR) {
          return {
            allowed: false,
            reason: 'Too many requests from this IP address',
          };
        }
        ipEntry.count += 1;
      }
    } else {
      ipLimits.set(ip, { count: 1, firstTimestamp: now });
    }
  }

  return { allowed: true };
}

/** Clear tracking state (useful for automated tests) */
export function resetEmailRateLimits(): void {
  recipientLimits.clear;
  recipientLimits.clear();
  ipLimits.clear();
}
