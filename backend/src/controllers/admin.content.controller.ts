/**
 * Admin Content Controller — cuisine types, tags, content blocks (homepage curation),
 * review moderation, and global search.
 */
import { NextFunction, Request, Response } from 'express';
import ContentBlock from '../models/ContentBlock';
import CuisineType from '../models/CuisineType';
import Order from '../models/Order';
import PlatformSettings from '../models/PlatformSettings';
import Restaurant from '../models/Restaurant';
import Review from '../models/Review';
import Tag from '../models/Tag';
import User from '../models/User';
import type { AuthRequest } from '../types';
import { createAuditLog } from '../utils/audit.util';
import { AuthenticationError, NotFoundError, ValidationError } from '../utils/errors';
import { successResponse } from '../utils/response.util';

// ────────────────────────────────────────────────────────────────
// CUISINE TYPES & TAGS
// ────────────────────────────────────────────────────────────────

/** GET /api/admin/content/cuisine-types */
export const listCuisineTypes = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await CuisineType.find().sort({ displayOrder: 1, name: 1 });
    successResponse(res, { types, count: types.length });
  } catch (e) { next(e); }
};

/** POST /api/admin/content/cuisine-types */
export const createCuisineType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();
    const type = await CuisineType.create(req.body);
    await createAuditLog({ actorId: authReq.user._id, actorRole: authReq.user.role, action: 'cuisine_type.created', resourceType: 'CuisineType', resourceId: type._id, changes: [{ field: 'name', newValue: type.name }] });
    successResponse(res, { type }, 'Cuisine type created', 201);
  } catch (e) { next(e); }
};

/** PATCH /api/admin/content/cuisine-types/:id */
export const updateCuisineType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();
    const type = await CuisineType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!type) throw new NotFoundError('Cuisine type not found');
    await createAuditLog({ actorId: authReq.user._id, actorRole: authReq.user.role, action: 'cuisine_type.updated', resourceType: 'CuisineType', resourceId: type._id, changes: [] });
    successResponse(res, { type }, 'Cuisine type updated');
  } catch (e) { next(e); }
};

/** DELETE /api/admin/content/cuisine-types/:id — super_admin */
export const deleteCuisineType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();
    const type = await CuisineType.findByIdAndDelete(req.params.id);
    if (!type) throw new NotFoundError('Cuisine type not found');
    await createAuditLog({ actorId: authReq.user._id, actorRole: authReq.user.role, action: 'cuisine_type.deleted', resourceType: 'CuisineType', resourceId: type._id, changes: [] });
    successResponse(res, null, 'Cuisine type deleted');
  } catch (e) { next(e); }
};

/** GET /api/admin/content/tags */
export const listTags = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });
    successResponse(res, { tags, count: tags.length });
  } catch (e) { next(e); }
};

/** POST /api/admin/content/tags */
export const createTag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();
    const tag = await Tag.create(req.body);
    await createAuditLog({ actorId: authReq.user._id, actorRole: authReq.user.role, action: 'tag.created', resourceType: 'Tag', resourceId: tag._id, changes: [{ field: 'name', newValue: tag.name }] });
    successResponse(res, { tag }, 'Tag created', 201);
  } catch (e) { next(e); }
};

/** PATCH /api/admin/content/tags/:id */
export const updateTag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();
    const tag = await Tag.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tag) throw new NotFoundError('Tag not found');
    successResponse(res, { tag }, 'Tag updated');
  } catch (e) { next(e); }
};

/** DELETE /api/admin/content/tags/:id — super_admin */
export const deleteTag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();
    const tag = await Tag.findByIdAndDelete(req.params.id);
    if (!tag) throw new NotFoundError('Tag not found');
    successResponse(res, null, 'Tag deleted');
  } catch (e) { next(e); }
};

// ────────────────────────────────────────────────────────────────
// CONTENT BLOCKS (Homepage Curation)
// ────────────────────────────────────────────────────────────────

