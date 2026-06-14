/**
 * Notification controller – list, read, mark-read for users.
 */
import { Request, Response, NextFunction } from "express";
import Notification from "../models/Notification";
import { successResponse } from "../utils/response.util";
import { AuthenticationError, NotFoundError } from "../utils/errors";
import type { AuthRequest } from "../types";

/**
 * GET /api/notifications
 * List notifications for the authenticated user.
 */
export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: authReq.user._id })
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments({ userId: authReq.user._id }),
      Notification.countDocuments({
        userId: authReq.user._id,
        isRead: false,
      }),
    ]);

    successResponse(res, {
      notifications,
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count
 * Quick count of unread notifications.
 */
export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const count = await Notification.countDocuments({
      userId: authReq.user._id,
      isRead: false,
    });

    successResponse(res, { unreadCount: count });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:notificationId/read
 * Mark a single notification as read.
 */
export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, userId: authReq.user._id },
      { isRead: true },
      { new: true },
    );
    if (!notification) throw new NotFoundError("Notification not found");

    successResponse(res, { notification }, "Marked as read");
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:notificationId/unread
 * Mark a single notification as unread.
 */
export const markAsUnread = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, userId: authReq.user._id },
      { isRead: false },
      { new: true },
    );
    if (!notification) throw new NotFoundError("Notification not found");

    successResponse(res, { notification }, "Marked as unread");
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read.
 */
export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    await Notification.updateMany(
      { userId: authReq.user._id, isRead: false },
      { isRead: true },
    );

    successResponse(res, null, "All notifications marked as read");
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/:notificationId
 * Delete a single notification.
 */
export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const notification = await Notification.findOneAndDelete({
      _id: req.params.notificationId,
      userId: authReq.user._id,
    });
    if (!notification) throw new NotFoundError("Notification not found");

    successResponse(res, null, "Notification deleted");
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications
 * Delete all notifications for the authenticated user.
 */
export const clearAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    await Notification.deleteMany({ userId: authReq.user._id });

    successResponse(res, null, "All notifications cleared");
  } catch (error) {
    next(error);
  }
};
