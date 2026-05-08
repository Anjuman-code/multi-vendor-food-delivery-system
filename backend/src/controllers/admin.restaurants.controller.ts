/**
 * Admin Restaurants Controller — approval queue, listing, moderation, and management.
 * Every mutation writes to AuditLog.
 */
import { NextFunction, Request, Response } from 'express';
import MenuItem from '../models/MenuItem';
import Order from '../models/Order';
import Restaurant from '../models/Restaurant';
import type { AuthRequest } from '../types';
import { createAuditLog } from '../utils/audit.util';
import { AuthenticationError, NotFoundError, ValidationError } from '../utils/errors';
import { successResponse } from '../utils/response.util';

const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

/** GET /api/admin/restaurants */
export const listRestaurants = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { deletedAt: null };

    if (req.query.search) {
      const s = req.query.search as string;
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { 'address.area': { $regex: s, $options: 'i' } },
        { 'address.district': { $regex: s, $options: 'i' } },
      ];
    }
    if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.cuisineType) filter.cuisineType = req.query.cuisineType;
    if (req.query.isFeatured !== undefined) filter.isFeatured = req.query.isFeatured === 'true';

    const sortField = (req.query.sort as string) || 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;

    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .select('name address cuisineType approvalStatus isActive isTemporarilyClosed isFeatured rating totalOrders createdAt'),
      Restaurant.countDocuments(filter),
    ]);

    successResponse(res, { restaurants, pagination: buildPagination(page, limit, total) });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/restaurants/approval-queue */
export const getApprovalQueue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const restaurants = await Restaurant.find({
      approvalStatus: 'pending',
      deletedAt: null,
    })
      .sort({ createdAt: 1 })
      .select('name address cuisineType contactInfo images operatingHours createdAt');

    successResponse(res, { restaurants, count: restaurants.length });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/restaurants/:id */
export const getRestaurantDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const restaurant = await Restaurant.findOne({ _id: req.params.id, deletedAt: null });
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    const [orderStats, menuItemCount] = await Promise.all([
      Order.aggregate([
        { $match: { restaurantId: restaurant._id } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          },
        },
      ]),
      MenuItem.countDocuments({ restaurantId: restaurant._id, deletedAt: null }),
    ]);

    successResponse(res, {
      restaurant,
      orderStats: orderStats[0] ?? { totalOrders: 0, totalRevenue: 0, cancelled: 0, delivered: 0 },
      menuItemCount,
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/restaurants/:id/approve */
export const approveRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { welcomeMessage } = req.body as { welcomeMessage?: string };

    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { approvalStatus: 'approved', isActive: true, rejectionReason: undefined },
      { new: true },
    );
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'restaurant.approved',
      resourceType: 'Restaurant',
      resourceId: restaurant._id,
      changes: [{ field: 'approvalStatus', oldValue: 'pending', newValue: 'approved' }],
      metadata: { welcomeMessage },
    });

    successResponse(res, { restaurant }, 'Restaurant approved');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/restaurants/:id/reject */
export const rejectRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { reason } = req.body as { reason: string };
    if (!reason) throw new ValidationError('Rejection reason is required');

    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { approvalStatus: 'rejected', rejectionReason: reason, isActive: false },
      { new: true },
    );
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'restaurant.rejected',
      resourceType: 'Restaurant',
      resourceId: restaurant._id,
      changes: [
        { field: 'approvalStatus', oldValue: 'pending', newValue: 'rejected' },
        { field: 'rejectionReason', newValue: reason },
      ],
      metadata: { reason },
    });

    successResponse(res, { restaurant }, 'Restaurant rejected');
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/admin/restaurants/:id */
export const updateRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const allowed = [
      'name', 'description', 'cuisineType', 'tags', 'deliveryFee', 'minimumOrder',
      'deliveryTime', 'priceRange', 'serviceOptions', 'paymentMethods', 'operatingHours',
      'contactInfo',
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      updates,
      { new: true, runValidators: true },
    );
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'restaurant.updated',
      resourceType: 'Restaurant',
      resourceId: restaurant._id,
      changes: Object.entries(updates).map(([field, newValue]) => ({ field, newValue })),
    });

    successResponse(res, { restaurant }, 'Restaurant updated');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/restaurants/:id/feature */
