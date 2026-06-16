/**
 * Order chat service — authorization, participant resolution and persistence
 * for the customer↔driver and customer↔vendor message channels.
 *
 * The controller owns socket emission + notifications; this module is the
 * source of truth (DB) and the access-control gate.
 */
import { Types } from 'mongoose';
import { UserRole } from '../config/constants';
import Order from '../models/Order';
import OrderMessage, { MessageChannel } from '../models/OrderMessage';
import VendorProfile from '../models/VendorProfile';
import type { IUserDocument } from '../types/user.types';
import { AuthorizationError, NotFoundError, ValidationError } from '../utils/errors';

export interface OrderParticipants {
  customerId: Types.ObjectId;
  driverId: Types.ObjectId | null;
  vendorUserId: Types.ObjectId | null;
}

const isAdmin = (role: string) =>
  role === UserRole.ADMIN || role === UserRole.SUPPORT;

/** Resolve the three potential human participants of an order. */
export const getParticipants = async (
  orderId: string,
): Promise<{ participants: OrderParticipants; restaurantId: Types.ObjectId; orderNumber: string }> => {
  const order = await Order.findById(orderId).select(
    'customerId driverId restaurantId orderNumber',
  );
  if (!order) throw new NotFoundError('Order not found');

  const vendorProfile = await VendorProfile.findOne({
    restaurantIds: order.restaurantId,
  }).select('userId');

  return {
    participants: {
      customerId: order.customerId,
      driverId: order.driverId ?? null,
      vendorUserId: vendorProfile?.userId ?? null,
    },
    restaurantId: order.restaurantId,
    orderNumber: order.orderNumber,
  };
};

/**
 * Decide whether a user may access a channel, and (for non-admins) which other
 * party they are talking to. Throws AuthorizationError when not permitted.
 */
const authorizeChannel = (
  user: IUserDocument,
  channel: MessageChannel,
  participants: OrderParticipants,
): { canPost: boolean; recipientUserId: Types.ObjectId | null } => {
  const uid = user._id.toString();
  const role = user.role;

  // Admin / support — read-only oversight on both channels.
  if (isAdmin(role)) {
    return { canPost: false, recipientUserId: null };
  }

  const isCustomer = participants.customerId.toString() === uid;
  const isDriver = participants.driverId?.toString() === uid;
  const isVendor = participants.vendorUserId?.toString() === uid;

  if (channel === MessageChannel.CUSTOMER_DRIVER) {
    if (isCustomer)
      return { canPost: true, recipientUserId: participants.driverId };
    if (isDriver)
      return { canPost: true, recipientUserId: participants.customerId };
    throw new AuthorizationError('You are not a participant of this conversation');
  }

  // CUSTOMER_VENDOR
  if (isCustomer)
    return { canPost: true, recipientUserId: participants.vendorUserId };
  if (isVendor)
    return { canPost: true, recipientUserId: participants.customerId };
  throw new AuthorizationError('You are not a participant of this conversation');
};

const parseChannel = (raw: unknown): MessageChannel => {
  if (
    raw === MessageChannel.CUSTOMER_DRIVER ||
    raw === MessageChannel.CUSTOMER_VENDOR
  )
    return raw;
  throw new ValidationError('Invalid chat channel');
};

/** History for a channel (caller must be a participant or admin). */
export const listMessages = async (
  orderId: string,
  rawChannel: unknown,
  user: IUserDocument,
) => {
  const channel = parseChannel(rawChannel);
  const { participants } = await getParticipants(orderId);
  authorizeChannel(user, channel, participants);

  const messages = await OrderMessage.find({ orderId, channel })
    .sort({ createdAt: 1 })
    .populate('senderId', 'firstName lastName role')
    .lean();

  return { messages };
};

/** Persist a new message; returns the message + the recipient to notify. */
export const sendMessage = async (
  orderId: string,
  rawChannel: unknown,
  user: IUserDocument,
  text: string,
  attachments: string[] = [],
) => {
  const channel = parseChannel(rawChannel);
  const trimmed = (text ?? '').trim();
  if (!trimmed) throw new ValidationError('Message cannot be empty');
  if (trimmed.length > 2000)
    throw new ValidationError('Message is too long (max 2000 characters)');

  const { participants, orderNumber } = await getParticipants(orderId);
  const { canPost, recipientUserId } = authorizeChannel(
    user,
    channel,
    participants,
  );
  if (!canPost)
    throw new AuthorizationError('You cannot post in this conversation');
  if (!recipientUserId)
    throw new ValidationError(
      channel === MessageChannel.CUSTOMER_DRIVER
        ? 'No rider is assigned to this order yet'
        : 'This restaurant is not reachable for chat',
    );

  const message = await OrderMessage.create({
    orderId: new Types.ObjectId(orderId),
    channel,
    senderId: user._id,
    senderRole: user.role,
    text: trimmed,
    attachments,
    readBy: [user._id],
  });

  const populated = await message.populate('senderId', 'firstName lastName role');

  return { message: populated, recipientUserId, orderNumber, channel };
};

/** Mark every message in a channel not sent by the user as read by them. */
export const markRead = async (
  orderId: string,
  rawChannel: unknown,
  user: IUserDocument,
) => {
  const channel = parseChannel(rawChannel);
  const { participants } = await getParticipants(orderId);
  // Admins can clear their own unread badge too, but it has no recipient effect.
  if (!isAdmin(user.role)) authorizeChannel(user, channel, participants);

  await OrderMessage.updateMany(
    { orderId, channel, senderId: { $ne: user._id }, readBy: { $ne: user._id } },
    { $addToSet: { readBy: user._id } },
  );

  return { ok: true };
};