/** GET /api/admin/content/blocks */
export const listContentBlocks = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const blocks = await ContentBlock.find().sort({ position: 1, createdAt: -1 });
    successResponse(res, { blocks, count: blocks.length });
  } catch (e) { next(e); }
};

/** POST /api/admin/content/blocks */
export const createContentBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();
    const block = await ContentBlock.create({ ...req.body, createdBy: authReq.user._id });
    await createAuditLog({ actorId: authReq.user._id, actorRole: authReq.user.role, action: 'content_block.created', resourceType: 'ContentBlock', resourceId: block._id, changes: [{ field: 'type', newValue: block.type }] });
    successResponse(res, { block }, 'Content block created', 201);
  } catch (e) { next(e); }
};

/** PATCH /api/admin/content/blocks/:id */
export const updateContentBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();
    const block = await ContentBlock.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: authReq.user._id },
      { new: true },
    );
    if (!block) throw new NotFoundError('Content block not found');
    await createAuditLog({ actorId: authReq.user._id, actorRole: authReq.user.role, action: 'content_block.updated', resourceType: 'ContentBlock', resourceId: block._id, changes: [] });
    successResponse(res, { block }, 'Content block updated');
  } catch (e) { next(e); }
};

/** PATCH /api/admin/content/blocks/reorder — bulk update block positions */
export const reorderContentBlocks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();
    const { order } = req.body as { order: Array<{ id: string; position: number }> };
    if (!Array.isArray(order) || order.length === 0) {
      throw new ValidationError('order array is required');
    }
    await ContentBlock.bulkWrite(
      order.map((o) => ({
        updateOne: { filter: { _id: o.id }, update: { $set: { position: o.position } } },
      })),
    );
    const blocks = await ContentBlock.find().sort({ position: 1, createdAt: -1 });
    await createAuditLog({ actorId: authReq.user._id, actorRole: authReq.user.role, action: 'content_block.reordered', resourceType: 'ContentBlock', resourceId: authReq.user._id, changes: [{ field: 'order', newValue: order.map((o) => o.id) }] });
    successResponse(res, { blocks }, 'Content blocks reordered');
  } catch (e) { next(e); }
};

/** DELETE /api/admin/content/blocks/:id */
export const deleteContentBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();
    const block = await ContentBlock.findByIdAndDelete(req.params.id);
    if (!block) throw new NotFoundError('Content block not found');
    await createAuditLog({ actorId: authReq.user._id, actorRole: authReq.user.role, action: 'content_block.deleted', resourceType: 'ContentBlock', resourceId: block._id, changes: [] });
    successResponse(res, null, 'Content block deleted');
  } catch (e) { next(e); }
};

// ────────────────────────────────────────────────────────────────
// REVIEW MODERATION
// ────────────────────────────────────────────────────────────────

/** GET /api/admin/reviews */
export const listReviewsForModeration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.restaurantId) filter.restaurantId = req.query.restaurantId;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .populate('restaurantId', 'name'),
      Review.countDocuments(filter),
    ]);

    successResponse(res, { reviews, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};

/** POST /api/admin/reviews/:id/approve */
export const approveReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();
    const review = await Review.findByIdAndUpdate(req.params.id, { status: 'published' }, { new: true });
    if (!review) throw new NotFoundError('Review not found');
    await createAuditLog({ actorId: authReq.user._id, actorRole: authReq.user.role, action: 'review.approved', resourceType: 'Review', resourceId: review._id, changes: [{ field: 'status', newValue: 'published' }] });
    successResponse(res, { review }, 'Review approved');
  } catch (e) { next(e); }
};

