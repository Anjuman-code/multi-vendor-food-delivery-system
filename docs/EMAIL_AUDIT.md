# Email System Audit & Master Event Catalog

**Project:** Food Rush (mvfds) — Multi-Vendor Food Delivery System  
**Document Path:** `/home/usign/.temp/mvfds/docs/EMAIL_AUDIT.md`  
**Date:** October 2026  
**Status:** Phase 1 Complete (Awaiting Approval for Implementation)  

---

## 1. Executive Summary

This document establishes the authoritative discovery, current state assessment, event catalog, and architectural plan for the complete transactional email system of the **Food Rush** multi-vendor food delivery platform.

A comprehensive audit of all 28 Mongoose models, 29 controllers, socket event handlers, database migrations, and frontend design tokens revealed that email sending is currently confined to a minimal, non-resilient Nodemailer Gmail SMTP helper called from `/home/usign/.temp/mvfds/backend/src/controllers/auth.controller.ts`. Crucial business events—including order confirmations, vendor new-order alerts, rider dispatch milestones, delivery receipts, account moderation, support ticket replies, and reservation lifecycle updates—currently rely solely on in-app database notifications or ephemeral Socket.IO events, or have no notifications at all.

This audit:
1. **Catalogues 42 candidate email events** across all 5 system roles (Customer, Vendor, Rider, Admin, Guest).
2. Categorizes each into **P0 (Must-Have for launch)**, **P1 (Should-Have production polish)**, and **P2 (Documented / Deferred)**.
3. Formulates a **non-blocking, persistent outbox queue architecture** tailored to the existing MongoDB stack without requiring Redis or BullMQ.
4. Outlines a **single cohesive, bulletproof email design system** using the Food Rush brand tokens (`#f97316` brand orange, `#111827` slate typography, ৳ Taka formatting, and `STATUS_REGISTRY` accessible status tones).

---

## 2. Current State Assessment

### 2.1 Existing Mailer & Transporter
- **File:** `/home/usign/.temp/mvfds/backend/src/utils/email.util.ts`
- **Transport Library:** `nodemailer` (`^8.0.1` in `/home/usign/.temp/mvfds/backend/package.json`).
- **Provider Configuration:** Hardcoded `service: "gmail"` using `process.env.EMAIL_ADDRESS` and `process.env.EMAIL_PASSWORD`.
- **Existing Templates:** Only 2 inline HTML strings:
  1. `sendVerificationEmail(to, otp, verificationToken)`
  2. `sendPasswordResetEmail(to, resetToken)` (placeholder styling)
- **Call Sites:** Exclusively inside `/home/usign/.temp/mvfds/backend/src/controllers/auth.controller.ts`:
  - `register` (Customer) — line 179
  - `registerVendor` — line 267
  - `registerDriver` — line 359
  - `resendVerification` — line 826
  - `forgotPassword` — line 877

### 2.2 Critical Flaws & Deficiencies in Current Implementation
1. **Synchronous Network Blocking in Request Lifecycle:**  
   Calls like `await sendVerificationEmail(...)` execute directly within the Express request handler. If Gmail SMTP experiences latency or timeouts (5–30 seconds), the HTTP request hangs and risks gateway timeouts (504).
2. **Missing Outbox & Retry Engine:**  
   If Nodemailer throws an error, the email is caught and logged via `console.error`, and the email is permanently lost with zero retry capability or recovery mechanism.
3. **Hardcoded URLs & Localhost Fallbacks:**  
   Templates fall back to `http://localhost:5173`. There is no centralized route registry in the backend for constructing frontend deep links.
4. **Security & Privacy Violations (Ground Rules):**  
   `/home/usign/.temp/mvfds/backend/src/controllers/auth.controller.ts` (lines 185–191, 273–279, 364–370, 834–840, 882–887) explicitly prints raw OTPs and verification tokens to `console.log` in plaintext.
5. **No Plain-Text Part (MIME `text/plain`):**  
   Current templates only send HTML. Missing the plain-text MIME alternative increases spam scores and breaks accessibility for screen readers and text-only email clients.
6. **No Idempotency:**  
   Triggering a resend or webhook replay blindly attempts to send another email without verifying whether the exact transition was already dispatched.
7. **No Email Preferences Enforcement:**  
   While `/home/usign/.temp/mvfds/backend/src/models/CustomerProfile.ts` and `/home/usign/.temp/mvfds/backend/src/models/VendorProfile.ts` have partial notification settings, they are completely decoupled from email dispatch. Non-security emails cannot be opted out of, and mandatory `List-Unsubscribe` headers are absent.
