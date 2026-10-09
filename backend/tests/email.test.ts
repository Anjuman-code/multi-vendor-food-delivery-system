/**
 * Comprehensive Automated Test Suite for Transactional Email System
 * Tests:
 * 1. Template Rendering & Integrity (Subject, HTML, Plaintext, Brand Tokens, ৳ format)
 * 2. Injection Defense (XSS & HTML entity escaping)
 * 3. Gmail 102 KB Clipping Limit Protection
 * 4. AES-256-GCM Outbox Secret Encryption & Decryption
 * 5. HMAC Unsubscribe Token Generation & RFC 8058 Verification
 * 6. Rate Limiting Protection
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { EmailEventKey, EmailCategory } from '../src/services/email/email.types';
import { renderEmailTemplate } from '../src/services/email/templates';
import { encryptAuthPayload, decryptAuthPayload } from '../src/services/email/email-crypto';
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  getListUnsubscribeHeaders,
} from '../src/services/email/unsubscribe.service';
import { checkGuestEmailAllowed } from '../src/services/email/email-rate-limiter';

// ── Test 1: Crypto AES-256-GCM ──────────────────────────────────
test('emailCrypto: encrypts and decrypts auth secrets reversibly with authentication tag', () => {
  const secrets = {
    otp: '948201',
    rawToken: 'tok_verify_8f293b190a4219b',
  };

  const encrypted = encryptAuthPayload(secrets);
  assert.ok(encrypted, 'Ciphertext should be produced');
  assert.ok(encrypted.includes(':'), 'Payload must include IV and AuthTag delimiters');

  const decrypted = decryptAuthPayload<typeof secrets>(encrypted);
  assert.deepEqual(decrypted, secrets, 'Decrypted secrets must match original payload exactly');
});

test('emailCrypto: throws on invalid cipher string format', () => {
  assert.throws(() => decryptAuthPayload('invalid_format'), /Invalid encrypted payload format/);
});

// ── Test 2: Unsubscribe HMAC Service ────────────────────────────
test('unsubscribeService: generates and verifies stateless HMAC tokens', () => {
  const userId = '6520f92b1a03019248b201a4';
  const category = EmailCategory.PROMOTIONS;

  const token = generateUnsubscribeToken(userId, category);
  assert.ok(token, 'Token must be generated');

  const parsed = verifyUnsubscribeToken(token);
  assert.ok(parsed, 'Token verification must succeed');
  assert.equal(parsed?.userId, userId);
  assert.equal(parsed?.category, category);

  // Tampered token check
  const tamperedToken = token.slice(0, -4) + 'abcd';
  assert.equal(verifyUnsubscribeToken(tamperedToken), null);
});

test('unsubscribeService: builds valid RFC 8058 List-Unsubscribe headers', () => {
  const userId = '6520f92b1a03019248b201a4';
  const headers = getListUnsubscribeHeaders(userId, EmailCategory.PROMOTIONS);

  assert.ok(headers['List-Unsubscribe'], 'Must include List-Unsubscribe header');
  assert.ok(headers['List-Unsubscribe-Post'], 'Must include List-Unsubscribe-Post header');
  assert.equal(headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.ok(headers['List-Unsubscribe'].includes('/unsubscribe?token='));
});

// ── Test 3: Guest Rate Limiter ──────────────────────────────────
test('emailRateLimiter: enforces limits on guest recipients', () => {
  const guestEmail = `guest_${Date.now()}@example.com`;

  // First 10 attempts should be allowed
  for (let i = 0; i < 10; i++) {
    const check = checkGuestEmailAllowed(guestEmail);
    assert.equal(check.allowed, true, `Attempt ${i + 1} should be allowed`);
  }

  // 11th attempt within daily window must be rejected
  const blocked = checkGuestEmailAllowed(guestEmail);
  assert.equal(blocked.allowed, false, '11th attempt must be rate-limited');
  assert.ok(blocked.reason?.includes('Daily email cap'), 'Reason must mention daily email cap');
});

// ── Test 4: HTML Injection Defense ──────────────────────────────
test('Template Security: escapes HTML entities in user-supplied strings', () => {
  const maliciousInput = '<script>alert("xss")</script><img src="x" onerror="alert(1)">';

  const rendered = renderEmailTemplate(EmailEventKey.ORDER_CANCELLED, {
    orderNumber: 'ORD-SEC-01',
    orderId: '6520f92b',
    restaurantName: maliciousInput,
    cancelledBy: 'customer',
    cancelReason: maliciousInput,
    refundStatus: 'pending',
    supportUrl: 'http://localhost:5173/support',
  });

  assert.ok(!rendered.html.includes('<script>'), 'Must NOT contain unescaped script tag');
  assert.ok(!rendered.html.includes('<img'), 'Must NOT contain unescaped img tag');
  assert.ok(rendered.html.includes('&lt;script&gt;'), 'Must contain escaped HTML script entities');
  assert.ok(rendered.html.includes('&lt;img'), 'Must contain escaped HTML img entities');
});

// ── Test 5: Template Rendering, Brand Tokens & Size Budget ──────
const ALL_EVENT_FIXTURES: Array<{ key: EmailEventKey; payload: any }> = [
  {
    key: EmailEventKey.AUTH_VERIFICATION,
    payload: {
      firstName: 'Rahim',
      email: 'rahim@example.com',
      otp: '782910',
      verificationToken: 'token123',
      verificationUrl: 'http://localhost:5173/verify?token=token123',
      expiresInHours: 24,
    },
  },
  {
    key: EmailEventKey.AUTH_WELCOME,
    payload: {
      firstName: 'Rahim',
      email: 'rahim@example.com',
      role: 'customer',
      dashboardUrl: 'http://localhost:5173/',
    },
  },
  {
    key: EmailEventKey.AUTH_PASSWORD_RESET,
    payload: {
      firstName: 'Rahim',
      email: 'rahim@example.com',
      resetToken: 'reset123',
      resetUrl: 'http://localhost:5173/reset?token=reset123',
      expiresInMinutes: 15,
      requestIp: '103.25.244.12',
    },
  },
  {
    key: EmailEventKey.AUTH_PASSWORD_CHANGED,
    payload: {
      firstName: 'Rahim',
      email: 'rahim@example.com',
      changedAt: 'Wed, Oct 09 2026',
      clientIp: '103.25.244.12',
    },
  },
  {
    key: EmailEventKey.ORDER_PLACED_CUSTOMER,
    payload: {
      orderNumber: 'ORD-991A',
      customerName: 'Rahim Chowdhury',
      customerEmail: 'rahim@example.com',
      deliveryAddress: {
        street: 'House 12, Road 4',
        area: 'Gulshan',
        district: 'Dhaka',
      },
      paymentMethod: 'cash_on_delivery',
      paymentStatus: 'pending',
      subtotal: 750,
      deliveryFee: 60,
      tax: 37,
      discount: 50,
      tipAmount: 20,
      total: 817,
      estimatedDeliveryTime: '08:30 PM',
      vendors: [
        {
          restaurantId: 'rest_01',
          restaurantName: 'Sultan\'s Dine',
          orderNumber: 'ORD-991A',
          items: [
            {
              name: 'Kacchi Biryani',
              quantity: 2,
              price: 375,
              itemTotal: 750,
            },
          ],
          subtotal: 750,
          deliveryFee: 60,
          tax: 37,
        },
      ],
      trackingUrl: 'http://localhost:5173/orders/ORD-991A',
    },
  },
  {
    key: EmailEventKey.ORDER_DELIVERED,
    payload: {
      orderNumber: 'ORD-991A',
      orderId: 'ord_01',
      restaurantName: 'Sultan\'s Dine',
      deliveredAt: 'Oct 09, 08:30 PM',
      totalPaid: 817,
      paymentMethod: 'cash_on_delivery',
      reviewUrl: 'http://localhost:5173/orders/ord_01?review=true',
      receiptUrl: 'http://localhost:5173/orders/ord_01',
      items: [
        {
          name: 'Kacchi Biryani',
          quantity: 2,
          price: 375,
          itemTotal: 750,
        },
      ],
    },
  },
  {
    key: EmailEventKey.RESERVATION_REQUESTED_CUSTOMER,
    payload: {
      reservationNumber: 'RES-1029',
      restaurantName: 'Copper Chimney',
      restaurantAddress: 'Gulshan 2, Dhaka',
      guestName: 'Rahim Chowdhury',
      partySize: 4,
      date: '2026-10-15',
      time: '07:30 PM',
      status: 'confirmed',
      detailsUrl: 'http://localhost:5173/reservations/RES-1029',
    },
  },
  {
    key: EmailEventKey.SUPPORT_TICKET_CREATED,
    payload: {
      ticketId: 'TCK-001',
      subject: 'Order inquiry',
      userName: 'Rahim',
      messagePreview: 'Where is my order?',
      priority: 'medium',
      ticketUrl: 'http://localhost:5173/support/TCK-001',
    },
  },
  {
    key: EmailEventKey.PAYOUT_PROCESSED,
    payload: {
      payoutId: 'PAY-100',
      recipientName: 'Sultan\'s Dine',
      amount: 15400,
      method: 'bank_transfer',
      bankName: 'City Bank',
      accountNumberMasked: '••••1234',
      transactionRef: 'TRX-100',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-07',
    },
  },
];

for (const item of ALL_EVENT_FIXTURES) {
  test(`Template Rendering: ${item.key}`, () => {
    const rendered = renderEmailTemplate(item.key, item.payload);

    // Subject assertion
    assert.ok(rendered.subject, `Subject must not be empty for ${item.key}`);
    assert.ok(typeof rendered.subject === 'string');

    // HTML assertions
    assert.ok(rendered.html, `HTML must not be empty for ${item.key}`);
    assert.ok(rendered.html.includes('Food Rush'), `Must include brand name for ${item.key}`);
    assert.ok(rendered.html.includes('Sylhet, Bangladesh'), `Must include physical address for ${item.key}`);
    assert.ok(rendered.html.includes('#ea580c'), `Must include primary brand color (#ea580c) for ${item.key}`);

    // Plain text assertions
    assert.ok(rendered.text, `Text must not be empty for ${item.key}`);
    assert.ok(rendered.text.includes('Food Rush'), `Text version must include brand name for ${item.key}`);

    // No placeholder assertions
    assert.ok(!rendered.html.includes('Lorem ipsum'), `No lorem ipsum permitted in ${item.key}`);
    assert.ok(!rendered.html.includes('TODO'), `No TODO markers permitted in ${item.key}`);
    assert.ok(!rendered.html.includes('[object Object]'), `No unstringified objects in ${item.key}`);

    // Size limit check (Gmail clipping limit: 102 KB)
    const byteSize = Buffer.byteLength(rendered.html, 'utf8');
    assert.ok(
      byteSize <= 102 * 1024,
      `Email ${item.key} size (${(byteSize / 1024).toFixed(1)} KB) exceeds 102 KB clipping threshold`,
    );
  });
}
