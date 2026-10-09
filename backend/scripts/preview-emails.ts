/**
 * Email Template Preview Generator
 * Renders all transactional email templates with realistic mock fixtures
 * into backend/.email-previews/ and creates an interactive preview index.html.
 */
import * as fs from 'fs';
import * as path from 'path';
import { EmailEventKey } from '../src/services/email/email.types';
import { renderEmailTemplate } from '../src/services/email/templates';

const PREVIEW_DIR = path.resolve(__dirname, '../.email-previews');

const FIXTURES: Record<EmailEventKey, any> = {
  // ── Authentication & Security ──
  [EmailEventKey.AUTH_VERIFICATION]: {
    firstName: 'Rahim',
    email: 'rahim@example.com',
    otp: '482910',
    verificationToken: 'tok_verify_8f293b190a',
    verificationUrl: 'http://localhost:5173/verify-email?token=tok_verify_8f293b190a',
    expiresInHours: 24,
  },
  [EmailEventKey.AUTH_WELCOME]: {
    firstName: 'Rahim',
    email: 'rahim@example.com',
    role: 'customer',
    dashboardUrl: 'http://localhost:5173/',
  },
  [EmailEventKey.AUTH_PASSWORD_RESET]: {
    firstName: 'Rahim',
    email: 'rahim@example.com',
    resetToken: 'tok_reset_923bc991a',
    resetUrl: 'http://localhost:5173/reset-password?token=tok_reset_923bc991a',
    expiresInMinutes: 15,
    requestIp: '103.25.244.12',
  },
  [EmailEventKey.AUTH_PASSWORD_CHANGED]: {
    firstName: 'Rahim',
    email: 'rahim@example.com',
    changedAt: new Date().toUTCString(),
    clientIp: '103.25.244.12',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  },
  [EmailEventKey.AUTH_ACCOUNT_SUSPENDED]: {
    firstName: 'Rahim',
    email: 'rahim@example.com',
    reason: 'Multiple policy violations regarding fraudulent cancellation requests.',
    suspendedUntil: new Date(Date.now() + 7 * 86400000).toLocaleDateString(),
    isBanned: false,
    supportUrl: 'http://localhost:5173/support',
  },
  [EmailEventKey.AUTH_ACCOUNT_REACTIVATED]: {
    firstName: 'Rahim',
    email: 'rahim@example.com',
    reactivatedAt: new Date().toUTCString(),
    loginUrl: 'http://localhost:5173/login',
  },
  [EmailEventKey.AUTH_ACCOUNT_DEACTIVATED]: {
    firstName: 'Rahim',
    email: 'rahim@example.com',
    deactivatedAt: new Date().toUTCString(),
  },

  // ── Orders ──
  [EmailEventKey.ORDER_PLACED_CUSTOMER]: {
    orderNumber: 'ORD-98B2C4',
    groupOrderId: 'GRP-71A02E',
    customerName: 'Rahim Chowdhury',
    customerEmail: 'rahim@example.com',
    deliveryAddress: {
      street: 'House 42, Road 11, Block D',
      apartment: 'Apt 4B',
      area: 'Banani',
      district: 'Dhaka',
    },
    paymentMethod: 'cash_on_delivery',
    paymentStatus: 'pending',
    subtotal: 940,
    deliveryFee: 60,
    tax: 47,
    discount: 50,
    tipAmount: 20,
    total: 1017,
    estimatedDeliveryTime: '08:45 PM',
    vendors: [
      {
        restaurantId: '6520f92b1a03',
        restaurantName: 'Sultan\'s Dine',
        orderNumber: 'ORD-98B2C4',
        items: [
          {
            name: 'Kacchi Biryani (Basmati)',
            quantity: 2,
            price: 380,
            itemTotal: 760,
            variants: [{ name: 'Half Plate', price: 0 }],
            addons: [{ name: 'Extra Borhani', price: 60 }],
            specialInstructions: 'Please give potato with both plates.',
          },
        ],
        subtotal: 820,
        deliveryFee: 30,
        tax: 41,
      },
      {
        restaurantId: '6520f92b1a04',
        restaurantName: 'Takeout Burgers',
        orderNumber: 'ORD-98B2C5',
        items: [
          {
            name: 'Beef Gourmet Burger',
            quantity: 1,
            price: 120,
            itemTotal: 120,
          },
        ],
        subtotal: 120,
        deliveryFee: 30,
        tax: 6,
      },
    ],
    trackingUrl: 'http://localhost:5173/orders/ORD-98B2C4',
  },
  [EmailEventKey.ORDER_VENDOR_NEW_ORDER]: {
    orderNumber: 'ORD-98B2C4',
    orderId: '6520f92b1a030192',
    restaurantName: 'Sultan\'s Dine',
    customerName: 'Rahim Chowdhury',
    customerPhone: '+880 1712-345678',
    deliveryAddress: {
      street: 'House 42, Road 11, Block D',
      area: 'Banani',
      district: 'Dhaka',
    },
    items: [
      {
        name: 'Kacchi Biryani (Basmati)',
        quantity: 2,
        price: 380,
        itemTotal: 760,
        variants: [{ name: 'Half Plate', price: 0 }],
        addons: [{ name: 'Extra Borhani', price: 60 }],
      },
    ],
    subtotal: 820,
    total: 891,
    paymentMethod: 'cash_on_delivery',
    specialInstructions: 'Please give potato with both plates.',
    dashboardUrl: 'http://localhost:5173/vendor/orders/6520f92b1a030192',
  },
  [EmailEventKey.ORDER_OUT_FOR_DELIVERY]: {
    orderNumber: 'ORD-98B2C4',
    orderId: '6520f92b1a030192',
    restaurantName: 'Sultan\'s Dine',
    driverName: 'Tanvir Hossain',
    driverPhone: '+880 1812-987654',
    deliveryAddress: {
      street: 'House 42, Road 11, Block D',
      area: 'Banani',
    },
    estimatedDeliveryTime: '08:45 PM',
    trackingUrl: 'http://localhost:5173/orders/6520f92b1a030192',
  },
  [EmailEventKey.ORDER_DELIVERED]: {
    orderNumber: 'ORD-98B2C4',
    orderId: '6520f92b1a030192',
    restaurantName: 'Sultan\'s Dine',
    deliveredAt: 'Oct 09, 08:42 PM',
    totalPaid: 891,
    paymentMethod: 'cash_on_delivery',
    deliveryProofUrl: 'http://localhost:5173/uploads/proofs/delivery-98b2c4.jpg',
    reviewUrl: 'http://localhost:5173/orders/6520f92b1a030192?review=true',
    receiptUrl: 'http://localhost:5173/orders/6520f92b1a030192',
    items: [
      {
        name: 'Kacchi Biryani (Basmati)',
        quantity: 2,
        price: 380,
        itemTotal: 760,
      },
      {
        name: 'Extra Borhani',
        quantity: 1,
        price: 60,
        itemTotal: 60,
      },
    ],
  },
  [EmailEventKey.ORDER_CANCELLED]: {
    orderNumber: 'ORD-98B2C4',
    orderId: '6520f92b1a030192',
    restaurantName: 'Sultan\'s Dine',
    cancelledBy: 'vendor',
    cancelReason: 'Restaurant ran out of Kacchi Basmati Biryani for the evening.',
    refundStatus: 'refunded',
    supportUrl: 'http://localhost:5173/support',
  },
  [EmailEventKey.ORDER_REFUND_ISSUED]: {
    orderNumber: 'ORD-98B2C4',
    orderId: '6520f92b1a030192',
    refundAmount: 891,
    reason: 'Order cancelled due to out-of-stock items.',
    paymentMethod: 'bkash',
    lineItems: [
      {
        itemName: 'Kacchi Biryani (Basmati)',
        quantity: 2,
        refundAmount: 760,
      },
      {
        itemName: 'Delivery & Service',
        quantity: 1,
        refundAmount: 131,
      },
    ],
  },

  // ── Partners ──
  [EmailEventKey.VENDOR_APPLICATION_RECEIVED]: {
    businessName: 'Spicy Grill House Ltd',
    contactName: 'Kamal Ahmed',
    email: 'kamal@spicygrill.com',
    submittedAt: new Date().toLocaleDateString(),
  },
  [EmailEventKey.VENDOR_RESTAURANT_APPROVED]: {
    businessName: 'Spicy Grill House Ltd',
    restaurantName: 'Spicy Grill (Dhanmondi Branch)',
    contactName: 'Kamal Ahmed',
    dashboardUrl: 'http://localhost:5173/vendor',
    menuSetupUrl: 'http://localhost:5173/vendor/menu',
  },
  [EmailEventKey.VENDOR_RESTAURANT_REJECTED]: {
    businessName: 'Spicy Grill House Ltd',
    restaurantName: 'Spicy Grill (Dhanmondi Branch)',
    contactName: 'Kamal Ahmed',
    rejectionReason: 'Trade license document was blurry and expired on June 2025. Please provide an updated trade license.',
    supportUrl: 'http://localhost:5173/vendor/support',
  },
  [EmailEventKey.VENDOR_REVIEW_RECEIVED]: {
    restaurantName: 'Sultan\'s Dine',
    reviewerName: 'Sadia Islam',
    rating: 5,
    reviewTitle: 'Exceptional Kacchi as always!',
    comment: 'Meat was tender, spices were balanced, and delivery was 10 minutes earlier than expected.',
    reviewUrl: 'http://localhost:5173/vendor/reviews',
  },
  [EmailEventKey.DRIVER_APPLICATION_RECEIVED]: {
    driverName: 'Rafiqul Islam',
    vehicleType: 'Motorcycle',
    licenseNumber: 'DH-DL-829104',
    submittedAt: new Date().toLocaleDateString(),
  },
  [EmailEventKey.DRIVER_APPLICATION_APPROVED]: {
    driverName: 'Rafiqul Islam',
    dashboardUrl: 'http://localhost:5173/rider',
  },
  [EmailEventKey.DRIVER_APPLICATION_REJECTED]: {
    driverName: 'Rafiqul Islam',
    rejectionReason: 'Driving license copy submitted was expired. Please renew your license and resubmit.',
    supportUrl: 'http://localhost:5173/rider/support',
  },
  [EmailEventKey.DRIVER_ORDER_ASSIGNED]: {
    orderNumber: 'ORD-98B2C4',
    restaurantName: 'Sultan\'s Dine (Banani Branch)',
    restaurantAddress: 'Road 11, Banani, Dhaka',
    deliveryAddress: 'House 42, Road 11, Block D, Banani',
    estimatedEarnings: 60,
    orderUrl: 'http://localhost:5173/rider/orders/6520f92b1a030192',
  },

  // ── Reservations ──
  [EmailEventKey.RESERVATION_REQUESTED_CUSTOMER]: {
    reservationNumber: 'RES-49A821',
    restaurantName: 'Copper Chimney',
    restaurantAddress: 'Gulshan 2, Dhaka',
    guestName: 'Rahim Chowdhury',
    partySize: 4,
    date: '2026-10-15',
    time: '07:30 PM',
    specialRequests: 'Quiet booth table for family anniversary dinner.',
    status: 'pending',
    detailsUrl: 'http://localhost:5173/reservations/RES-49A821',
  },
  [EmailEventKey.RESERVATION_VENDOR_ALERT]: {
    reservationNumber: 'RES-49A821',
    restaurantName: 'Copper Chimney',
    guestName: 'Rahim Chowdhury',
    guestPhone: '+880 1712-345678',
    guestEmail: 'rahim@example.com',
    partySize: 4,
    date: '2026-10-15',
    time: '07:30 PM',
    specialRequests: 'Quiet booth table for family anniversary dinner.',
    vendorReservationsUrl: 'http://localhost:5173/vendor/reservations',
  },
  [EmailEventKey.RESERVATION_STATUS_UPDATED]: {
    reservationNumber: 'RES-49A821',
    restaurantName: 'Copper Chimney',
    guestName: 'Rahim Chowdhury',
    status: 'confirmed',
    reason: 'Table assigned in VIP family section.',
    date: '2026-10-15',
    time: '07:30 PM',
    partySize: 4,
    detailsUrl: 'http://localhost:5173/reservations/RES-49A821',
  },
  [EmailEventKey.RESERVATION_REMINDER]: {
    reservationNumber: 'RES-49A821',
    restaurantName: 'Copper Chimney',
    restaurantAddress: 'Plot 12, Gulshan Avenue, Dhaka',
    date: 'Today, Oct 15',
    time: '07:30 PM',
    partySize: 4,
    detailsUrl: 'http://localhost:5173/reservations/RES-49A821',
  },

  // ── Support ──
  [EmailEventKey.SUPPORT_TICKET_CREATED]: {
    ticketId: 'TCK-8291A',
    subject: 'Missing beverage in order ORD-98B2C4',
    userName: 'Rahim Chowdhury',
    messagePreview: 'We ordered 2 Borhanis but only received 1 in the delivery bag. Please investigate and refund.',
    priority: 'high',
    ticketUrl: 'http://localhost:5173/support/TCK-8291A',
  },
  [EmailEventKey.SUPPORT_AGENT_REPLY]: {
    ticketId: 'TCK-8291A',
    subject: 'Missing beverage in order ORD-98B2C4',
    userName: 'Rahim',
    agentName: 'Nusrat (Food Rush Care)',
    replyMessage: 'We sincerely apologize for the oversight. We have verified with the restaurant and credited ৳60 back to your original payment method.',
    ticketUrl: 'http://localhost:5173/support/TCK-8291A',
  },
  [EmailEventKey.SUPPORT_TICKET_RESOLVED]: {
    ticketId: 'TCK-8291A',
    subject: 'Missing beverage in order ORD-98B2C4',
    userName: 'Rahim',
    resolution: 'Refund of ৳60 processed to bKash wallet. Restaurant warned about missing items checklist.',
    ticketUrl: 'http://localhost:5173/support/TCK-8291A',
  },

  // ── Financial ──
  [EmailEventKey.PAYOUT_PROCESSED]: {
    payoutId: 'PAY-981203',
    recipientName: 'Sultan\'s Dine Banani',
    amount: 34500,
    method: 'bank_transfer',
    bankName: 'City Bank Ltd',
    accountNumberMasked: '••••4819',
    transactionRef: 'TRX-CITY-81920381',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-07',
  },
  [EmailEventKey.PAYOUT_FAILED]: {
    payoutId: 'PAY-981203',
    recipientName: 'Sultan\'s Dine Banani',
    amount: 34500,
    failureReason: 'Routing number or account number mismatch reported by clearing bank.',
    settingsUrl: 'http://localhost:5173/vendor/finance',
  },

  // ── Admin Alerts ──
  [EmailEventKey.ADMIN_NEW_VENDOR_ALERT]: {
    type: 'vendor',
    applicantName: 'Kamal Ahmed',
    businessOrVehicleName: 'Spicy Grill House Ltd',
    email: 'kamal@spicygrill.com',
    phone: '+880 1711-223344',
    reviewUrl: 'http://localhost:5173/admin/restaurants',
  },
  [EmailEventKey.ADMIN_NEW_DRIVER_ALERT]: {
    type: 'driver',
    applicantName: 'Rafiqul Islam',
    businessOrVehicleName: 'Motorcycle (150cc)',
    email: 'rafiqul@example.com',
    phone: '+880 1911-556677',
    reviewUrl: 'http://localhost:5173/admin/drivers',
  },

  // ── Marketing & Lifecycle ──
  [EmailEventKey.MARKETING_ABANDONED_CART]: {
    customerName: 'Rahim',
    itemsCount: 2,
    topItemNames: ['Kacchi Biryani (Basmati)', 'Special Chicken Chaap'],
    totalValue: 740,
    checkoutUrl: 'http://localhost:5173/checkout',
    unsubscribeUrl: 'http://localhost:5173/unsubscribe?token=sample_unsub_token',
  },
  [EmailEventKey.MARKETING_REVIEW_REMINDER]: {
    customerName: 'Rahim',
    orderNumber: 'ORD-98B2C4',
    restaurantName: 'Sultan\'s Dine',
    reviewUrl: 'http://localhost:5173/orders/ORD-98B2C4?review=true',
    unsubscribeUrl: 'http://localhost:5173/unsubscribe?token=sample_unsub_token',
  },
};

