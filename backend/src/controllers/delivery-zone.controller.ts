/**
 * DeliveryZone controller — vendors manage their zone; order flow validates against it.
 */
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import DeliveryZone from "../models/DeliveryZone";
import VendorProfile from "../models/VendorProfile";
import { createAuditLog } from "../utils/audit.util";
import { successResponse } from "../utils/response.util";
import { AuthenticationError, NotFoundError, ValidationError } from "../utils/errors";
import type { AuthRequest } from "../types";
import type { CreateDeliveryZoneInput, UpdateDeliveryZoneInput } from "../validations/delivery-zone.validation";

const getVendorRestaurantIds = async (req: Request) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) throw new AuthenticationError();
  const profile = await VendorProfile.findOne({ userId: authReq.user._id });
  if (!profile) throw new NotFoundError("Vendor profile not found");
  return { authReq, profile, restaurantIds: profile.restaurantIds };
};

/** POST /api/vendor/delivery-zone — Create or replace a zone */
export const upsertZone = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { authReq, restaurantIds } = await getVendorRestaurantIds(req);
    const data = req.body as CreateDeliveryZoneInput;

    if (!restaurantIds.some((id) => id.toString() === data.restaurantId)) {
      throw new ValidationError("You do not own this restaurant");
    }

    const zone = await DeliveryZone.findOneAndUpdate(
      { restaurantId: data.restaurantId },
      {
        restaurantId: new mongoose.Types.ObjectId(data.restaurantId),
        type: data.type,
        center: data.center,
        radiusKm: data.radiusKm,
        polygon: data.polygon,
        districts: data.districts || [],
        feeTiers: data.feeTiers || [],
        isActive: data.isActive ?? true,
        minimumOrder: data.minimumOrder || 0,
      },
      { upsert: true, new: true, runValidators: true },
    );

    await createAuditLog({
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
      action: "delivery_zone.upserted",
      resourceType: "DeliveryZone",
      resourceId: zone._id,
      changes: [{ field: "type", newValue: data.type }],
    });

    successResponse(res, { zone }, "Delivery zone saved", 201);
  } catch (error) {
    next(error);
  }
};

/** GET /api/vendor/delivery-zone/:restaurantId */
export const getZone = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantIds } = await getVendorRestaurantIds(req);
    const { restaurantId } = req.params;

    if (!restaurantIds.some((id) => id.toString() === restaurantId)) {
      throw new ValidationError("You do not own this restaurant");
    }

    const zone = await DeliveryZone.findOne({ restaurantId });
    successResponse(res, { zone: zone || null });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/vendor/delivery-zone/:restaurantId */
export const deleteZone = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { restaurantIds } = await getVendorRestaurantIds(req);
    const { restaurantId } = req.params;

    if (!restaurantIds.some((id) => id.toString() === restaurantId)) {
      throw new ValidationError("You do not own this restaurant");
    }

    const zone = await DeliveryZone.findOneAndDelete({ restaurantId });
    if (!zone) throw new NotFoundError("Delivery zone not found");

    successResponse(res, null, "Delivery zone deleted");
  } catch (error) {
    next(error);
  }
};

/**
 * Compute delivery fee from a zone and customer coordinates.
 * Exported so the order controller can use it.
 */
export const computeDeliveryFee = async (
  restaurantId: string,
  latitude: number,
  longitude: number,
  orderSubtotal: number,
): Promise<{ fee: number; minimumOrder: number }> => {
  const zone = await DeliveryZone.findOne({
    restaurantId,
    isActive: true,
  });

  if (!zone) {
    // Fallback: use Restaurant.deliveryFee later in caller
    return { fee: -1, minimumOrder: 0 };
  }

  if (zone.minimumOrder > 0 && orderSubtotal < zone.minimumOrder) {
    throw new ValidationError(
      `Minimum order for this delivery zone is ${zone.minimumOrder}`,
    );
  }

  // Compute distance based on zone type
  let distanceKm = 0;

  if (zone.type === "radius" && zone.center && zone.radiusKm != null) {
    distanceKm = haversineDistance(
      latitude,
      longitude,
      zone.center.coordinates[1],
      zone.center.coordinates[0],
    );
    if (distanceKm > zone.radiusKm) {
      throw new ValidationError("Delivery address is outside the delivery zone");
    }
  } else if (zone.type === "district" && zone.districts?.length) {
    // District matching is done by the caller passing the district
    // For now, skip distance check — districts are validated by name elsewhere
  }

  // Find matching fee tier
  if (zone.feeTiers.length > 0) {
    const sorted = [...zone.feeTiers].sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);
    for (const tier of sorted) {
      if (distanceKm <= tier.maxDistanceKm) {
        if (tier.minOrderForFree && orderSubtotal >= tier.minOrderForFree) {
          return { fee: 0, minimumOrder: zone.minimumOrder };
        }
        return { fee: tier.fee, minimumOrder: zone.minimumOrder };
      }
    }
    // If beyond all tiers, use the last one
    const last = sorted[sorted.length - 1];
    return { fee: last.fee, minimumOrder: zone.minimumOrder };
  }

  return { fee: -1, minimumOrder: zone.minimumOrder };
};

/** Haversine distance in km between two lat/lng points */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