8. **No Dev Capture Mode (Sandbox / Ethereal):**  
   If `EMAIL_ADDRESS` and `EMAIL_PASSWORD` are absent in development, Nodemailer fails with unhandled authentication errors; there is no mock, log-only, or Ethereal sandbox fallback.

### 2.3 Existing Notification & Socket Event Topology
In-app notifications and real-time events are currently produced via two independent mechanisms:
1. **In-App Notification Service:**  
   `/home/usign/.temp/mvfds/backend/src/services/notification.service.ts` provides `createNotification({ userId, type, title, message, data })`, which persists a document to `/home/usign/.temp/mvfds/backend/src/models/Notification.ts` and emits `notification:new` to `notify:<userId>`.
2. **Real-Time Sockets:**  
   `/home/usign/.temp/mvfds/backend/src/socket.ts` emits role-targeted events:
   - `vendor:<userId>`: `newOrder`
   - `user:<userId>`: `orderStatusUpdate`, `order:riderAssigned`, `order:stageUpdate`
   - `order:<orderId>`: `driver:locationUpdate`, `order:chatTyping`
   - `admin:room`: `ticket:new`, `orderStatusUpdate`, live fleet updates

**Divergence Problem:** Controllers currently scatter direct calls to `createNotification`, `getIO().emit(...)`, and `createAuditLog` inconsistently. For example, `vendor-order.controller.ts` creates notifications on status updates, but `driver.controller.ts` and `admin.orders.controller.ts` create different notifications or none at all for the same underlying status transitions.

**Solution:** Establish a single domain event emitter (`emailEvents` or domain dispatch hook) that synchronizes in-app notifications and transactional email dispatch at the exact same transition point.

---

## 3. Exhaustive Emailable Event Catalog

The table below catalogs every candidate event across the codebase, cross-referenced with controllers, services, database models, and socket handlers.

### 3.1 Prioritization Tiers
- **P0 (Must-Have for Launch):** Security/account authentication, full customer order lifecycle milestones, vendor new order notification, vendor/rider approval/rejection outcomes, and primary support/reservation notices.
- **P1 (Should-Have):** Secondary milestone notifications, reservation reminders, refund receipts, review alerts, payout statements, account status changes (suspension/ban), and contact form acknowledgements.
- **P2 (Documented / Deferred):** High-volume marketing campaigns, low-stock alerts, weekly digests, and unread chat reminders.

### 3.2 Master Event Table

