/**
 * Delivery Controller.
 *
 * Public & Customer:
 * - POST /api/delivery/quote: computes delivery distance & fees from destination coordinates
 * - GET /api/delivery/campaigns/active: public customer-facing active campaigns
 * - GET /api/delivery/geocode/search: throttled geocode search proxy
 * - GET /api/delivery/geocode/reverse: throttled reverse geocode proxy
 * - GET /api/delivery/health: routing and geocoding diagnostics
 *
 * Admin:
 * - GET /api/admin/delivery/settings: view current delivery parameters
 * - PUT /api/admin/delivery/settings: update delivery settings (audit logged)
 * - POST /api/admin/delivery/simulate: interactive fee simulator
 * - GET /api/admin/delivery/campaigns: list all campaigns with pagination & filters
 * - POST /api/admin/delivery/campaigns: create a new free delivery campaign (audit logged)
 * - GET /api/admin/delivery/campaigns/:id: get campaign details
 * - PUT /api/admin/delivery/campaigns/:id: update campaign (audit logged)
 * - DELETE /api/admin/delivery/campaigns/:id: soft delete campaign (audit logged)
 */
import { NextFunction, Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import DeliveryCampaign from "../models/DeliveryCampaign";
import DeliverySettings from "../models/DeliverySettings";
import { deliveryService } from "../services/delivery/delivery.service";
import {
  calculateDeliveryFee,
  validateDeliverySettings,
} from "../services/delivery/fee-calculator";
import { matchDeliveryCampaign } from "../services/delivery/campaign-matcher";
import type { AuthRequest } from "../types";
import { AuthenticationError, NotFoundError, ValidationError } from "../utils/errors";
import { createAuditLog } from "../utils/audit.util";
import { successResponse } from "../utils/response.util";
import {
  deliveryCampaignSchema,
  geocodeReverseSchema,
  geocodeSearchSchema,
  quoteDeliverySchema,
  simulateDeliverySchema,
  updateDeliverySettingsSchema,
} from "../validations/delivery.validation";

// ─────────────────────────────────────────────────────────────────────────────
// Public & Customer Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/delivery/quote
 * Get a server-authoritative delivery distance, fee, and promotion quote.
 */
export const getDeliveryQuote = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = quoteDeliverySchema.parse(req.body);
    const quote = await deliveryService.quoteDelivery({
      destination: parsed.destination,
      subOrders: parsed.restaurants,
    });
    successResponse(res, quote, "Delivery quote generated successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/delivery/campaigns/active
 * Returns all currently active free delivery campaigns for customer badges & nudges.
 */
export const getActiveDeliveryCampaigns = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const now = new Date();
    const campaigns = await DeliveryCampaign.find({
      isActive: true,
      isDeleted: false,
      $or: [
        { startsAt: { $exists: false } },
        { startsAt: null },
        { startsAt: { $lte: now } },
      ],
      $and: [
        {
          $or: [
            { endsAt: { $exists: false } },
            { endsAt: null },
            { endsAt: { $gte: now } },
          ],
        },
      ],
    })
      .select("name label description minSubtotal restaurantIds maxDistanceKm maxWaivedAmount startsAt endsAt")
      .sort({ minSubtotal: 1 })
      .lean();

    successResponse(res, { campaigns }, "Active campaigns retrieved");
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/delivery/geocode/search?q=...
 * Throttled, cached forward geocoding proxy.
 */
export const geocodeSearch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { q } = geocodeSearchSchema.parse(req.query);
    const results = await deliveryService.geocodeSearch(q);
    successResponse(res, { results }, "Geocoding search completed");
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/delivery/geocode/reverse?lat=...&lng=...
 * Throttled, cached reverse geocoding proxy.
 */
export const geocodeReverse = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { lat, lng } = geocodeReverseSchema.parse(req.query);
    const result = await deliveryService.geocodeReverse(lat, lng);
    successResponse(res, { result }, "Reverse geocoding completed");
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/delivery/health
 * Health check & diagnostic counters for routing & geocoding.
 */
export const getDeliveryHealth = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const health = await deliveryService.healthCheck();
    const metrics = deliveryService.getCircuitBreakerMetrics();
    successResponse(res, { health, metrics }, "Delivery system diagnostics");
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/delivery/settings
 */
export const getDeliverySettings = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const settings = await DeliverySettings.getSettings();
    successResponse(res, { settings }, "Delivery settings retrieved");
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/delivery/settings
 */
export const updateDeliverySettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const parsed = updateDeliverySettingsSchema.parse(req.body);

    const settings = await DeliverySettings.getSettings();
    const oldSnapshot = settings.toObject();

    validateDeliverySettings({
      minFee: parsed.minFee ?? settings.minFee,
      includedKm: parsed.includedKm ?? settings.includedKm,
      includedDistanceFee: parsed.includedDistanceFee ?? settings.includedDistanceFee,
      perKmRate: parsed.perKmRate ?? settings.perKmRate,
      maxFee: parsed.maxFee !== undefined ? (parsed.maxFee ?? undefined) : settings.maxFee,
      maxDeliveryDistanceKm: parsed.maxDeliveryDistanceKm ?? settings.maxDeliveryDistanceKm,
      detourFactor: parsed.detourFactor ?? settings.detourFactor,
    });

    if (parsed.minFee !== undefined) settings.minFee = parsed.minFee;
    if (parsed.includedKm !== undefined) settings.includedKm = parsed.includedKm;
    if (parsed.includedDistanceFee !== undefined) settings.includedDistanceFee = parsed.includedDistanceFee;
    if (parsed.perKmRate !== undefined) settings.perKmRate = parsed.perKmRate;
    if (parsed.maxFee !== undefined) settings.maxFee = parsed.maxFee ?? undefined;
    if (parsed.maxDeliveryDistanceKm !== undefined) settings.maxDeliveryDistanceKm = parsed.maxDeliveryDistanceKm;
    if (parsed.detourFactor !== undefined) settings.detourFactor = parsed.detourFactor;
    settings.updatedBy = authReq.user._id;

    await settings.save();

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: "delivery_settings.updated",
      resourceType: "DeliverySettings",
      resourceId: settings._id as mongoose.Types.ObjectId,
      changes: [
        { field: "minFee", oldValue: oldSnapshot.minFee, newValue: settings.minFee },
        { field: "includedKm", oldValue: oldSnapshot.includedKm, newValue: settings.includedKm },
        { field: "perKmRate", oldValue: oldSnapshot.perKmRate, newValue: settings.perKmRate },
        { field: "maxDeliveryDistanceKm", oldValue: oldSnapshot.maxDeliveryDistanceKm, newValue: settings.maxDeliveryDistanceKm },
      ],
    });

    successResponse(res, { settings }, "Delivery settings updated successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/delivery/simulate
 * Simulates fee and campaign evaluation for the admin preview.
 */
export const simulateDelivery = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = simulateDeliverySchema.parse(req.body);
    let distanceKm = parsed.distanceKm;

    if (distanceKm === undefined && parsed.origin && parsed.destination) {
      const route = await deliveryService.route(parsed.origin, parsed.destination);
      distanceKm = route.distanceKm;
    }

    if (distanceKm === undefined) {
      distanceKm = 0;
    }

    const { itemsSubtotal, restaurantId } = parsed;

    const settings = await DeliverySettings.getSettings();
    const feeResult = calculateDeliveryFee({
      distanceKm,
      minFee: settings.minFee,
      includedKm: settings.includedKm,
      includedDistanceFee: settings.includedDistanceFee,
      perKmRate: settings.perKmRate,
      maxFee: settings.maxFee,
      maxDeliveryDistanceKm: settings.maxDeliveryDistanceKm,
    });

    const activeCampaigns = await DeliveryCampaign.find({
      isActive: true,
      isDeleted: false,
    }).lean();

    const campaignResult = matchDeliveryCampaign({
      restaurantId: restaurantId || "",
      itemsSubtotal,
      deliveryFeeOriginal: feeResult.fee,
      distanceKm,
      campaigns: activeCampaigns,
    });

    successResponse(
      res,
      {
        distanceKm,
        itemsSubtotal,
        feeOriginal: campaignResult.deliveryFeeOriginal,
        feeDiscount: campaignResult.deliveryFeeDiscount,
        feeCharged: campaignResult.deliveryFeeCharged,
        campaignApplied: campaignResult.snapshot,
        settingsUsed: {
          minFee: settings.minFee,
          includedKm: settings.includedKm,
          perKmRate: settings.perKmRate,
          maxFee: settings.maxFee,
        },
      },
      "Simulation completed",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/delivery/campaigns
 */
export const listDeliveryCampaigns = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isDeleted: false };
    if (req.query.status === "active") filter.isActive = true;
    if (req.query.status === "inactive") filter.isActive = false;

    const [campaigns, total] = await Promise.all([
      DeliveryCampaign.find(filter)
        .populate("createdBy", "firstName lastName email")
        .populate("restaurantIds", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DeliveryCampaign.countDocuments(filter),
    ]);

    successResponse(res, {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/delivery/campaigns
 */
export const createDeliveryCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const parsed = deliveryCampaignSchema.parse(req.body);

    const campaign = new DeliveryCampaign({
      ...parsed,
      restaurantIds: (parsed.restaurantIds || []).map((id) => new Types.ObjectId(id)),
      createdBy: authReq.user._id,
    });
    await campaign.save();

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: "delivery_campaign.created",
      resourceType: "DeliveryCampaign",
      resourceId: campaign._id as mongoose.Types.ObjectId,
      changes: [
        { field: "name", oldValue: null, newValue: campaign.name },
        { field: "minSubtotal", oldValue: null, newValue: campaign.minSubtotal },
      ],
    });

    successResponse(res, { campaign }, "Delivery campaign created successfully", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/delivery/campaigns/:id
 */
export const getDeliveryCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!Types.ObjectId.isValid(id)) throw new ValidationError("Invalid campaign ID format");

    const campaign = await DeliveryCampaign.findOne({
      _id: id,
      isDeleted: false,
    }).populate("restaurantIds", "name");

    if (!campaign) throw new NotFoundError("Delivery campaign not found");

    successResponse(res, { campaign });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/delivery/campaigns/:id
 */
export const updateDeliveryCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!Types.ObjectId.isValid(id)) throw new ValidationError("Invalid campaign ID format");

    const parsed = deliveryCampaignSchema.parse(req.body);

    const campaign = await DeliveryCampaign.findOne({ _id: id, isDeleted: false });
    if (!campaign) throw new NotFoundError("Delivery campaign not found");

    const oldName = campaign.name;
    Object.assign(campaign, parsed);
    if (parsed.restaurantIds) {
      campaign.restaurantIds = parsed.restaurantIds.map((rid) => new Types.ObjectId(rid)) as any;
    }
    campaign.updatedBy = authReq.user._id;
    await campaign.save();

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: "delivery_campaign.updated",
      resourceType: "DeliveryCampaign",
      resourceId: campaign._id as mongoose.Types.ObjectId,
      changes: [
        { field: "name", oldValue: oldName, newValue: campaign.name },
        { field: "minSubtotal", oldValue: null, newValue: campaign.minSubtotal },
      ],
    });

    successResponse(res, { campaign }, "Delivery campaign updated successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/delivery/campaigns/:id (Soft-delete)
 */
export const deleteDeliveryCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!Types.ObjectId.isValid(id)) throw new ValidationError("Invalid campaign ID format");

    const campaign = await DeliveryCampaign.findOne({ _id: id, isDeleted: false });
    if (!campaign) throw new NotFoundError("Delivery campaign not found");

    campaign.isDeleted = true;
    campaign.isActive = false;
    campaign.updatedBy = authReq.user._id;
    await campaign.save();

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: "delivery_campaign.deleted",
      resourceType: "DeliveryCampaign",
      resourceId: campaign._id as mongoose.Types.ObjectId,
      changes: [{ field: "isDeleted", oldValue: false, newValue: true }],
    });

    successResponse(res, null, "Delivery campaign deleted successfully");
  } catch (error) {
    next(error);
  }
};
