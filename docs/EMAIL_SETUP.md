# Transactional Email System — Production Setup & DNS Deliverability Guide

This document describes how to configure, authenticate, and monitor transactional and marketing email delivery for the **Food Rush (`mvfds`)** platform.

---

## 1. Overview & Architecture

The Food Rush email pipeline implements a **reliable, non-blocking Outbox pattern** backed by MongoDB and an asynchronous background worker (`email-worker.ts`).

- **Architecture:** `Domain Event Trigger -> emailService.send() -> EmailOutbox Collection (MongoDB) -> Background Lease Worker -> Email Provider (SMTP / Sandbox)`
- **Key Features:**
  - **Zero request blocking:** Controller endpoints return immediately (typically < 5ms email overhead).
  - **Idempotency:** Every send has a unique `idempotencyKey` preventing duplicate dispatch upon retries, network hiccups, or concurrent worker leases.
  - **Security & Privacy:** Sensitive auth secrets (OTPs, raw tokens) are encrypted with AES-256-GCM before entering the outbox and purged immediately upon delivery.
  - **RFC 8058 Compliance:** Automated `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers on marketing and review emails.
  - **Zero Third-Party Queue Dependency:** No Redis or BullMQ required; atomic MongoDB `findOneAndUpdate` leases provide safe concurrent execution across multiple cluster instances.
  - **Gmail 102 KB Clipping Safe:** All 34 mobile-responsive templates are budgeted between 7.1 KB and 14 KB.

---

## 2. Environment Variables Reference

Configure these environment variables in `backend/.env`:

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `EMAIL_MODE` | Yes | `sandbox` | `sandbox` writes HTML/text files to `.email-previews/` (no internet send). Set to `smtp` in staging/production. |
| `EMAIL_FROM_NAME` | Yes | `Food Rush` | Sender display name. |
| `EMAIL_FROM_ADDRESS` | Yes | `no-reply@foodrush.com` | Authenticated sending address matching your verified DNS domain. |
| `EMAIL_REPLY_TO` | No | `support@foodrush.com` | Customer reply address. |
| `SMTP_HOST` | If `smtp` | - | SMTP server hostname (e.g. `smtp.mailgun.org`, `smtp.sendgrid.net`, `email-smtp.us-east-1.amazonaws.com`). |
| `SMTP_PORT` | If `smtp` | `587` | Port (`587` for STARTTLS, `465` for SSL/TLS, `2525` for Mailtrap). |
| `SMTP_SECURE` | If `smtp` | `false` | `true` if port is 465, `false` if using STARTTLS (port 587). |
| `SMTP_USER` | If `smtp` | - | SMTP authentication username / API key identifier. |
| `SMTP_PASS` | If `smtp` | - | SMTP authentication password / API key secret. |
| `UNSUBSCRIBE_JWT_SECRET` | Yes | Dev fallback | Secret key (min 32 chars) used for HMAC-signing stateless unsubscribe tokens. |
| `EMAIL_PAYLOAD_SECRET` | Yes | Dev fallback | AES-256-GCM key used for encrypting outbox auth tokens at rest. |
| `FRONTEND_URL` | Yes | `http://localhost:5173` | Canonical public URL used in email CTAs, tracking links, and unsubscribe portals. |
| `ADMIN_EMAIL` | No | `admin@foodrush.com` | Default recipient for admin alert notifications (new vendor/driver registrations). |

---

## 3. DNS Authentication (Deliverability Setup)

To guarantee that transactional emails land in customer inboxes rather than spam folders, set up the following DNS records with your domain registrar (e.g. Cloudflare, Route53, Namecheap) for your sending domain (e.g. `foodrush.com` or `mail.foodrush.com`):

### 3.1 SPF (Sender Policy Framework)
Authorizes your email provider to send on behalf of your domain.
- **Type:** `TXT`
- **Name:** `@` (or subdomain like `mail`)
- **Value (example for Mailgun):**
  ```text
  v=spf1 include:mailgun.org ~all
  ```
- **Value (example for Amazon SES):**
  ```text
  v=spf1 include:amazonses.com ~all
  ```

### 3.2 DKIM (DomainKeys Identified Mail)
Cryptographically verifies that the email was sent by Food Rush and not modified in transit.
- **Type:** `TXT` or `CNAME` (as provided by your provider)
- **Name:** `k1._domainkey.foodrush.com`
- **Value:** Public key string provided by your email provider.

### 3.3 DMARC (Domain-based Message Authentication, Reporting & Conformance)
Specifies how receiving servers handle unaligned emails and sends deliverability reports.
- **Type:** `TXT`
- **Name:** `_dmarc.foodrush.com`
- **Initial Monitoring Value:**
  ```text
  v=DMARC1; p=none; rua=mailto:dmarc-reports@foodrush.com; pct=100;
  ```
- **Production Enforcement Value (after validating alignment):**
  ```text
  v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@foodrush.com; aspf=r; adkim=r;
  ```

### 3.4 MX (Mail Exchange)
If using a dedicated subdomain like `mail.foodrush.com`:
- **Type:** `MX`
- **Name:** `mail`
- **Priority:** `10`
- **Value:** Provider MX endpoint (e.g. `mxa.mailgun.org`, `mxb.mailgun.org`).

---

## 4. Provider Instructions

### Option A: Mailgun (Recommended for High Deliverability)
1. Add custom domain `mail.foodrush.com` in Mailgun dashboard.
2. Add the verified SPF, DKIM, and MX records to your DNS provider.
3. In `backend/.env`:
   ```env
   EMAIL_MODE=smtp
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=postmaster@mail.foodrush.com
   SMTP_PASS=your-mailgun-smtp-password
   EMAIL_FROM_ADDRESS=no-reply@mail.foodrush.com
   ```

### Option B: Amazon SES
1. Verify domain `foodrush.com` in AWS SES console.
2. Add Easy DKIM CNAME records to DNS.
3. Create SMTP credentials in AWS SES.
4. In `backend/.env`:
   ```env
   EMAIL_MODE=smtp
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-ses-smtp-username
   SMTP_PASS=your-ses-smtp-password
   ```

### Option C: Mailtrap / Local Sandbox (Development & QA)
1. In development, leave `EMAIL_MODE=sandbox`.
2. The worker automatically outputs rich HTML and text files into `backend/.email-previews/`.
3. Preview emails in your browser by running:
   ```bash
   npm run email:preview
   ```

---

## 5. Operations, CLI Scripts & Verification

The repository includes scripts inside `backend/package.json`:

### 5.1 Generate Email Previews
Generates rendered HTML and plain text files for all 34 transactional email scenarios and creates an interactive visual gallery at `backend/.email-previews/index.html`:
```bash
npm run email:preview
```

### 5.2 Run Email Test Suite
Executes the unit and integration test suite (covering crypto, RFC 8058 headers, rate limiting, and size budgets):
```bash
npm run test:email
```

### 5.3 Send a Test Transactional Email
Sends a single test email directly through the configured provider or sandbox:
```bash
npm run email:test -- --to=test@example.com --event=order.placed_customer
```

---

## 6. Retention, Data Privacy & GDPR/Compliance

1. **TTL Index:** The `EmailOutbox` collection automatically purges records after `expiresAt` (24h for auth emails with sensitive credentials, 7 days for standard transactional orders).
2. **Payload Scrubbing:** Upon terminal state (`sent` or `discarded`), raw payload fields and encrypted auth tokens are erased from `EmailOutbox`.
3. **Audit Log:** High-level metadata is logged to `EmailLog` without storing plain-text passwords, OTPs, or customer financial account numbers.