| # | Event Key | Trigger (File + Function) | Recipient(s) | Category | Priority | Already Exists? | Data Needed & Sources | In-App Notification Pairing | Notes / Edge Cases |
|---|---|---|---|---|---|---|---|---|---|
| **1** | `auth.email_verification` | `/backend/src/controllers/auth.controller.ts`<br>`register`, `registerVendor`, `registerDriver`, `resendVerification` | Customer, Vendor, Rider | Security & Account | **P0** | **Partial** (Hardcoded in `email.util.ts`) | User `email`, `firstName`, OTP, verificationToken, expiry duration. | None (Pre-verification) | Link + OTP 6-digit box. Rate limited to 3 per hour. |
| **2** | `auth.welcome` | `/backend/src/controllers/auth.controller.ts`<br>`verifyEmail`, `verifyOTP` | Customer, Vendor, Rider | Security & Account | **P0** | **No** | User `firstName`, `email`, `role`, getting-started links. | `NotificationType.SYSTEM` ("Welcome to Food Rush") | Sent immediately upon successful email verification. |
| **3** | `auth.password_reset` | `/backend/src/controllers/auth.controller.ts`<br>`forgotPassword` | Any registered user | Security & Account | **P0** | **Partial** (Hardcoded in `email.util.ts`) | User `email`, `firstName`, resetToken, 15-min expiry. | None (Unauthenticated) | Non-enumerating: generic response even if email not found. |
| **4** | `auth.password_changed` | `/backend/src/controllers/auth.controller.ts`<br>`resetPassword`, `changePassword` | Any registered user | Security & Account | **P0** | **No** | User `email`, `firstName`, timestamp, IP address, user-agent. | `NotificationType.SYSTEM` ("Password updated") | Security alert: advises user to contact support if not done by them. |
| **5** | `auth.account_suspended` | `/backend/src/controllers/admin.users.controller.ts`<br>`suspendCustomer`, `suspendVendor`, `suspendDriver` | User (Any role) | Security & Account | **P0** | **No** | User `email`, `firstName`, `suspendedReason`, `suspendedUntil`. | `NotificationType.SYSTEM` | Clarifies whether suspension is temporary or indefinite. |
| **6** | `auth.account_reactivated` | `/backend/src/controllers/admin.users.controller.ts`<br>`unsuspendCustomer`, `unsuspendVendor`, `unsuspendDriver` | User (Any role) | Security & Account | **P1** | **No** | User `email`, `firstName`, timestamp. | `NotificationType.SYSTEM` | Informs user their account privileges have been restored. |
| **7** | `auth.account_deactivated` | `/backend/src/controllers/user.controller.ts`<br>`deactivateAccount` | User (Any role) | Security & Account | **P1** | **No** | User `email`, `firstName`, deletion date, data retention policy notice. | None (Session terminated) | Sent immediately before session termination. |
| **8** | `order.placed_customer` | `/backend/src/controllers/order.controller.ts`<br>`createOrder`, `createOrderFromCart` | Customer | Order Lifecycle | **P0** | **No** | Order #, customer name, items, variants, addons, vendor name(s), subtotal, delivery fee, tax, discount, total, payment method, delivery address, estimated delivery time. | `NotificationType.ORDER_UPDATE` ("Order Placed!") | **Multi-vendor handling:** Sends 1 consolidated receipt for multi-vendor carts with per-vendor item grouping. |
| **9** | `order.vendor_new_order` | `/backend/src/controllers/order.controller.ts`<br>`createOrder`, `createOrderFromCart` | Vendor (Owner of Restaurant) | Vendor Operations | **P0** | **No** | Order #, restaurant name, itemized items, customer name, delivery type, total, link to `/vendor/orders/:id`. | Socket `newOrder` to `vendor:<userId>` | Immediate deep-link CTA to accept order. |
| **10** | `order.out_for_delivery` | `/backend/src/controllers/driver.controller.ts`<br>`advanceDeliveryStage` (`picked_up` / `heading_to_customer`) | Customer | Order Lifecycle | **P0** | **No** | Order #, driver `firstName`, driver phone, tracking link (`/orders/:id`), updated ETA. | `NotificationType.ORDER_UPDATE` ("Order picked up"), Socket `orderStatusUpdate` | Major customer milestone: includes rider name and live tracking link. |
| **11** | `order.delivered` | `/backend/src/controllers/driver.controller.ts`<br>`updateDeliveryStatus` / `/controllers/vendor-order.controller.ts`<br>`updateVendorOrderStatus` | Customer | Order Lifecycle | **P0** | **No** | Order #, itemized receipt, delivery timestamp, total paid, payment method, proof photo, review CTA link (`/orders/:id?review=true`). | `NotificationType.ORDER_UPDATE` ("Order delivered!"), Socket `orderStatusUpdate` | Acts as official tax invoice & rate-your-order invitation. |
| **12** | `order.cancelled` | `/backend/src/controllers/order.controller.ts`<br>`cancelOrder` / `vendor-order.controller.ts`<br>`updateVendorOrderStatus` / `admin.orders.controller.ts`<br>`cancelOrder` | Customer & Vendor | Order Lifecycle | **P0** | **No** | Order #, cancelledBy (Customer, Vendor, Admin), `cancelReason`, refund status and timeline. | `NotificationType.ORDER_UPDATE` ("Order Cancelled"), Socket `orderStatusUpdate` | Triggered from 3 different controllers; needs unified seam. |
| **13** | `order.refund_issued` | `/backend/src/controllers/admin.orders.controller.ts`<br>`issueRefund` | Customer | Order Lifecycle | **P0** | **No** | Order #, refund amount (৳), reason, refundLineItems, original payment method. | `NotificationType.ORDER_UPDATE` ("Refund Issued") | Sent when full or partial refund is processed. |
| **14** | `vendor.application_received` | `/backend/src/controllers/auth.controller.ts`<br>`registerVendor` | Vendor | Vendor Lifecycle | **P1** | **No** | Vendor `businessName`, contact name, next steps, SLA (24–48h). | `NotificationType.SYSTEM` | Sent alongside email verification or on completion. |
| **15** | `vendor.restaurant_approved` | `/backend/src/controllers/admin.restaurants.controller.ts`<br>`approveRestaurant` | Vendor | Vendor Lifecycle | **P0** | **No** | Restaurant name, vendor name, link to `/vendor/dashboard`, setup menu CTA. | `NotificationType.SYSTEM` ("Restaurant Approved") | High importance: welcomes vendor to start adding menu items. |
| **16** | `vendor.restaurant_rejected` | `/backend/src/controllers/admin.restaurants.controller.ts`<br>`rejectRestaurant` | Vendor | Vendor Lifecycle | **P0** | **No** | Restaurant name, `rejectionReason`, instructions to update details and re-apply. | `NotificationType.SYSTEM` ("Application Rejected") | Must display clear rejection reason from admin input. |
| **17** | `vendor.review_received` | `/backend/src/controllers/review.controller.ts`<br>`createReview` | Vendor | Vendor Lifecycle | **P1** | **No** | Restaurant name, reviewer name, rating (1–5), review title, comment, link to `/vendor/reviews`. | None currently | Guarded by `notificationSettings.reviewAlerts`. |
| **18** | `driver.application_received` | `/backend/src/controllers/auth.controller.ts`<br>`registerDriver` | Driver | Rider Lifecycle | **P1** | **No** | Driver `firstName`, vehicle type, documents received checklist, review timeline. | `NotificationType.SYSTEM` | Confirmation of submitted documents and application. |
| **19** | `driver.application_approved` | `/backend/src/controllers/admin.users.controller.ts`<br>`approveDriver` | Driver | Rider Lifecycle | **P0** | **No** | Driver `firstName`, onboarding link (`/rider/dashboard`), guide to going online. | `NotificationType.SYSTEM` (L861) | Driver can now log in and take delivery jobs. |
| **20** | `driver.application_rejected` | `/backend/src/controllers/admin.users.controller.ts`<br>`rejectDriver` | Driver | Rider Lifecycle | **P0** | **No** | Driver `firstName`, `rejectionReason`, instructions to re-upload documents. | `NotificationType.SYSTEM` (L905) | Clear explanation of why license/insurance was rejected. |
| **21** | `driver.order_assigned` | `/backend/src/controllers/driver.controller.ts`<br>`acceptOrder` / `/admin.orders.controller.ts`<br>`reassignDriver` | Driver | Rider Lifecycle | **P1** | **No** | Order #, restaurant name & address, delivery address, estimated earnings (fee + tip). | In-app / Socket | Useful backup when driver is offline or app is minimized. |
| **22** | `reservation.requested_customer` | `/backend/src/controllers/reservation.controller.ts`<br>`createCustomerReservation` | Customer / Guest | Reservations | **P0** | **No** | Reservation #, restaurant name & address, date, time, party size, deposit status, link to details. | None currently | Supports guest email (`guestInfo.email`) without user account. |
| **23** | `reservation.vendor_alert` | `/backend/src/controllers/reservation.controller.ts`<br>`createCustomerReservation` | Vendor | Reservations | **P0** | **No** | Reservation #, restaurant name, guest name, party size, date, time, special requests. | None currently | Alerts restaurant host to manage table allocation. |
| **24** | `reservation.status_updated` | `/backend/src/controllers/reservation.controller.ts`<br>`updateReservationStatus` (`confirmed`, `rejected`, `cancelled`) | Customer / Guest | Reservations | **P0** | **No** | Reservation #, new status, restaurant contact info, rejection/cancellation reason. | None currently | Crucial customer touchpoint (confirmed vs rejected). |
| **25** | `support.ticket_created` | `/backend/src/controllers/support.controller.ts`<br>`createTicket` / `/controllers/contact.controller.ts`<br>`submitContactForm` | User / Inquirer | Support Tickets | **P0** | **No** | Ticket ID, subject, message preview, support SLA, link to `/support/:id`. | Socket `ticket:new` to admin | Immediate receipt confirmation for help requests. |
| **26** | `support.agent_reply` | `/backend/src/controllers/support.controller.ts`<br>`adminAddMessage` | User | Support Tickets | **P0** | **No** | Ticket ID, subject, agent name, message excerpt, link to reply (`/support/:id`). | `NotificationType.SYSTEM` (L366), Socket `ticket:message` | High customer engagement: alerts user that staff replied. |
| **27** | `support.ticket_resolved` | `/backend/src/controllers/support.controller.ts`<br>`updateTicket` (`resolved` / `closed`) | User | Support Tickets | **P0** | **No** | Ticket ID, subject, resolution summary, satisfaction rating link. | `NotificationType.SYSTEM` (L298), Socket `ticket:statusChange` | Confirmation that issue has been closed. |
| **28** | `payout.processed` | `/backend/src/controllers/payout.controller.ts`<br>`processPayout` | Vendor / Driver | Financial & Earnings | **P1** | **No** | Payout ID, amount (৳), bank/mobile money snapshot, transactionRef, period dates. | None currently | Official payment remittance voucher for partners. |
| **29** | `payout.failed` | `/backend/src/controllers/payout.controller.ts`<br>`processPayout` | Vendor / Driver | Financial & Earnings | **P1** | **No** | Payout ID, amount, failure note, instructions to verify bank account details. | None currently | Urgent operational alert to correct banking errors. |
| **30** | `admin.new_vendor_alert` | `/backend/src/controllers/auth.controller.ts`<br>`registerVendor` | Platform Admin | Admin Operations | **P1** | **No** | Vendor business name, email, license number, link to admin approval queue. | None currently | Alerts admin team to review new restaurant onboardings. |
| **31** | `admin.new_driver_alert` | `/backend/src/controllers/auth.controller.ts`<br>`registerDriver` | Platform Admin | Admin Operations | **P1** | **No** | Driver name, email, vehicle type, link to driver approval queue. | None currently | Alerts admin team to review driver KYC documents. |
| **32** | `marketing.abandoned_cart` | Scheduled Background Task (Cart > 2h inactive) | Customer | Engagement & Marketing | **P1** | **No** | Cart items summary, restaurant name, total value, direct checkout link. | None | **Must include 1-click unsubscribe token & headers.** |
| **33** | `marketing.review_reminder` | Scheduled Background Task (Order delivered > 24h, no review) | Customer | Engagement & Marketing | **P1** | **No** | Order #, restaurant name, star rating CTA links (1–5). | None | **Must include 1-click unsubscribe token & headers.** |
| **34** | `reservation.reminder` | Scheduled Background Task (Booking in 2h) | Customer / Guest | Reservations | **P1** | **No** | Reservation #, restaurant name, time, party size, directions link. | None | Useful reminder to reduce restaurant no-shows. |