export const toggleFeatureRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const restaurant = await Restaurant.findOne({ _id: req.params.id, deletedAt: null });
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    const newFeatured = !(restaurant as unknown as Record<string, boolean>).isFeatured;
    await Restaurant.findByIdAndUpdate(req.params.id, { isFeatured: newFeatured });

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: newFeatured ? 'restaurant.featured' : 'restaurant.unfeatured',
      resourceType: 'Restaurant',
      resourceId: restaurant._id,
      changes: [{ field: 'isFeatured', newValue: newFeatured }],
    });

    successResponse(res, { isFeatured: newFeatured }, `Restaurant ${newFeatured ? 'featured' : 'unfeatured'}`);
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/restaurants/:id/close */
export const temporarilyCloseRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { reason, reopenDate } = req.body as { reason: string; reopenDate?: string };
    if (!reason) throw new ValidationError('Closure reason is required');

    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      {
        isTemporarilyClosed: true,
        closureReason: reason,
      },
      { new: true },
    );
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'restaurant.closed_by_admin',
      resourceType: 'Restaurant',
      resourceId: restaurant._id,
      changes: [{ field: 'isTemporarilyClosed', newValue: true }],
      metadata: { reason, reopenDate },
    });

    successResponse(res, { restaurant }, 'Restaurant temporarily closed');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/restaurants/:id/reopen */
export const reopenRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { isTemporarilyClosed: false, closureReason: undefined },
      { new: true },
    );
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'restaurant.reopened_by_admin',
      resourceType: 'Restaurant',
      resourceId: restaurant._id,
      changes: [{ field: 'isTemporarilyClosed', newValue: false }],
    });

    successResponse(res, { restaurant }, 'Restaurant reopened');
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/restaurants/:id/deactivate — super_admin only */
export const deactivateRestaurant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { reason } = req.body as { reason: string };
    if (!reason) throw new ValidationError('Reason is required');

    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { isActive: false, deletedAt: new Date() },
      { new: true },
    );
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: 'restaurant.deactivated',
      resourceType: 'Restaurant',
      resourceId: restaurant._id,
      changes: [{ field: 'isActive', newValue: false }],
      metadata: { reason },
    });

    successResponse(res, { restaurant }, 'Restaurant deactivated');
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/restaurants/:id/menu */
export const getRestaurantMenu = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const restaurant = await Restaurant.findOne({ _id: req.params.id, deletedAt: null }).select('name');
    if (!restaurant) throw new NotFoundError('Restaurant not found');

    const menuItems = await MenuItem.find({ restaurantId: req.params.id })
      .populate('categoryId', 'name')
      .sort({ 'categoryId': 1, name: 1 });

    successResponse(res, { restaurant, menuItems, count: menuItems.length });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/admin/restaurants/:restaurantId/menu/:itemId/visibility */
export const toggleMenuItemVisibility = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const item = await MenuItem.findOne({
      _id: req.params.itemId,
      restaurantId: req.params.restaurantId,
    });
    if (!item) throw new NotFoundError('Menu item not found');

    const newAvailability = !item.isAvailable;
    await MenuItem.findByIdAndUpdate(req.params.itemId, { isAvailable: newAvailability });

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: `menu_item.${newAvailability ? 'shown' : 'hidden'}_by_admin`,
      resourceType: 'MenuItem',
      resourceId: item._id,
      changes: [{ field: 'isAvailable', oldValue: item.isAvailable, newValue: newAvailability }],
    });

    successResponse(res, { isAvailable: newAvailability }, `Item ${newAvailability ? 'shown' : 'hidden'}`);
  } catch (error) {
    next(error);
  }
};
