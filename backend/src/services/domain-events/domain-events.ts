import { Types } from 'mongoose';
import Order, { OrderDocument, OrderStatus } from '../../models/Order';
import Restaurant from '../../models/Restaurant';
import User from '../../models/User';
import VendorProfile from '../../models/VendorProfile';
import { getIO } from '../../socket';
import { emailService } from '../email/email.service';
import { EmailEventKey } from '../email/email.types';
import { createNotification, NotificationType } from '../notification.service';

/**
 * Domain Event Seam — Central dispatcher synchronizing in-app notifications,
 * real-time socket events, and transactional emails across all roles.
 */
class DomainEventsService {
  private getFrontendUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  // ────────────────────────────────────────────────────────────────
  // 1. AUTHENTICATION & SECURITY
  // ────────────────────────────────────────────────────────────────

  public async onEmailVerificationRequested(params: {
    userId?: string | Types.ObjectId;
    email: string;
    firstName: string;
    otp: string;
    verificationToken: string;
    expiresInHours?: number;
  }): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const expiresInHours = params.expiresInHours || 24;

    await emailService.send(EmailEventKey.AUTH_VERIFICATION, {
      to: params.email,
      userId: params.userId,
      idempotencyKey: `auth_verify:${params.email}:${params.otp}`,
      authSecrets: {
        otp: params.otp,
        rawToken: params.verificationToken,
      },
      data: {
        firstName: params.firstName,
        email: params.email,
        otp: params.otp,
        verificationToken: params.verificationToken,
        verificationUrl: `${frontendUrl}/verify-email?token=${encodeURIComponent(params.verificationToken)}`,
        expiresInHours,
      },
    });
  }

  public async onEmailVerified(user: {
    _id: string | Types.ObjectId;
    email: string;
    firstName: string;
    role: string;
  }): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    let dashboardPath = '/';
    if (user.role === 'vendor') dashboardPath = '/vendor';
    else if (user.role === 'driver') dashboardPath = '/rider';
    else if (user.role === 'admin') dashboardPath = '/admin';

    // 1. In-app notification
    await createNotification({
      userId: user._id,
      type: NotificationType.SYSTEM,
      title: 'Welcome to Food Rush! 🍔',
      message: 'Your email address has been verified. Discover great food in your area.',
    });

    // 2. Transactional Welcome Email
    await emailService.send(EmailEventKey.AUTH_WELCOME, {
      to: user.email,
      userId: user._id,
      idempotencyKey: `auth_welcome:${user._id}`,
      data: {
        firstName: user.firstName,
        email: user.email,
        role: user.role,
        dashboardUrl: `${frontendUrl}${dashboardPath}`,
      },
    });
  }

  public async onPasswordResetRequested(params: {
    userId?: string | Types.ObjectId;
    email: string;
    firstName: string;
    resetToken: string;
    expiresInMinutes?: number;
    requestIp?: string;
  }): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const expiresInMinutes = params.expiresInMinutes || 15;

    await emailService.send(EmailEventKey.AUTH_PASSWORD_RESET, {
      to: params.email,
      userId: params.userId,
      idempotencyKey: `auth_pwd_reset:${params.email}:${Date.now()}`,
      authSecrets: {
        rawToken: params.resetToken,
      },
      data: {
        firstName: params.firstName,
        email: params.email,
        resetToken: params.resetToken,
        resetUrl: `${frontendUrl}/reset-password?token=${encodeURIComponent(params.resetToken)}`,
        expiresInMinutes,
        requestIp: params.requestIp,
      },
    });
  }

  public async onPasswordChanged(params: {
    userId: string | Types.ObjectId;
    email: string;
    firstName: string;
    clientIp?: string;
    userAgent?: string;
  }): Promise<void> {
    // In-app notification
    await createNotification({
      userId: params.userId,
      type: NotificationType.SYSTEM,
      title: 'Password Changed',
      message: 'Your account password was recently changed. If this was not you, contact support immediately.',
    });

    // Transactional security alert email
    await emailService.send(EmailEventKey.AUTH_PASSWORD_CHANGED, {
      to: params.email,
      userId: params.userId,
      idempotencyKey: `auth_pwd_changed:${params.userId}:${Date.now()}`,
      data: {
        firstName: params.firstName,
        email: params.email,
        changedAt: new Date().toUTCString(),
        clientIp: params.clientIp,
        userAgent: params.userAgent,
      },
    });
  }

  public async onAccountSuspended(params: {
    userId: string | Types.ObjectId;
    email: string;
    firstName: string;
    reason?: string;
    suspendedUntil?: Date | null;
    isBanned?: boolean;
  }): Promise<void> {
    const frontendUrl = this.getFrontendUrl();

    await createNotification({
      userId: params.userId,
      type: NotificationType.SYSTEM,
      title: params.isBanned ? 'Account Banned' : 'Account Suspended',
      message: params.reason || 'Your account privileges have been suspended.',
    });

    await emailService.send(EmailEventKey.AUTH_ACCOUNT_SUSPENDED, {
      to: params.email,
      userId: params.userId,
      idempotencyKey: `auth_suspended:${params.userId}:${Date.now()}`,
      data: {
        firstName: params.firstName,
        email: params.email,
        reason: params.reason,
        suspendedUntil: params.suspendedUntil ? params.suspendedUntil.toLocaleDateString() : undefined,
        isBanned: params.isBanned,
        supportUrl: `${frontendUrl}/support`,
      },
    });
  }

  public async onAccountReactivated(params: {
    userId: string | Types.ObjectId;
    email: string;
    firstName: string;
  }): Promise<void> {
    const frontendUrl = this.getFrontendUrl();

    await createNotification({
      userId: params.userId,
      type: NotificationType.SYSTEM,
      title: 'Account Reactivated',
      message: 'Your account privileges have been restored. You can now log back in.',
    });

    await emailService.send(EmailEventKey.AUTH_ACCOUNT_REACTIVATED, {
      to: params.email,
      userId: params.userId,
      idempotencyKey: `auth_reactivated:${params.userId}:${Date.now()}`,
      data: {
        firstName: params.firstName,
        email: params.email,
        reactivatedAt: new Date().toUTCString(),
        loginUrl: `${frontendUrl}/login`,
      },
    });
  }

  public async onAccountDeactivated(params: {
    userId: string | Types.ObjectId;
    email: string;
    firstName: string;
  }): Promise<void> {
    await emailService.send(EmailEventKey.AUTH_ACCOUNT_DEACTIVATED, {
      to: params.email,
      userId: params.userId,
      idempotencyKey: `auth_deactivated:${params.userId}:${Date.now()}`,
      data: {
        firstName: params.firstName,
        email: params.email,
        deactivatedAt: new Date().toUTCString(),
      },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // 2. ORDER LIFECYCLE
  // ────────────────────────────────────────────────────────────────

  /**
   * Dispatched when an order (or group order from multi-vendor cart) is placed.
   * Sends 1 consolidated customer receipt + vendor alerts per restaurant.
   */
  public async onOrderPlaced(params: {
    orders: OrderDocument[];
    customer: { _id: Types.ObjectId | string; firstName: string; lastName: string; email: string; phoneNumber?: string };
    groupOrderId?: Types.ObjectId | string;
  }): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const firstOrder = params.orders[0];
    const customerName = `${params.customer.firstName} ${params.customer.lastName}`.trim();

    // 1. Group vendor summaries for customer receipt
    const vendorSummaries = [];
    for (const ord of params.orders) {
      const rest = await Restaurant.findById(ord.restaurantId).select('name');
      const restName = rest?.name || 'Restaurant';

      vendorSummaries.push({
        restaurantId: ord.restaurantId.toString(),
        restaurantName: restName,
        orderNumber: ord.orderNumber,
        items: ord.items.map((i: any) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          itemTotal: i.itemTotal,
          variants: i.variants,
          addons: i.addons,
          specialInstructions: i.specialInstructions,
        })),
        subtotal: ord.subtotal,
        deliveryFee: ord.deliveryFee,
        tax: ord.tax,
      });

      // 2. Notify vendor via Email and Sockets
      try {
        const vProfile = await VendorProfile.findOne({ restaurantIds: ord.restaurantId });
        if (vProfile) {
          const vUser = await User.findById(vProfile.userId);
          if (vUser && vUser.email) {
            await emailService.send(EmailEventKey.ORDER_VENDOR_NEW_ORDER, {
              to: vUser.email,
              userId: vUser._id,
              idempotencyKey: `vendor_new_order:${ord._id}`,
              data: {
                orderNumber: ord.orderNumber,
                orderId: ord._id.toString(),
                restaurantName: restName,
                customerName,
                customerPhone: params.customer.phoneNumber,
                deliveryAddress: ord.deliveryAddress,
                items: ord.items.map((i: any) => ({
                  name: i.name,
                  quantity: i.quantity,
                  price: i.price,
                  itemTotal: i.itemTotal,
                  variants: i.variants,
                  addons: i.addons,
                })),
                subtotal: ord.subtotal,
                total: ord.total,
                paymentMethod: ord.paymentMethod,
                specialInstructions: ord.specialInstructions,
                dashboardUrl: `${frontendUrl}/vendor/orders/${ord._id}`,
              },
            });
          }
        }
      } catch {
        // Swallowed: vendor email failure does not affect customer receipt
      }
    }

    // 3. Consolidated Totals
    const combinedSubtotal = params.orders.reduce((sum, o) => sum + o.subtotal, 0);
    const combinedDelivery = params.orders.reduce((sum, o) => sum + o.deliveryFee, 0);
    const combinedTax = params.orders.reduce((sum, o) => sum + o.tax, 0);
    const combinedDiscount = params.orders.reduce((sum, o) => sum + (o.discount || 0), 0);
    const combinedTip = params.orders.reduce((sum, o) => sum + (o.tipAmount || 0), 0);
    const combinedTotal = params.orders.reduce((sum, o) => sum + o.total, 0);

    // 4. Send Customer Order Confirmation Email
    await emailService.send(EmailEventKey.ORDER_PLACED_CUSTOMER, {
      to: params.customer.email,
      userId: params.customer._id,
      idempotencyKey: `order_placed:${params.groupOrderId || firstOrder._id}`,
      data: {
        orderNumber: params.orders.map((o) => o.orderNumber).join(', '),
        groupOrderId: params.groupOrderId?.toString(),
        customerName,
        customerEmail: params.customer.email,
        deliveryAddress: firstOrder.deliveryAddress,
        paymentMethod: firstOrder.paymentMethod,
        paymentStatus: firstOrder.paymentStatus,
        subtotal: combinedSubtotal,
        deliveryFee: combinedDelivery,
        tax: combinedTax,
        discount: combinedDiscount,
        tipAmount: combinedTip,
        total: combinedTotal,
        estimatedDeliveryTime: firstOrder.estimatedDeliveryTime
          ? firstOrder.estimatedDeliveryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined, // Content accuracy rule: omit ETA line if real ETA is missing
        vendors: vendorSummaries,
        trackingUrl: `${frontendUrl}/orders/${firstOrder._id}`,
      },
    });
  }

  public async onOrderOutForDelivery(order: OrderDocument): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const customer = await User.findById(order.customerId);
    if (!customer || !customer.email) return;

    const rest = await Restaurant.findById(order.restaurantId).select('name');
    const driver = order.driverId ? await User.findById(order.driverId).select('firstName lastName phoneNumber') : null;

    await emailService.send(EmailEventKey.ORDER_OUT_FOR_DELIVERY, {
      to: customer.email,
      userId: customer._id,
      idempotencyKey: `order_out_for_delivery:${order._id}:${OrderStatus.PICKED_UP}`,
      data: {
        orderNumber: order.orderNumber,
        orderId: order._id.toString(),
        restaurantName: rest?.name || 'Restaurant',
        driverName: driver ? `${driver.firstName} ${driver.lastName}`.trim() : undefined,
        driverPhone: driver?.phoneNumber,
        deliveryAddress: {
          street: order.deliveryAddress.street,
          area: order.deliveryAddress.area,
        },
        estimatedDeliveryTime: order.estimatedDeliveryTime
          ? order.estimatedDeliveryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined,
        trackingUrl: `${frontendUrl}/orders/${order._id}`,
      },
    });
  }

  public async onOrderDelivered(order: OrderDocument): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const customer = await User.findById(order.customerId);
    if (!customer || !customer.email) return;

    const rest = await Restaurant.findById(order.restaurantId).select('name');

    await emailService.send(EmailEventKey.ORDER_DELIVERED, {
      to: customer.email,
      userId: customer._id,
      idempotencyKey: `order_delivered:${order._id}:${OrderStatus.DELIVERED}`,
      data: {
        orderNumber: order.orderNumber,
        orderId: order._id.toString(),
        restaurantName: rest?.name || 'Restaurant',
        deliveredAt: (order.actualDeliveryTime || new Date()).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        totalPaid: order.total,
        paymentMethod: order.paymentMethod,
        deliveryProofUrl: order.deliveryProof?.photoUrl,
        reviewUrl: `${frontendUrl}/orders/${order._id}?review=true`,
        receiptUrl: `${frontendUrl}/orders/${order._id}`,
        items: order.items.map((i: any) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          itemTotal: i.itemTotal,
          variants: i.variants,
          addons: i.addons,
        })),
      },
    });
  }

  public async onOrderCancelled(order: OrderDocument, cancelledByRole: string, reason: string): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const customer = await User.findById(order.customerId);
    if (!customer || !customer.email) return;

    const rest = await Restaurant.findById(order.restaurantId).select('name');

    await emailService.send(EmailEventKey.ORDER_CANCELLED, {
      to: customer.email,
      userId: customer._id,
      idempotencyKey: `order_cancelled:${order._id}:${OrderStatus.CANCELLED}`,
      data: {
        orderNumber: order.orderNumber,
        orderId: order._id.toString(),
        restaurantName: rest?.name || 'Restaurant',
        cancelledBy: cancelledByRole,
        cancelReason: reason || order.cancelReason || 'Cancelled',
        refundStatus: order.paymentStatus === 'refunded' ? 'refunded' : order.paymentMethod === 'cash_on_delivery' ? 'none' : 'pending',
        supportUrl: `${frontendUrl}/support`,
      },
    });
  }

  public async onOrderRefundIssued(order: OrderDocument, refundAmount: number, reason: string): Promise<void> {
    const customer = await User.findById(order.customerId);
    if (!customer || !customer.email) return;

    await emailService.send(EmailEventKey.ORDER_REFUND_ISSUED, {
      to: customer.email,
      userId: customer._id,
      idempotencyKey: `order_refund:${order._id}:${refundAmount}:${Date.now()}`,
      data: {
        orderNumber: order.orderNumber,
        orderId: order._id.toString(),
        refundAmount,
        reason,
        paymentMethod: order.paymentMethod,
        lineItems: (order.refundLineItems || []).map((li) => ({
          itemName: li.itemName,
          quantity: li.quantity,
          refundAmount: li.refundAmount,
        })),
      },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // 3. PARTNERS (VENDOR & DRIVER)
  // ────────────────────────────────────────────────────────────────

  public async onRestaurantApproved(restaurantId: string | Types.ObjectId): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return;

    const vendorProfile = await VendorProfile.findOne({ restaurantIds: restaurant._id });
    if (!vendorProfile) return;

    const user = await User.findById(vendorProfile.userId);
    if (!user || !user.email) return;

    await emailService.send(EmailEventKey.VENDOR_RESTAURANT_APPROVED, {
      to: user.email,
      userId: user._id,
      idempotencyKey: `rest_approved:${restaurant._id}`,
      data: {
        businessName: vendorProfile.businessName,
        restaurantName: restaurant.name,
        contactName: user.firstName,
        dashboardUrl: `${frontendUrl}/vendor`,
        menuSetupUrl: `${frontendUrl}/vendor/menu`,
      },
    });
  }

  public async onRestaurantRejected(restaurantId: string | Types.ObjectId, reason: string): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return;

    const vendorProfile = await VendorProfile.findOne({ restaurantIds: restaurant._id });
    if (!vendorProfile) return;

    const user = await User.findById(vendorProfile.userId);
    if (!user || !user.email) return;

    await emailService.send(EmailEventKey.VENDOR_RESTAURANT_REJECTED, {
      to: user.email,
      userId: user._id,
      idempotencyKey: `rest_rejected:${restaurant._id}`,
      data: {
        businessName: vendorProfile.businessName,
        restaurantName: restaurant.name,
        contactName: user.firstName,
        rejectionReason: reason,
        supportUrl: `${frontendUrl}/vendor/support`,
      },
    });
  }

  public async onDriverApproved(driverUserId: string | Types.ObjectId): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const user = await User.findById(driverUserId);
    if (!user || !user.email) return;

    await emailService.send(EmailEventKey.DRIVER_APPLICATION_APPROVED, {
      to: user.email,
      userId: user._id,
      idempotencyKey: `driver_approved:${user._id}`,
      data: {
        driverName: user.firstName,
        dashboardUrl: `${frontendUrl}/rider`,
      },
    });
  }

  public async onDriverRejected(driverUserId: string | Types.ObjectId, reason: string): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const user = await User.findById(driverUserId);
    if (!user || !user.email) return;

    await emailService.send(EmailEventKey.DRIVER_APPLICATION_REJECTED, {
      to: user.email,
      userId: user._id,
      idempotencyKey: `driver_rejected:${user._id}`,
      data: {
        driverName: user.firstName,
        rejectionReason: reason,
        supportUrl: `${frontendUrl}/rider/support`,
      },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // 4. RESERVATIONS
  // ────────────────────────────────────────────────────────────────

  public async onReservationCreated(reservation: any): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const restaurant = await Restaurant.findById(reservation.restaurantId).select('name address');
    const guestEmail = reservation.guestInfo?.email;
    const restName = restaurant?.name || 'Restaurant';
    const restAddr = restaurant?.address ? `${restaurant.address.street}, ${restaurant.address.area}` : '';

    // Customer / Guest Confirmation
    if (guestEmail) {
      await emailService.send(EmailEventKey.RESERVATION_REQUESTED_CUSTOMER, {
        to: guestEmail,
        userId: reservation.customerId,
        idempotencyKey: `res_created_guest:${reservation._id}`,
        data: {
          reservationNumber: reservation.reservationNumber,
          restaurantName: restName,
          restaurantAddress: restAddr,
          guestName: reservation.guestInfo.name,
          partySize: reservation.partySize,
          date: reservation.date,
          time: reservation.time,
          specialRequests: reservation.specialRequests,
          status: reservation.status,
          detailsUrl: `${frontendUrl}/reservations/${reservation._id}`,
        },
      });
    }

    // Vendor Alert
    try {
      const vProfile = await VendorProfile.findOne({ restaurantIds: reservation.restaurantId });
      if (vProfile) {
        const vUser = await User.findById(vProfile.userId);
        if (vUser && vUser.email) {
          await emailService.send(EmailEventKey.RESERVATION_VENDOR_ALERT, {
            to: vUser.email,
            userId: vUser._id,
            idempotencyKey: `res_created_vendor:${reservation._id}`,
            data: {
              reservationNumber: reservation.reservationNumber,
              restaurantName: restName,
              guestName: reservation.guestInfo.name,
              guestPhone: reservation.guestInfo.phone,
              guestEmail: reservation.guestInfo.email,
              partySize: reservation.partySize,
              date: reservation.date,
              time: reservation.time,
              specialRequests: reservation.specialRequests,
              vendorReservationsUrl: `${frontendUrl}/vendor/reservations`,
            },
          });
        }
      }
    } catch {
      // Non-blocking
    }
  }

  public async onReservationStatusChanged(reservation: any, reason?: string): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const guestEmail = reservation.guestInfo?.email;
    if (!guestEmail) return;

    const restaurant = await Restaurant.findById(reservation.restaurantId).select('name');

    await emailService.send(EmailEventKey.RESERVATION_STATUS_UPDATED, {
      to: guestEmail,
      userId: reservation.customerId,
      idempotencyKey: `res_status:${reservation._id}:${reservation.status}`,
      data: {
        reservationNumber: reservation.reservationNumber,
        restaurantName: restaurant?.name || 'Restaurant',
        guestName: reservation.guestInfo.name,
        status: reservation.status,
        reason,
        date: reservation.date,
        time: reservation.time,
        partySize: reservation.partySize,
        detailsUrl: `${frontendUrl}/reservations/${reservation._id}`,
      },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // 5. SUPPORT TICKETS
  // ────────────────────────────────────────────────────────────────

  public async onSupportTicketCreated(ticket: any, userEmail?: string, userName?: string): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    let recipientEmail = userEmail;
    let name = userName;

    if (!recipientEmail && ticket.userId) {
      const user = await User.findById(ticket.userId);
      if (user) {
        recipientEmail = user.email;
        name = `${user.firstName} ${user.lastName}`.trim();
      }
    }

    if (!recipientEmail) return;

    await emailService.send(EmailEventKey.SUPPORT_TICKET_CREATED, {
      to: recipientEmail,
      userId: ticket.userId,
      idempotencyKey: `ticket_created:${ticket._id}`,
      data: {
        ticketId: ticket._id.toString().substring(18).toUpperCase(),
        subject: ticket.subject,
        userName: name || 'Valued Customer',
        messagePreview: ticket.messages?.[0]?.message || 'Your support ticket has been received.',
        priority: ticket.priority,
        ticketUrl: `${frontendUrl}/support/${ticket._id}`,
      },
    });
  }

  public async onSupportAgentReplied(ticket: any, replyMessage: string, agentName: string): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const user = await User.findById(ticket.userId);
    if (!user || !user.email) return;

    await emailService.send(EmailEventKey.SUPPORT_AGENT_REPLY, {
      to: user.email,
      userId: user._id,
      idempotencyKey: `ticket_reply:${ticket._id}:${ticket.messages?.length || Date.now()}`,
      data: {
        ticketId: ticket._id.toString().substring(18).toUpperCase(),
        subject: ticket.subject,
        userName: user.firstName,
        agentName,
        replyMessage,
        ticketUrl: `${frontendUrl}/support/${ticket._id}`,
      },
    });
  }

  public async onSupportTicketResolved(ticket: any): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const user = await User.findById(ticket.userId);
    if (!user || !user.email) return;

    await emailService.send(EmailEventKey.SUPPORT_TICKET_RESOLVED, {
      to: user.email,
      userId: user._id,
      idempotencyKey: `ticket_resolved:${ticket._id}`,
      data: {
        ticketId: ticket._id.toString().substring(18).toUpperCase(),
        subject: ticket.subject,
        userName: user.firstName,
        resolution: ticket.resolution,
        ticketUrl: `${frontendUrl}/support/${ticket._id}`,
      },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // 6. PARTNER ONBOARDING & DRIVER ASSIGNMENTS (P1)
  // ────────────────────────────────────────────────────────────────

  public async onVendorApplicationReceived(params: {
    userId: string | Types.ObjectId;
    email: string;
    contactName: string;
    businessName: string;
    phone?: string;
  }): Promise<void> {
    await emailService.send(EmailEventKey.VENDOR_APPLICATION_RECEIVED, {
      to: params.email,
      userId: params.userId,
      idempotencyKey: `vendor_app_received:${params.userId}`,
      data: {
        businessName: params.businessName,
        contactName: params.contactName,
        email: params.email,
        submittedAt: new Date().toLocaleDateString(),
      },
    });

    await this.onAdminNewRegistrationAlert({
      type: 'vendor',
      applicantName: params.contactName,
      businessOrVehicleName: params.businessName,
      email: params.email,
      phone: params.phone,
    });
  }

  public async onDriverApplicationReceived(params: {
    userId: string | Types.ObjectId;
    email: string;
    driverName: string;
    vehicleType: string;
    licenseNumber: string;
    phone?: string;
  }): Promise<void> {
    await emailService.send(EmailEventKey.DRIVER_APPLICATION_RECEIVED, {
      to: params.email,
      userId: params.userId,
      idempotencyKey: `driver_app_received:${params.userId}`,
      data: {
        driverName: params.driverName,
        vehicleType: params.vehicleType,
        licenseNumber: params.licenseNumber,
        submittedAt: new Date().toLocaleDateString(),
      },
    });

    await this.onAdminNewRegistrationAlert({
      type: 'driver',
      applicantName: params.driverName,
      businessOrVehicleName: params.vehicleType,
      email: params.email,
      phone: params.phone,
    });
  }

  public async onAdminNewRegistrationAlert(params: {
    type: 'vendor' | 'driver';
    applicantName: string;
    businessOrVehicleName: string;
    email: string;
    phone?: string;
  }): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const adminUser = await User.findOne({ role: 'admin' }).select('email');
    const adminEmail = adminUser?.email || process.env.ADMIN_EMAIL || 'admin@foodrush.com';

    const eventKey =
      params.type === 'vendor'
        ? EmailEventKey.ADMIN_NEW_VENDOR_ALERT
        : EmailEventKey.ADMIN_NEW_DRIVER_ALERT;

    await emailService.send(eventKey, {
      to: adminEmail,
      userId: adminUser?._id,
      idempotencyKey: `admin_reg_alert:${params.type}:${params.email}:${Date.now()}`,
      data: {
        type: params.type,
        applicantName: params.applicantName,
        businessOrVehicleName: params.businessOrVehicleName,
        email: params.email,
        phone: params.phone,
        reviewUrl:
          params.type === 'vendor'
            ? `${frontendUrl}/admin/restaurants`
            : `${frontendUrl}/admin/drivers`,
      },
    });
  }

  public async onDriverOrderAssigned(params: {
    driverUserId: string | Types.ObjectId;
    order: OrderDocument;
  }): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const driver = await User.findById(params.driverUserId).select('firstName email');
    if (!driver || !driver.email) return;

    const restaurant = await Restaurant.findById(params.order.restaurantId).select('name address');
    const restName = restaurant?.name || 'Restaurant';
    const restAddr = restaurant?.address
      ? `${restaurant.address.street}, ${restaurant.address.area}`
      : 'Restaurant Location';

    const delAddr = `${params.order.deliveryAddress.street}, ${params.order.deliveryAddress.area}`;
    const estimatedEarnings = Math.round(params.order.deliveryFee * 0.8) || 50;

    await emailService.send(EmailEventKey.DRIVER_ORDER_ASSIGNED, {
      to: driver.email,
      userId: driver._id,
      idempotencyKey: `driver_assigned:${params.order._id}:${params.driverUserId}`,
      data: {
        orderNumber: params.order.orderNumber,
        restaurantName: restName,
        restaurantAddress: restAddr,
        deliveryAddress: delAddr,
        estimatedEarnings,
        orderUrl: `${frontendUrl}/rider/orders/${params.order._id}`,
      },
    });
  }

  public async onVendorReviewReceived(params: {
    restaurantId: string | Types.ObjectId;
    reviewerName: string;
    rating: number;
    reviewTitle?: string;
    comment?: string;
  }): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const restaurant = await Restaurant.findById(params.restaurantId).select('name');
    if (!restaurant) return;

    const vendorProfile = await VendorProfile.findOne({ restaurantIds: restaurant._id });
    if (!vendorProfile) return;

    const vendorUser = await User.findById(vendorProfile.userId).select('email');
    if (!vendorUser || !vendorUser.email) return;

    await emailService.send(EmailEventKey.VENDOR_REVIEW_RECEIVED, {
      to: vendorUser.email,
      userId: vendorUser._id,
      idempotencyKey: `vendor_review:${params.restaurantId}:${Date.now()}`,
      data: {
        restaurantName: restaurant.name,
        reviewerName: params.reviewerName,
        rating: params.rating,
        reviewTitle: params.reviewTitle,
        comment: params.comment,
        reviewUrl: `${frontendUrl}/vendor/reviews`,
      },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // 7. FINANCIAL (PAYOUTS) (P1)
  // ────────────────────────────────────────────────────────────────

  public async onPayoutProcessed(params: {
    recipientUserId: string | Types.ObjectId;
    amount: number;
    method: string;
    bankName?: string;
    accountNumberMasked?: string;
    transactionRef: string;
    periodStart: string;
    periodEnd: string;
    payoutId?: string;
  }): Promise<void> {
    const user = await User.findById(params.recipientUserId).select('firstName lastName email');
    if (!user || !user.email) return;

    const recipientName = `${user.firstName} ${user.lastName}`.trim();

    await emailService.send(EmailEventKey.PAYOUT_PROCESSED, {
      to: user.email,
      userId: user._id,
      idempotencyKey: `payout_proc:${params.payoutId || params.transactionRef}`,
      data: {
        payoutId: params.payoutId || params.transactionRef,
        recipientName,
        amount: params.amount,
        method: params.method,
        bankName: params.bankName,
        accountNumberMasked: params.accountNumberMasked,
        transactionRef: params.transactionRef,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
      },
    });
  }

  public async onPayoutFailed(params: {
    recipientUserId: string | Types.ObjectId;
    amount: number;
    failureReason: string;
    payoutId?: string;
  }): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const user = await User.findById(params.recipientUserId).select('firstName lastName email role');
    if (!user || !user.email) return;

    const recipientName = `${user.firstName} ${user.lastName}`.trim();
    const settingsPath = user.role === 'vendor' ? '/vendor/finance' : '/rider/payouts';

    await emailService.send(EmailEventKey.PAYOUT_FAILED, {
      to: user.email,
      userId: user._id,
      idempotencyKey: `payout_failed:${params.payoutId || Date.now()}`,
      data: {
        payoutId: params.payoutId || `PAY-${Date.now()}`,
        recipientName,
        amount: params.amount,
        failureReason: params.failureReason,
        settingsUrl: `${frontendUrl}${settingsPath}`,
      },
    });
  }
}

export const domainEvents = new DomainEventsService();