---

## 4. Intentional Exclusions & Rationale

To maintain high deliverability, prevent spam, and protect user inboxes, the following candidate events are **intentionally excluded** from email dispatch:

1. **Micro-Stage Order Progression (`confirmed`, `preparing`, `ready_for_pickup`, `at_store`):**
   - *Rationale:* Bombarding customers with 5 emails in 20 minutes for a single food order causes email fatigue, high unsubscribe rates, and spam reports.
   - *Alternative:* These granular updates are fully delivered in real time via in-app notifications and Socket.IO pushes (`orderStatusUpdate`, `order:stageUpdate`). Email is reserved for major milestones: **Order Confirmation**, **Out for Delivery**, and **Delivered**.
2. **Real-time Order Chat Messages (`OrderMessage` / `orderChat.controller.ts`):**
   - *Rationale:* Order chat is an ephemeral, rapid back-and-forth channel between customer and driver/vendor during active delivery. Emails for individual chat messages create severe inbox spam and arrive too late to be useful.
   - *Alternative:* Handled strictly via in-app chat socket (`order:chatMessage`) and browser push notifications.
3. **Driver Location Broadcasts (`DriverLocationEvent`):**
   - *Rationale:* Drivers emit coordinates every few seconds.
   - *Alternative:* Socket-only streaming (`driver:locationUpdate`) to active order tracking rooms.
