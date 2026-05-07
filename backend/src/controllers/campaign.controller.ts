/**
 * Campaign controller — admin manages platform-level promotional campaigns.
 */
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Campaign from "../models/Campaign";
import { createAuditLog } from "../utils/audit.util";
import { successResponse } from "../utils/response.util";
import { AuthenticationError, NotFoundError, ValidationError } from "../utils/errors";
import type { AuthRequest } from "../types";

/** POST /api/admin/campaigns */
export const createCampaign = async (
  req: Request, res: Response, next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const campaign = await Campaign.create(req.body);

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: "campaign.created",
      resourceType: "Campaign",
      resourceId: campaign._id,
      changes: [{ field: "name", newValue: campaign.name }],
    });

    successResponse(res, { campaign }, "Campaign created", 201);
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/campaigns */
export const listCampaigns = async (
  req: Request, res: Response, next: NextFunction,
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.isActive === "true") filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;

    const campaigns = await Campaign.find(filter).sort("-createdAt");
    successResponse(res, { campaigns, count: campaigns.length });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/admin/campaigns/:id */
export const updateCampaign = async (
  req: Request, res: Response, next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!campaign) throw new NotFoundError("Campaign not found");

    successResponse(res, { campaign }, "Campaign updated");
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/admin/campaigns/:id — deactivate */
export const deleteCampaign = async (
  req: Request, res: Response, next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );
    if (!campaign) throw new NotFoundError("Campaign not found");

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: "campaign.deactivated",
      resourceType: "Campaign",
      resourceId: campaign._id,
      changes: [{ field: "isActive", oldValue: true, newValue: false }],
    });

    successResponse(res, null, "Campaign deactivated");
  } catch (error) {
    next(error);
  }
};

/**
 * Find and apply active campaigns for an order. Exported for the order controller.
 * Returns total discount from auto-applied campaigns.
 */
export const applyCampaigns = async (
  userId: string,
  restaurantId: string,
  subtotal: number,
  isFirstOrder: boolean,
  userTier: string,
): Promise<{ discount: number; appliedCampaignIds: string[] }> => {
  const now = new Date();
  const campaigns = await Campaign.find({
    isActive: true,
    "schedule.start": { $lte: now },
    "schedule.end": { $gte: now },
  });

  let totalDiscount = 0;
  const appliedIds: string[] = [];

  for (const c of campaigns) {
    // Check budget
    if (c.budget.total > 0 && c.budget.used >= c.budget.total) continue;

    // Check restaurant eligibility
    if (
      c.rules.applicableRestaurants.length > 0 &&
      !c.rules.applicableRestaurants.some((id) => id.toString() === restaurantId)
    ) continue;

    // Check user tier
    if (
      c.rules.userTiers.length > 0 &&
      !c.rules.userTiers.includes(userTier)
    ) continue;

    // Check first order only
    if (c.rules.firstOrderOnly && !isFirstOrder) continue;

    // Check min order
    if (subtotal < c.rules.minOrderAmount) continue;

    // Check per-user limit
    if (c.rules.maxPerUser > 0) {
      const userRedeemed = c.redemptions.filter(
        (r) => r.userId.toString() === userId,
      ).length;
      if (userRedeemed >= c.rules.maxPerUser) continue;
    }

    // Check campaign-level cap
    if (c.rules.maxRedemptions > 0 && c.redemptions.length >= c.rules.maxRedemptions) continue;

    // Compute discount
    let discount = 0;
    if (c.type === "free_delivery") {
      discount = 0; // handled separately by delivery fee logic
    } else if (c.rules.discountType === "percentage") {
      discount = Math.min(
        (subtotal * c.rules.discountValue) / 100,
        c.rules.maxDiscount ?? Infinity,
      );
    } else {
      discount = Math.min(c.rules.discountValue, subtotal);
    }

    totalDiscount += discount;
    appliedIds.push(c._id as string);
  }

  return { discount: totalDiscount, appliedCampaignIds: appliedIds };
};
