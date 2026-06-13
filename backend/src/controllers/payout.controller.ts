/**
 * Payout controller — admin manages vendor settlement payouts.
 * Vendors can view their own payout history.
 */
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Payout, { PayoutStatus } from "../models/Payout";
import VendorProfile from "../models/VendorProfile";
import { createAuditLog } from "../utils/audit.util";
import { successResponse } from "../utils/response.util";
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import type { AuthRequest } from "../types";
import type { CreatePayoutInput, ProcessPayoutInput } from "../validations/payout.validation";

// ── Admin: Create Payout ─────────────────────────────────────────

/**
 * POST /api/admin/payouts
 * Create a new payout for a vendor. Decrements their pendingPayout.
 */
export const createPayout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const data = req.body as CreatePayoutInput;
    const vendorId = new mongoose.Types.ObjectId(data.vendorId);

    const vendor = await VendorProfile.findOne({ userId: vendorId });
    if (!vendor) throw new NotFoundError("Vendor profile not found");

    if (data.amount > vendor.pendingPayout) {
      throw new ValidationError(
        `Payout amount exceeds pending balance of ${vendor.pendingPayout}`,
      );
    }

    const payout = await Payout.create({
      vendorId,
      amount: data.amount,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      status: PayoutStatus.PENDING,
      method: data.method,
      bankSnapshot: vendor.bankDetails,
      orderCount: data.orderCount || 0,
      commissionTotal: data.commissionTotal || 0,
      notes: data.notes,
    });

    // Atomically decrement pending payout
    vendor.pendingPayout -= data.amount;
    await vendor.save();

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: "payout.created",
      resourceType: "Payout",
      resourceId: payout._id as mongoose.Types.ObjectId,
      changes: [
        { field: "amount", newValue: data.amount },
        { field: "vendorId", newValue: vendorId.toString() },
      ],
    });

    successResponse(res, { payout }, "Payout created", 201);
  } catch (error) {
    next(error);
  }
};

// ── Admin: List Payouts ──────────────────────────────────────────

/**
 * GET /api/admin/payouts
 * List all payouts with optional status filter.
 */
export const listPayouts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const status = req.query.status as string | undefined;
    const vendorId = req.query.vendorId as string | undefined;

    const filter: Record<string, unknown> = {};
    if (status && Object.values(PayoutStatus).includes(status as PayoutStatus)) {
      filter.status = status;
    }
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    const payouts = await Payout.find(filter)
      .populate("vendorId", "firstName lastName email")
      .sort("-createdAt");

    successResponse(res, { payouts, count: payouts.length });
  } catch (error) {
    next(error);
  }
};

// ── Admin: Get Payout Detail ─────────────────────────────────────

/**
 * GET /api/admin/payouts/:payoutId
 */
export const getPayout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const payout = await Payout.findById(req.params.payoutId)
      .populate("vendorId", "firstName lastName email");
    if (!payout) throw new NotFoundError("Payout not found");

    successResponse(res, { payout });
  } catch (error) {
    next(error);
  }
};

// ── Admin: Process Payout ────────────────────────────────────────

/**
 * PATCH /api/admin/payouts/:payoutId/process
 * Transition payout status (processing → completed / failed).
 */
export const processPayout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { status, transactionRef, notes } = req.body as ProcessPayoutInput;

    const payout = await Payout.findById(req.params.payoutId);
    if (!payout) throw new NotFoundError("Payout not found");

    const previousStatus = payout.status;

    if (status === "processing" && payout.status !== PayoutStatus.PENDING) {
      throw new ValidationError("Only pending payouts can be processed");
    }
    if (
      status === "completed" &&
      payout.status !== PayoutStatus.PROCESSING
    ) {
      throw new ValidationError("Only processing payouts can be completed");
    }
    if (status === "failed" && payout.status === PayoutStatus.COMPLETED) {
      throw new ValidationError("Completed payouts cannot be failed");
    }
    if (status === "failed" && payout.status === PayoutStatus.FAILED) {
      // Guard against re-failing — would restore pendingPayout a second time.
      throw new ValidationError("Payout has already failed");
    }

    payout.status = status as PayoutStatus;
    if (transactionRef) payout.transactionRef = transactionRef;
    if (notes) payout.notes = notes;
    payout.processedBy = authReq.user._id;
    payout.processedAt = new Date();
    await payout.save();

    // If payout failed, restore pending balance
    if (status === "failed") {
      const vendor = await VendorProfile.findOne({ userId: payout.vendorId });
      if (vendor) {
        vendor.pendingPayout += payout.amount;
        await vendor.save();
      }
    }

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: `payout.${status}`,
      resourceType: "Payout",
      resourceId: payout._id as mongoose.Types.ObjectId,
      changes: [
        { field: "status", oldValue: previousStatus, newValue: status },
      ],
    });

    successResponse(res, { payout }, `Payout ${status}`);
  } catch (error) {
    next(error);
  }
};

// ── Vendor: My Payouts ───────────────────────────────────────────

/**
 * GET /api/vendor/payouts
 * List payouts for the authenticated vendor.
 */
export const getVendorPayouts = async (
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
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = { vendorId: authReq.user._id };
    if (status && Object.values(PayoutStatus).includes(status as PayoutStatus)) {
      filter.status = status;
    }

    const [payouts, total] = await Promise.all([
      Payout.find(filter)
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(limit),
      Payout.countDocuments(filter),
    ]);

    successResponse(res, {
      payouts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};