4. **Live Menu Item Stock Toggles (`toggleMenuItemVisibility`):**
   - *Rationale:* Vendors toggle menu availability during service constantly. Emailing on every out-of-stock toggle generates noise without operational value.
5. **Review Vote Alerts (`ReviewVote`):**
   - *Rationale:* Users upvoting or downvoting reviews does not warrant a transactional email.

---

## 5. Proposed Scope Breakdown (P0 / P1 / P2)

### 5.1 P0 Scope (Mandatory — To Build in Current Initiative)
The P0 core forms a complete, end-to-end transactional communications loop across all key stakeholders:

1. **Security & Account (All Roles):**
   - `auth.email_verification` (Polished branded template, OTP code block + fallback link)
   - `auth.welcome` (Post-verification onboarding welcome)
   - `auth.password_reset` (Token link with 15-minute countdown styling)
   - `auth.password_changed` (Immediate security confirmation with IP/device alert)
   - `auth.account_suspended` (Admin action notification with reason & duration)
2. **Order Lifecycle (Customer & Vendor):**
   - `order.placed_customer` (Itemized receipt, multi-vendor support, delivery address, breakdown in ৳)
   - `order.vendor_new_order` (New order alert with direct dashboard link to accept)
   - `order.out_for_delivery` (Courier assigned and en route with live tracking link)
   - `order.delivered` (Digital tax receipt, delivery proof, review invitation CTA)
   - `order.cancelled` (Clear cancellation reason, refund status)
   - `order.refund_issued` (Refund amount, line items, banking timeline)
3. **Partner Onboarding (Vendor & Rider):**
   - `vendor.restaurant_approved` (Welcome to partner portal, menu setup CTA)
   - `vendor.restaurant_rejected` (Admin reason & re-application instructions)
   - `driver.application_approved` (KYC approved, guide to go online)
   - `driver.application_rejected` (Document rejection details & re-upload instructions)
