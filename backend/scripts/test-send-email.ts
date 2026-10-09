/**
 * Test Send Email Script
 * Sends a real or sandbox transactional email for testing.
 *
 * Usage:
 *   npx ts-node scripts/test-send-email.ts --to=test@example.com --event=order.placed_customer
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { EmailEventKey } from '../src/services/email/email.types';
import { emailService } from '../src/services/email/email.service';
import { connectDatabase } from '../src/config/database';
import { startEmailWorker, stopEmailWorker } from '../src/services/email/email-worker';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const args = process.argv.slice(2);
  const toArg = args.find((a) => a.startsWith('--to='))?.split('=')[1] || 'customer@foodrush.com';
  const eventArg = (args.find((a) => a.startsWith('--event='))?.split('=')[1] ||
    EmailEventKey.ORDER_PLACED_CUSTOMER) as EmailEventKey;

  console.log(`\n======================================================`);
  console.log(`📧 Test Email Sender`);
  console.log(`Recipient: ${toArg}`);
  console.log(`Event Key: ${eventArg}`);
  console.log(`Mode:      ${process.env.EMAIL_MODE || 'sandbox'}`);
  console.log(`======================================================\n`);

  await connectDatabase();
  startEmailWorker(1000);

  const samplePayload: any = {
    orderNumber: 'ORD-TEST01',
    customerName: 'Test Customer',
    customerEmail: toArg,
    deliveryAddress: {
      street: '123 Test St',
      area: 'Gulshan',
      district: 'Dhaka',
    },
    paymentMethod: 'cash_on_delivery',
    paymentStatus: 'pending',
    subtotal: 500,
    deliveryFee: 50,
    tax: 25,
    discount: 0,
    tipAmount: 0,
    total: 575,
    vendors: [
      {
        restaurantId: 'rest_01',
        restaurantName: 'Test Diner',
        orderNumber: 'ORD-TEST01',
        items: [
          {
            name: 'Classic Burger',
            quantity: 2,
            price: 250,
            itemTotal: 500,
          },
        ],
        subtotal: 500,
        deliveryFee: 50,
        tax: 25,
      },
    ],
    trackingUrl: 'http://localhost:5173/orders/ORD-TEST01',
  };

  const result = await emailService.send(eventArg, {
    to: toArg,
    idempotencyKey: `test_send:${Date.now()}`,
    data: samplePayload,
  });

  console.log('Enqueue Result:', result);
  console.log('Worker is processing outbox queue... (waiting 3s)');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  stopEmailWorker();
  console.log('Done!');
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Test send failed:', err);
    process.exit(1);
  });
}