export async function generatePreviews(): Promise<void> {
  if (!fs.existsSync(PREVIEW_DIR)) {
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  }

  const emailItems: Array<{
    key: string;
    subject: string;
    htmlFile: string;
    textFile: string;
    byteSize: number;
    underLimit: boolean;
  }> = [];

  for (const [key, fixture] of Object.entries(FIXTURES)) {
    const eventKey = key as EmailEventKey;
    const rendered = renderEmailTemplate(eventKey, fixture);

    const safeName = eventKey.replace(/\./g, '_');
    const htmlFilename = `${safeName}.html`;
    const textFilename = `${safeName}.txt`;

    const htmlPath = path.join(PREVIEW_DIR, htmlFilename);
    const textPath = path.join(PREVIEW_DIR, textFilename);

    fs.writeFileSync(htmlPath, rendered.html, 'utf8');
    fs.writeFileSync(textPath, rendered.text, 'utf8');

    const byteSize = Buffer.byteLength(rendered.html, 'utf8');
    const underLimit = byteSize <= 102 * 1024; // Gmail 102 KB clipping threshold

    emailItems.push({
      key: eventKey,
      subject: rendered.subject,
      htmlFile: htmlFilename,
      textFile: textFilename,
      byteSize,
      underLimit,
    });
  }

  // Generate Interactive Gallery index.html
  const galleryHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Food Rush — Transactional Email Design System Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    aside {
      width: 340px;
      background: #ffffff;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .header {
      padding: 18px 20px;
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;
    }
    .brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #ea580c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .brand-title {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
    }
    .search-box {
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .search-input {
      width: 100%;
      padding: 8px 12px;
      font-size: 13px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      outline: none;
    }
    .search-input:focus {
      border-color: #ea580c;
    }
    .email-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }
    .email-item {
      padding: 10px 16px;
      cursor: pointer;
      border-left: 3px solid transparent;
      transition: background 0.15s;
    }
    .email-item:hover {
      background: #f1f5f9;
    }
    .email-item.active {
      background: #fff7ed;
      border-left-color: #ea580c;
    }
    .email-item-key {
      font-size: 12px;
      font-family: monospace;
      color: #64748b;
      margin-bottom: 2px;
    }
    .email-item-subject {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .email-item-meta {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
      display: flex;
      justify-content: space-between;
    }
    .badge-ok { color: #16a34a; font-weight: 600; }
    .badge-warn { color: #dc2626; font-weight: 700; }
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #f1f5f9;
      overflow: hidden;
    }
    .toolbar {
      padding: 12px 24px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .toolbar-title {
      font-size: 14px;
      font-weight: 600;
      color: #334155;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn {
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      transition: all 0.15s;
    }
    .btn.active, .btn:hover {
      background: #ea580c;
      border-color: #ea580c;
      color: #ffffff;
    }
    .preview-viewport-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: auto;
    }
    .preview-frame-wrapper {
      background: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: width 0.3s;
      height: 100%;
      width: 720px;
    }
    .preview-frame-wrapper.mobile {
      width: 375px;
      height: 667px;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <aside>
    <div class="header">
      <div class="brand-pill">🍔 Food Rush</div>
      <div class="brand-title">Email Templates Gallery</div>
    </div>
    <div class="search-box">
      <input type="text" id="filterInput" class="search-input" placeholder="Filter emails..." />
    </div>
    <div class="email-list" id="emailList">
      ${emailItems
        .map(
          (item, idx) => `
        <div class="email-item ${idx === 0 ? 'active' : ''}" data-file="${item.htmlFile}" data-key="${item.key}" onclick="selectEmail('${item.htmlFile}', this)">
          <div class="email-item-key">${item.key}</div>
          <div class="email-item-subject">${item.subject}</div>
          <div class="email-item-meta">
            <span>${(item.byteSize / 1024).toFixed(1)} KB</span>
            <span class="${item.underLimit ? 'badge-ok' : 'badge-warn'}">
              ${item.underLimit ? '✓ Under 102 KB' : '⚠ Exceeds 102 KB'}
            </span>
          </div>
        </div>
      `,
        )
        .join('')}
    </div>
  </aside>
  <main>
    <div class="toolbar">
      <div class="toolbar-title" id="activeTitle">${emailItems[0]?.subject || ''}</div>
      <div class="toolbar-actions">
        <button class="btn active" id="btnDesktop" onclick="setMode('desktop')">Desktop (720px)</button>
        <button class="btn" id="btnMobile" onclick="setMode('mobile')">Mobile (375px)</button>
        <button class="btn" onclick="openRaw()">Open in New Tab</button>
      </div>
    </div>
    <div class="preview-viewport-container">
      <div class="preview-frame-wrapper" id="frameWrapper">
        <iframe id="previewFrame" src="${emailItems[0]?.htmlFile || ''}"></iframe>
      </div>
    </div>
  </main>

  <script>
    let currentFile = "${emailItems[0]?.htmlFile || ''}";

    function selectEmail(file, element) {
      currentFile = file;
      document.querySelectorAll('.email-item').forEach(el => el.classList.remove('active'));
      element.classList.add('active');
      document.getElementById('previewFrame').src = file;
      const title = element.querySelector('.email-item-subject').innerText;
      document.getElementById('activeTitle').innerText = title;
    }

    function setMode(mode) {
      const wrapper = document.getElementById('frameWrapper');
      const btnDesktop = document.getElementById('btnDesktop');
      const btnMobile = document.getElementById('btnMobile');

      if (mode === 'mobile') {
        wrapper.classList.add('mobile');
        btnMobile.classList.add('active');
        btnDesktop.classList.remove('active');
      } else {
        wrapper.classList.remove('mobile');
        btnDesktop.classList.add('active');
        btnMobile.classList.remove('active');
      }
    }

    function openRaw() {
      if (currentFile) window.open(currentFile, '_blank');
    }

    document.getElementById('filterInput').addEventListener('input', function(e) {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.email-item').forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(q) ? 'block' : 'none';
      });
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(PREVIEW_DIR, 'index.html'), galleryHtml, 'utf8');

  // Summary output
  console.log(`\n======================================================`);
  console.log(`✅ Generated ${emailItems.length} transactional email previews!`);
  console.log(`📁 Directory: ${PREVIEW_DIR}`);
  console.log(`🌐 Open Gallery: ${path.join(PREVIEW_DIR, 'index.html')}`);
  console.log(`======================================================\n`);
}

if (require.main === module) {
  generatePreviews().catch((err) => {
    console.error('Failed to generate previews:', err);
    process.exit(1);
  });
}