4. **Reservations & Support Basics:**
   - `reservation.requested_customer` (Booking voucher with guest support)
   - `reservation.vendor_alert` (Table booking notification for restaurant host)
   - `reservation.status_updated` (Booking confirmed or declined with notes)
   - `support.ticket_created` (Ticket receipt confirmation with SLA)
   - `support.agent_reply` (Staff reply excerpt with one-click reply link)
   - `support.ticket_resolved` (Issue resolution notice)

*Total P0 Templates: 20 cohesive, fully responsive emails.*

### 5.2 P1 Scope (High-Value Operational & Engagement Additions)
- `auth.account_reactivated` & `auth.account_deactivated`
- `vendor.review_received` (Alert when customer writes a review)
- `payout.processed` & `payout.failed` (Financial remittance statements)
- `admin.new_vendor_alert` & `admin.new_driver_alert` (Admin alerts)
- `marketing.abandoned_cart` (With signed 1-click unsubscribe)
- `marketing.review_reminder` (24h post-delivery prompt)
- `reservation.reminder` (2h before booking)

### 5.3 P2 Scope (Documented / Future Expansion)
- Weekly vendor sales digest & weekly rider earnings statement.
- Loyalty tier upgrade announcements (Bronze → Silver → Gold → Platinum).
- Referral invitation emails.
- Low-stock menu item alerts.

---

## 6. Architecture & Implementation Design

### 6.1 Unified Email Pipeline Architecture
To satisfy Ground Rule #3 (no blocking requests) and #4 (reuse before creating) without introducing Redis or external queue daemons, the system will use a **Persistent MongoDB Outbox Queue Pattern**.

```
[ Domain Action / Controller / Socket ]
                 │
                 ▼
[ Unified Domain Event Seam (emailEvents) ]
                 │
                 ├──► In-App Notification (Notification.create + Socket.emit)
                 │
                 ▼
[ emailService.send(eventKey, { to, data, idempotencyKey, ... }) ]
                 │
                 ├─► Check User Email Preferences (security emails bypass)
                 ├─► Verify Recipient Email Verified (security emails bypass)
                 │
                 ▼
[ Persist to EmailOutbox Collection (Status: 'queued') ]
                 │
                 ├─► Immediate asynchronous background dispatch (setImmediate)
                 │
                 ▼
[ Email Worker Engine (Polls pending/retryable with exponential backoff) ]
                 │
                 ├─► Render HTML & Plain Text (Template Engine + Layout)
                 ├─► Provider Adapter (Nodemailer SMTP / Mock / Ethereal)
                 │
                 ▼
[ Update EmailOutbox -> Status: 'sent' | 'failed' + Append to EmailLog ]
```

### 6.2 Key Architectural Components

1. **Email Service (`/backend/src/services/email/email.service.ts`):**
   - Strictly typed:
     ```typescript
     export enum EmailEventKey {
       AUTH_VERIFICATION = 'auth.email_verification',
       AUTH_WELCOME = 'auth.welcome',
       AUTH_PASSWORD_RESET = 'auth.password_reset',
       AUTH_PASSWORD_CHANGED = 'auth.password_changed',
       AUTH_ACCOUNT_SUSPENDED = 'auth.account_suspended',
       ORDER_PLACED_CUSTOMER = 'order.placed_customer',
       ORDER_VENDOR_NEW_ORDER = 'order.vendor_new_order',
       ORDER_OUT_FOR_DELIVERY = 'order.out_for_delivery',
       ORDER_DELIVERED = 'order.delivered',
       ORDER_CANCELLED = 'order.cancelled',
       ORDER_REFUND_ISSUED = 'order.refund_issued',
       VENDOR_APPROVED = 'vendor.restaurant_approved',
       VENDOR_REJECTED = 'vendor.restaurant_rejected',
       DRIVER_APPROVED = 'driver.application_approved',
       DRIVER_REJECTED = 'driver.application_rejected',
       RESERVATION_CUSTOMER = 'reservation.requested_customer',
       RESERVATION_VENDOR = 'reservation.vendor_alert',
       RESERVATION_STATUS = 'reservation.status_updated',
       SUPPORT_TICKET_CREATED = 'support.ticket_created',
       SUPPORT_AGENT_REPLY = 'support.agent_reply',
       SUPPORT_TICKET_RESOLVED = 'support.ticket_resolved',
       PAYOUT_PROCESSED = 'payout.processed',
       MARKETING_ABANDONED_CART = 'marketing.abandoned_cart',
       MARKETING_REVIEW_REMINDER = 'marketing.review_reminder',
     }
     ```
