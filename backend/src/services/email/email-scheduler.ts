import Cart from '../../models/Cart';
import Order, { OrderStatus } from '../../models/Order';
import Reservation from '../../models/Reservation';
import Restaurant from '../../models/Restaurant';
import Review from '../../models/Review';
import User from '../../models/User';
import { emailService } from './email.service';
import { EmailCategory, EmailEventKey } from './email.types';
import { generateUnsubscribeToken } from './unsubscribe.service';

class EmailScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  public start(intervalMs = 15 * 60 * 1000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.runScheduledJobs();
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async runScheduledJobs(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.checkAbandonedCarts();
      await this.checkReviewReminders();
      await this.checkReservationReminders();
    } catch {
      // Swallowed in background scheduler
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 1. Abandoned Carts: updated > 2 hours ago, not updated in last 48 hours, has items.
   */
  private async checkAbandonedCarts(): Promise<void> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const carts = await Cart.find({
      updatedAt: { $gte: twoDaysAgo, $lte: twoHoursAgo },
      'items.0': { $exists: true },
    }).limit(20);

    for (const cart of carts) {
      try {
        const user = await User.findById(cart.userId);
        if (!user || !user.email) continue;

        const unsubscribeToken = generateUnsubscribeToken(
          user._id.toString(),
          EmailCategory.PROMOTIONS,
        );
        const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${unsubscribeToken}`;

        const totalValue = cart.items.reduce(
          (sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1),
          0,
        );

        await emailService.send(EmailEventKey.MARKETING_ABANDONED_CART, {
          to: user.email,
          userId: user._id,
          idempotencyKey: `abandoned_cart:${cart._id}:${cart.updatedAt.toDateString()}`,
          data: {
            customerName: user.firstName,
            itemsCount: cart.items.length,
            topItemNames: cart.items.slice(0, 3).map((i: any) => i.name),
            totalValue,
            checkoutUrl: `${frontendUrl}/cart`,
            unsubscribeUrl,
          },
        });
      } catch {
        // Continue loop
      }
    }
  }

  /**
   * 2. Review Reminders: orders delivered > 24 hours ago without an existing review.
   */
  private async checkReviewReminders(): Promise<void> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const orders = await Order.find({
      status: OrderStatus.DELIVERED,
      actualDeliveryTime: { $gte: threeDaysAgo, $lte: twentyFourHoursAgo },
    }).limit(20);

    for (const order of orders) {
      try {
        // Check if customer already submitted review
        const existingReview = await Review.findOne({ orderId: order._id });
        if (existingReview) continue;

        const user = await User.findById(order.customerId);
        if (!user || !user.email) continue;

        const rest = await Restaurant.findById(order.restaurantId).select('name');
        const restName = rest?.name || 'Restaurant';

        const unsubscribeToken = generateUnsubscribeToken(
          user._id.toString(),
          EmailCategory.REVIEW_REQUESTS,
        );
        const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${unsubscribeToken}`;

        await emailService.send(EmailEventKey.MARKETING_REVIEW_REMINDER, {
          to: user.email,
          userId: user._id,
          idempotencyKey: `review_reminder:${order._id}`,
          data: {
            customerName: user.firstName,
            orderNumber: order.orderNumber,
            restaurantName: restName,
            reviewUrl: `${frontendUrl}/orders/${order._id}?review=true`,
            unsubscribeUrl,
          },
        });
      } catch {
        // Continue loop
      }
    }
  }

  /**
   * 3. Reservation Reminders: bookings today within the next 2 hours.
   */
  private async checkReservationReminders(): Promise<void> {
    const todayStr = new Date().toISOString().split('T')[0];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const reservations = await Reservation.find({
      date: todayStr,
      status: 'confirmed',
    }).limit(20);

    for (const res of reservations) {
      try {
        const guestEmail = res.guestInfo?.email;
        if (!guestEmail) continue;

        const rest = await Restaurant.findById(res.restaurantId).select('name address');
        const restName = rest?.name || 'Restaurant';
        const restAddr = rest?.address ? `${rest.address.street}, ${rest.address.area}` : '';

        await emailService.send(EmailEventKey.RESERVATION_REMINDER, {
          to: guestEmail,
          userId: res.customerId,
          idempotencyKey: `res_reminder:${res._id}:${todayStr}`,
          data: {
            reservationNumber: res.reservationNumber,
            restaurantName: restName,
            restaurantAddress: restAddr,
            date: res.date,
            time: res.time,
            partySize: res.partySize,
            detailsUrl: `${frontendUrl}/reservations/${res._id}`,
          },
        });
      } catch {
        // Continue loop
      }
    }
  }
}

export const emailScheduler = new EmailScheduler();