/** POST /api/admin/reviews/:id/remove */
export const removeReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();
    const { reason } = req.body as { reason: string };
    if (!reason) throw new ValidationError('Removal reason is required');
    const review = await Review.findByIdAndUpdate(req.params.id, { status: 'removed', moderationNote: reason }, { new: true });
    if (!review) throw new NotFoundError('Review not found');
    await createAuditLog({ actorId: authReq.user._id, actorRole: authReq.user.role, action: 'review.removed', resourceType: 'Review', resourceId: review._id, changes: [{ field: 'status', newValue: 'removed' }], metadata: { reason } });
    successResponse(res, { review }, 'Review removed');
  } catch (e) { next(e); }
};

/** POST /api/admin/reviews/:id/hide */
export const hideReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();
    const review = await Review.findByIdAndUpdate(req.params.id, { status: 'hidden' }, { new: true });
    if (!review) throw new NotFoundError('Review not found');
    await createAuditLog({ actorId: authReq.user._id, actorRole: authReq.user.role, action: 'review.hidden', resourceType: 'Review', resourceId: review._id, changes: [{ field: 'status', newValue: 'hidden' }] });
    successResponse(res, { review }, 'Review hidden');
  } catch (e) { next(e); }
};

// ────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS
// ────────────────────────────────────────────────────────────────

/** GET /api/admin/settings */
export const getSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }
    successResponse(res, { settings });
  } catch (e) { next(e); }
};

/** PATCH /api/admin/settings — super_admin only */
export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    let settings = await PlatformSettings.findOne();
    if (!settings) settings = new PlatformSettings({});

    const allowedKeys = [
      'platformName', 'contactEmail', 'defaultCommissionRate', 'defaultDeliveryFee',
      'minimumOrderValue', 'maxDeliveryRadiusKm', 'currency', 'locale',
      'payoutSchedule', 'minimumPayoutThreshold', 'featureFlags',
    ];

    const changes: Array<{ field: string; oldValue?: unknown; newValue?: unknown }> = [];
    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) {
        changes.push({ field: key, oldValue: (settings as Record<string, unknown>)[key], newValue: req.body[key] });
        (settings as Record<string, unknown>)[key] = req.body[key];
      }
    }
    settings.updatedBy = authReq.user._id;
    await settings.save();

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'platform_settings.updated',
      resourceType: 'PlatformSettings',
      resourceId: settings._id,
      changes,
    });

    successResponse(res, { settings }, 'Settings updated');
  } catch (e) { next(e); }
};

// ────────────────────────────────────────────────────────────────
// GLOBAL SEARCH
// ────────────────────────────────────────────────────────────────

/** GET /api/admin/search?q=... */
export const globalSearch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) throw new ValidationError('Search query must be at least 2 characters');

    const regex = { $regex: q, $options: 'i' };

    const [users, restaurants, orders] = await Promise.all([
      User.find({
        $or: [{ email: regex }, { firstName: regex }, { lastName: regex }, { phoneNumber: regex }],
      })
        .limit(5)
        .select('firstName lastName email role isActive'),
      Restaurant.find({ $or: [{ name: regex }, { 'address.area': regex }], deletedAt: null })
        .limit(5)
        .select('name address.area approvalStatus isActive rating'),
      Order.find({ orderNumber: regex })
        .limit(5)
        .select('orderNumber status total createdAt')
        .populate('customerId', 'firstName lastName'),
    ]);

    successResponse(res, { users, restaurants, orders, query: q });
  } catch (e) { next(e); }
};

// ────────────────────────────────────────────────────────────────
// AUDIT LOG
// ────────────────────────────────────────────────────────────────

/** GET /api/admin/audit-log */
export const getAuditLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 30);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.actorId) filter.actorId = req.query.actorId;
    if (req.query.resourceType) filter.resourceType = req.query.resourceType;
    if (req.query.action) filter.action = { $regex: req.query.action, $options: 'i' };

    const AuditLog = (await import('../models/AuditLog')).default;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actorId', 'firstName lastName email role'),
      AuditLog.countDocuments(filter),
    ]);

    successResponse(res, { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
};