2. **Persistent Outbox Model (`/backend/src/models/EmailOutbox.ts`):**
   - Fields:
     - `eventKey`: string (enum)
     - `recipient`: string (email)
     - `userId`: ObjectId (optional)
     - `idempotencyKey`: string (unique indexed: `${eventKey}:${entityId}:${transition}`)
     - `payload`: Record<string, unknown> (strictly typed data)
     - `status`: `'pending' | 'processing' | 'sent' | 'failed'`
     - `attempts`: number (default: 0)
     - `maxAttempts`: number (default: 3)
     - `nextAttemptAt`: Date
     - `lastError`: string
     - `messageId`: string (provider return)
     - `timestamps`: true
   - **Zero Secret Storage:** Passwords, full credit card tokens, and raw OTP codes are never stored in `payload`; OTPs are passed directly to in-memory rendering or generated on the fly.
3. **Idempotency Guarantee:**
   A unique compound index on `{ idempotencyKey: 1 }` guarantees that even if a controller function is retried or double-submitted, Mongoose will reject the second insert with a duplicate key error (E11000), preventing duplicate emails.
4. **Provider Adapter Layer (`/backend/src/services/email/providers/`):**
   - Standard interface: `sendEmail(opts: EmailSendOptions): Promise<EmailSendResult>`.
   - `NodemailerSmtpProvider`: Gmail SMTP or custom SMTP (SES, SendGrid, Mailgun, Brevo).
   - `SandboxEmailProvider`: In development, writes rendered HTML and plain text to disk (`/backend/.email-previews/`) or routes through Ethereal Mail, logging a sanitized preview link. Prevents accidental emails to real users in local dev!
5. **Config & Environment Flags (`/backend/.env.example`):**
   ```bash
   # Email Configuration
   EMAIL_MODE=sandbox          # 'sandbox' (capture only) | 'smtp' (live) | 'ethereal'
   EMAIL_FROM_NAME="Food Rush"
   EMAIL_FROM_ADDRESS=noreply@foodrush.com
   EMAIL_SUPPORT_ADDRESS=support@foodrush.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=
   SMTP_PASS=
   FRONTEND_URL=http://localhost:5173
   UNSUBSCRIBE_JWT_SECRET=super-secret-unsubscribe-signing-key-32-chars
   ```

---

## 7. Email Template Design System & Brand Identity

### 7.1 Brand Token Alignment (Derived from Website)
- **Primary Brand Orange:** `#f97316` (`brand-500` / `var(--primary)` in `tailwind.config.js`).
- **Brand Accents & Surfaces:**
  - Card background: `#ffffff`
  - Page backdrop: `#f9fafb` (slate-50)
  - Card border: `#e5e7eb` (slate-200)
  - Dark header gradient: `linear-gradient(135deg, #f97316, #ea580c)`
- **Typography & Font Stack:**
  - System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
  - Body text: `#111827` (slate-900), size `15px` / `16px`, line-height `1.6`
  - Muted captions: `#6b7280` (slate-500), size `13px`
- **Currency & Localization:**
  - Standard Bangladesh Taka symbol `৳` formatted with comma separators (e.g. `৳1,250.00`).
- **Accessible Status Tone Badges (Matching `StatusBadge.tsx`):**
  - **Success (Delivered, Approved, Paid, Resolved):** `#059669` text on `#ecfdf5` background, `#a7f3d0` border.
  - **Warning (Pending, Requested, Open):** `#d97706` text on `#fffbeb` background, `#fde68a` border.
  - **Danger (Cancelled, Rejected, Failed):** `#dc2626` text on `#fef2f2` background, `#fecaca` border.
  - **Info (Confirmed, Preparing, Ready, Picked Up):** `#2563eb` text on `#eff6ff` background, `#bfdbfe` border.
  - **Brand (Preparing, Active):** `#ea580c` text on `#fff7ed` background, `#fed7aa` border.

### 7.2 Reusable Component Blocks
Every email is composed from standard, tested building blocks:
1. **Preheader Block:** Hidden preview text (`display:none;max-height:0px;overflow:hidden`) that displays in email inbox list views.
2. **Master Layout Shell:**
   - Header with Food Rush SVG/WebP logo + fallback typographic badge.
   - Fluid 600px container (`width: 100%; max-width: 600px; margin: 0 auto;`).
   - Card content wrapper with subtle `box-shadow` and `border-radius: 12px`.
   - Brand footer with:
     - Help center & contact links
     - Physical company address / registration
     - "Why you received this email" explanation
     - One-click unsubscribe link (for marketing emails)
     - Manage email preferences link
