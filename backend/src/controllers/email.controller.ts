import { NextFunction, Request, Response } from 'express';
import User from '../models/User';
import { executeUnsubscribe, verifyUnsubscribeToken } from '../services/email/unsubscribe.service';
import type { AuthRequest } from '../types';
import { AuthenticationError, ValidationError } from '../utils/errors';
import { successResponse } from '../utils/response.util';

/**
 * GET/POST /api/email/unsubscribe
 * Public 1-click unsubscribe endpoint (supports RFC 8058 List-Unsubscribe-Post).
 */
export const handleUnsubscribe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token =
      (req.query.token as string) ||
      (req.body?.token as string) ||
      (req.params?.token as string);

    if (!token) {
      throw new ValidationError('Unsubscribe token is required');
    }

    const result = await executeUnsubscribe(token);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message,
      });
      return;
    }

    successResponse(
      res,
      { category: result.category, email: result.email },
      result.message,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/email/verify-token
 * Validates an unsubscribe token without executing it (for frontend UI preview).
 */
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.query.token as string;
    if (!token) throw new ValidationError('Token is required');

    const payload = verifyUnsubscribeToken(token);
    if (!payload) {
      res.status(400).json({ success: false, message: 'Invalid or expired token' });
      return;
    }

    const user = await User.findById(payload.userId).select('email firstName emailPreferences');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    successResponse(res, {
      category: payload.category,
      email: user.email,
      firstName: user.firstName,
      emailPreferences: user.emailPreferences,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/email/preferences
 * Returns the authenticated user's email preferences.
 */
export const getMyEmailPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const user = await User.findById(authReq.user._id).select('email emailPreferences');
    if (!user) throw new AuthenticationError();

    const preferences = user.emailPreferences || {
      orderUpdates: true,
      accountAlerts: true,
      reviewRequests: true,
      promotions: false,
      newsletter: false,
    };

    successResponse(res, { preferences });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/email/preferences
 * Updates the authenticated user's email preferences.
 */
export const updateMyEmailPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { orderUpdates, accountAlerts, reviewRequests, promotions, newsletter } =
      req.body;

    const user = await User.findById(authReq.user._id);
    if (!user) throw new AuthenticationError();

    if (!user.emailPreferences) {
      user.emailPreferences = {
        orderUpdates: true,
        accountAlerts: true,
        reviewRequests: true,
        promotions: false,
        newsletter: false,
      };
    }

    if (typeof orderUpdates === 'boolean') user.emailPreferences.orderUpdates = orderUpdates;
    if (typeof accountAlerts === 'boolean') user.emailPreferences.accountAlerts = accountAlerts;
    if (typeof reviewRequests === 'boolean') user.emailPreferences.reviewRequests = reviewRequests;
    if (typeof promotions === 'boolean') user.emailPreferences.promotions = promotions;
    if (typeof newsletter === 'boolean') user.emailPreferences.newsletter = newsletter;

    await user.save({ validateBeforeSave: false });

    successResponse(
      res,
      { preferences: user.emailPreferences },
      'Email preferences updated successfully',
    );
  } catch (error) {
    next(error);
  }
};
