/**
 * Order live controller — chat (customer↔driver, customer↔vendor) and live ETA.
 * Persistence + authorization live in orderChat.service; this layer owns the
 * HTTP envelope, socket emission and notifications.
 */
import { NextFunction, Response } from 'express';
import { Types } from 'mongoose';
import { UserRole } from '../config/constants';
import Order from '../models/Order';
import { NotificationType } from '../models/Notification';
import { createNotification } from '../services/notification.service';
import {
  getParticipants,
  listMessages,
  markRead,
  sendMessage,
} from '../services/orderChat.service';
import { getIO } from '../socket';
import type { AuthRequest } from '../types';
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError } from '../utils/errors';
import { successResponse } from '../utils/response.util';

const requireUser = (req: AuthRequest) => {
  if (!req.user) throw new AuthenticationError();
  return req.user;
};

/** Serialise a (possibly populated) message document for transport. */
const serialize = (msg: any) => ({
  _id: msg._id.toString(),
  orderId: msg.orderId.toString(),
  channel: msg.channel,
  text: msg.text,
  attachments: msg.attachments ?? [],
  senderRole: msg.senderRole,
  sender:
    msg.senderId && typeof msg.senderId === 'object'
      ? {
          _id: msg.senderId._id?.toString?.() ?? '',
          firstName: msg.senderId.firstName ?? '',
          lastName: msg.senderId.lastName ?? '',
          role: msg.senderId.role ?? msg.senderRole,
        }
      : { _id: msg.senderId?.toString?.() ?? '', firstName: '', lastName: '', role: msg.senderRole },
  readBy: (msg.readBy ?? []).map((id: Types.ObjectId) => id.toString()),
  createdAt: msg.createdAt,
});

/** GET /api/orders/:orderId/messages?channel= */
export const getMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const { messages } = await listMessages(
      String(req.params.orderId),
      req.query.channel,
      user,
    );
    successResponse(res, { messages: messages.map(serialize) });
  } catch (error) {
    next(error);
  }
};

/** POST /api/orders/:orderId/messages  body: { channel, text, attachments? } */
export const postMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const { channel, text, attachments } = req.body as {
      channel: string;
      text: string;
      attachments?: string[];
    };

    const orderId = String(req.params.orderId);
    const { message, recipientUserId, orderNumber } = await sendMessage(
      orderId,
      channel,
      user,
      text,
      Array.isArray(attachments) ? attachments : [],
    );

    const payload = serialize(message);

    // Live transport: everyone currently viewing the order receives it.
    try {
      getIO().to(`order:${orderId}`).emit('order:chatMessage', payload);
    } catch {
      /* non-blocking */
    }

    // Out-of-app nudge for the recipient (toast + persisted notification).
    if (recipientUserId) {
      const senderName =
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Someone';
      await createNotification({
        userId: recipientUserId,
        type: NotificationType.ORDER_UPDATE,
        title: `New message · Order ${orderNumber}`,
        message: `${senderName}: ${payload.text.slice(0, 120)}`,
        data: {
          orderId,
          channel: payload.channel,
          kind: 'order_chat',
        },
      });
    }

    successResponse(res, { message: payload }, 'Message sent', 201);
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/orders/:orderId/messages/read  body: { channel } */
export const readMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const orderId = String(req.params.orderId);
    const { channel } = req.body as { channel: string };
    await markRead(orderId, channel, user);

    try {
      getIO().to(`order:${orderId}`).emit('order:chatRead', {
        orderId,
        channel,
        readerId: user._id.toString(),
      });
    } catch {
      /* non-blocking */
    }

    successResponse(res, { ok: true }, 'Marked as read');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/orders/:orderId/eta  body: { etaMinutes }
 * Posted by the rider (or the customer's client) with a freshly computed route
 * ETA; persisted opportunistically and broadcast to the order room.
 */
export const updateEta = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = requireUser(req);
    const orderId = String(req.params.orderId);
    const etaMinutes = Number((req.body as { etaMinutes: number }).etaMinutes);

    if (!Number.isFinite(etaMinutes) || etaMinutes < 0 || etaMinutes > 600)
      throw new ValidationError('Invalid ETA');

    const order = await Order.findById(orderId).select('customerId driverId');
    if (!order) throw new NotFoundError('Order not found');

    const uid = user._id.toString();
    const allowed =
      order.customerId.toString() === uid ||
      order.driverId?.toString() === uid ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPPORT;
    if (!allowed) throw new AuthorizationError('Not allowed to update this order');

    order.etaMinutes = Math.round(etaMinutes);
    order.etaUpdatedAt = new Date();
    await order.save();

    try {
      getIO().to(`order:${orderId}`).emit('order:etaUpdate', {
        _id: orderId,
        etaMinutes: order.etaMinutes,
        etaUpdatedAt: order.etaUpdatedAt,
      });
      // Keep the ops fleet map in sync too.
      getIO().to('admin:room').emit('order:etaUpdate', {
        _id: orderId,
        etaMinutes: order.etaMinutes,
        etaUpdatedAt: order.etaUpdatedAt,
      });
    } catch {
      /* non-blocking */
    }

    successResponse(res, { etaMinutes: order.etaMinutes }, 'ETA updated');
  } catch (error) {
    next(error);
  }
};