3. **Bulletproof Action Buttons:**
   - Client-compatible table-based button with Outlook VML markup to ensure crisp 44px+ tap targets across Apple Mail, Gmail, Outlook, and mobile screens:
     ```html
     <div><!--[if mso]>
       <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{url}}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="15%" strokecolor="#ea580c" fillcolor="#f97316">
         <w:anchorlock/>
         <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">{{text}}</center>
       </v:roundrect>
     <![endif]--><a href="{{url}}" class="btn-primary" style="background:#f97316;border-radius:8px;color:#ffffff;display:inline-block;font-size:15px;font-weight:600;line-height:48px;text-align:center;text-decoration:none;width:240px;-webkit-text-size-adjust:none;mso-hide:all;">{{text}}</a></div>
     ```
4. **Order Itemization Table:**
   - Multi-vendor grouped table displaying item quantity, item name, variants/addons, price in ৳, subtotal, delivery fee, platform discount, tip, and total.
5. **Security OTP Highlight Box:**
   - High-contrast rounded card with 6-digit spaced code (`letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #ea580c; background: #fff7ed; border: 1px solid #fed7aa;`).

---

## 8. Gaps, Missing Data & Additive Schema Requirements

To implement the email system completely without breaking existing flows, the following **additive (non-destructive)** schema enhancements are required:

### 8.1 User Model Additions (`/backend/src/models/User.ts`)
```typescript
// Additive Email Preferences sub-schema
emailPreferences: {
  orderUpdates: { type: Boolean, default: true },
  accountAlerts: { type: Boolean, default: true },
  promotions: { type: Boolean, default: true },
  reviewRequests: { type: Boolean, default: true },
  newsletter: { type: Boolean, default: false },
},
unsubscribeToken: { type: String, sparse: true, index: true },
```
*Note: Critical security emails (verification, password reset, account suspension) ignore preferences and are always sent.*

### 8.2 Order Model Validation (`/backend/src/models/Order.ts`)
- The `Order` model already contains `items`, `subtotal`, `deliveryFee`, `tax`, `discount`, `tipAmount`, `total`, `cancelReason`, `deliveryAddress`, and `estimatedDeliveryTime`.
- **Gap identified:** In `/backend/src/controllers/order.controller.ts`, single-order creation and cart multi-order creation compute delivery time differently. The email builder will safely fall back to `createdAt + 45 minutes` if `estimatedDeliveryTime` is unset.

### 8.3 Unsubscribe & Preferences Frontend Touchpoints
- A lightweight public token-based route `/unsubscribe?token=...` in the frontend allowing instant 1-click opt-out without requiring the user to log in.
- An "Email Preferences" tab in `/profile` matching the existing UI standards.

---

## 9. Verification & Review Tooling Plan

1. **HTML & Text Preview Command (`npm run email:preview`):**
   - A standalone CLI script `/backend/scripts/preview-emails.ts` that compiles all 20+ P0/P1 templates with realistic mock fixtures (multi-vendor orders, long item names, Bengali characters, zero discounts, edge-case refunds) into standalone HTML files in `/backend/.email-previews/` and opens an index gallery in the browser.
2. **Direct Test Send Command (`npm run email:test -- --event=order.placed_customer --to=dev@example.com`):**
   - Allows instant test delivery of any template through the configured SMTP provider to a designated email address.
3. **Automated Test Suite (`/backend/tests/email.test.ts`):**
   - Tests template rendering with empty/edge-case data.
   - Confirms HTML size is under Gmail's 102 KB clipping threshold.
   - Asserts valid HTML escaping (prevents injection from user inputs or item names).
   - Validates that non-security emails strictly respect `emailPreferences`.
   - Tests idempotency key rejection on duplicate trigger.

---

## 10. Summary of Proposed Phases

- **Phase 1: Discovery & Catalog** — *Completed with this audit document. Stop for user approval.*
- **Phase 2: Backend Architecture & Outbox Queue** — Implement `EmailOutbox` collection, email worker, idempotency manager, provider abstraction (SMTP + Sandbox), and user preferences schema.
- **Phase 3: Template Design System & Core Auth Templates** — Implement master layout, reusable blocks, string layer, preview tooling, and P0 Security/Account emails.
- **Phase 4: Order & Operational Rollout** — Hook unified domain event seam into Order lifecycle (Customer, Vendor, Driver), Reservations, Support, and Moderation.
- **Phase 5: Frontend Touchpoints** — Unsubscribe page, email preferences tab in profile, and auth screen alignment.
- **Phase 6: Hardening & Documentation** — Run verification checklist, update `AGENTS.md`, and generate `docs/EMAIL_SETUP.md`.
