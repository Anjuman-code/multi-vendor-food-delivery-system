/**
 * Referral controller — users share referral codes; rewards on first order.
 */
import { Request, Response, NextFunction } from "express";
import Referral, { ReferralStatus } from "../models/Referral";
import CustomerProfile from "../models/CustomerProfile";
import { LoyaltyTransactionType } from "../models/LoyaltyTransaction";
import { successResponse } from "../utils/response.util";
import { AuthenticationError, NotFoundError, ValidationError } from "../utils/errors";
import type { AuthRequest } from "../types";

const generateCode = (): string => {
  return `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

/** POST /api/referrals — Generate a referral code for the authenticated user */
export const createReferralCode = async (
  req: Request, res: Response, next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const existing = await Referral.findOne({ referrerId: authReq.user._id });
    if (existing) {
      successResponse(res, { referral: existing });
      return;
    }

    const code = generateCode();
    const referral = await Referral.create({
      referrerId: authReq.user._id,
      referralCode: code,
      rewardType: req.body.rewardType || "points",
      rewardAmount: req.body.rewardAmount || 100,
    });

    successResponse(res, { referral }, "Referral code created", 201);
  } catch (error) {
    next(error);
  }
};

/** GET /api/referrals/mine — Get the user's referral code and stats */
export const getMyReferral = async (
  req: Request, res: Response, next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const referral = await Referral.findOne({ referrerId: authReq.user._id });
    if (!referral) {
      successResponse(res, { referral: null });
      return;
    }

    const completedCount = await Referral.countDocuments({
      referrerId: authReq.user._id,
      status: ReferralStatus.COMPLETED,
    });

    successResponse(res, { referral, completedReferrals: completedCount });
  } catch (error) {
    next(error);
  }
};

/** GET /api/referrals/validate/:code — Validate a referral code (public) */
export const validateReferralCode = async (
  req: Request, res: Response, next: NextFunction,
): Promise<void> => {
  try {
    const { code } = req.params;
    const referral = await Referral.findOne({
      referralCode: code.toUpperCase(),
    }).populate("referrerId", "firstName");

    if (!referral) throw new NotFoundError("Invalid referral code");

    successResponse(res, {
      valid: true,
      referrerName: (referral.referrerId as any)?.firstName || "A friend",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Called internally when a new user signs up with a referral code.
 * Updates the Referral document and sets referredBy on CustomerProfile.
 */
export const processReferralSignup = async (
  referralCode: string,
  newUserId: string,
): Promise<void> => {
  const referral = await Referral.findOne({
    referralCode: referralCode.toUpperCase(),
    status: ReferralStatus.PENDING,
  });
  if (!referral) return;

  referral.referredUserId = newUserId as any;
  referral.status = ReferralStatus.SIGNED_UP;
  await referral.save();

  await CustomerProfile.findOneAndUpdate(
    { userId: newUserId },
    { referredBy: referral.referrerId },
    { upsert: true },
  );
};

/**
 * Called internally when a user completes their first order.
 * Rewards both referrer and referred user.
 */
export const processReferralReward = async (userId: string): Promise<void> => {
  const profile = await CustomerProfile.findOne({ userId });
  if (!profile?.referredBy) return;

  const referral = await Referral.findOne({
    referredUserId: userId,
    status: ReferralStatus.SIGNED_UP,
  });
  if (!referral) return;

  referral.status = ReferralStatus.COMPLETED;

  // Reward referrer
  if (!referral.referrerRewarded) {
    if (referral.rewardType === "points") {
      await CustomerProfile.addLoyaltyPoints(
        referral.referrerId,
        referral.rewardAmount,
        LoyaltyTransactionType.BONUS,
        `Referral reward for inviting a friend`,
        referral._id,
      );
    }
    referral.referrerRewarded = true;
  }

  // Reward referred user
  if (!referral.referredRewarded) {
    if (referral.rewardType === "points") {
      await CustomerProfile.addLoyaltyPoints(
        userId as any,
        referral.rewardAmount,
        LoyaltyTransactionType.BONUS,
        `Welcome bonus from referral`,
        referral._id,
      );
    }
    referral.referredRewarded = true;
  }

  await referral.save();
};
