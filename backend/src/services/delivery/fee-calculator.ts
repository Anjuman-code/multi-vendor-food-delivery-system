/**
 * Pure, integer-safe fee calculator.
 *
 * Formula:
 * fee = max(minFee, includedDistanceFee + max(0, distanceKm − includedKm) × perKmRate)
 * rounded UP to whole Taka (Math.ceil), then capped at maxFee (if configured).
 *
 * Constraints:
 * - minFee can NEVER be below ৳10.
 * - fee can NEVER be below ৳10.
 * - distance must be finite and non-negative.
 * - distance > maxDeliveryDistanceKm throws OUT_OF_RANGE.
 */
import { ValidationError } from "../../utils/errors";

export interface FeeCalculationParams {
  distanceKm: number;
  minFee?: number;
  includedKm?: number;
  includedDistanceFee?: number;
  perKmRate?: number;
  maxFee?: number;
  maxDeliveryDistanceKm?: number;
}

export interface FeeCalculationResult {
  fee: number;
  distanceKm: number;
  isMinFeeApplied: boolean;
  isMaxFeeApplied: boolean;
}

export const MIN_FEE_FLOOR = 10;
export const DEFAULT_INCLUDED_KM = 1.0;
export const DEFAULT_INCLUDED_DISTANCE_FEE = 10;
export const DEFAULT_PER_KM_RATE = 10;
export const DEFAULT_MAX_DELIVERY_DISTANCE_KM = 15.0;

/**
 * Validates and normalizes delivery settings.
 * Ensures minFee is never less than 10.
 */
export function validateDeliverySettings(params: {
  minFee: number;
  includedKm: number;
  includedDistanceFee: number;
  perKmRate: number;
  maxFee?: number;
  maxDeliveryDistanceKm: number;
  detourFactor: number;
}): void {
  if (!Number.isFinite(params.minFee) || params.minFee < MIN_FEE_FLOOR) {
    throw new ValidationError(
      `Minimum delivery fee must be at least ৳${MIN_FEE_FLOOR}`,
    );
  }
  if (!Number.isFinite(params.includedKm) || params.includedKm < 0) {
    throw new ValidationError("Included distance cannot be negative");
  }
  if (
    !Number.isFinite(params.includedDistanceFee) ||
    params.includedDistanceFee < 0
  ) {
    throw new ValidationError("Included distance fee cannot be negative");
  }
  if (!Number.isFinite(params.perKmRate) || params.perKmRate < 0) {
    throw new ValidationError("Per-km rate cannot be negative");
  }
  if (
    params.maxFee != null &&
    (!Number.isFinite(params.maxFee) || params.maxFee < params.minFee)
  ) {
    throw new ValidationError(
      `Max fee (৳${params.maxFee}) cannot be less than min fee (৳${params.minFee})`,
    );
  }
  if (
    !Number.isFinite(params.maxDeliveryDistanceKm) ||
    params.maxDeliveryDistanceKm < 1
  ) {
    throw new ValidationError("Max delivery distance must be at least 1 km");
  }
  if (
    !Number.isFinite(params.detourFactor) ||
    params.detourFactor < 1.0 ||
    params.detourFactor > 3.0
  ) {
    throw new ValidationError("Detour factor must be between 1.0 and 3.0");
  }
}

/**
 * Calculates delivery fee from distance and fee parameters.
 */
export function calculateDeliveryFee(
  params: FeeCalculationParams,
): FeeCalculationResult {
  const { distanceKm } = params;

  if (
    typeof distanceKm !== "number" ||
    !Number.isFinite(distanceKm) ||
    distanceKm < 0
  ) {
    throw new ValidationError("Invalid distance: must be a non-negative number");
  }

  const maxDistance =
    params.maxDeliveryDistanceKm ?? DEFAULT_MAX_DELIVERY_DISTANCE_KM;
  if (distanceKm > maxDistance) {
    throw new ValidationError(
      `Distance (${distanceKm.toFixed(1)} km) exceeds maximum delivery radius of ${maxDistance} km`,
    );
  }

  const minFee = Math.max(MIN_FEE_FLOOR, params.minFee ?? MIN_FEE_FLOOR);
  const includedKm = params.includedKm ?? DEFAULT_INCLUDED_KM;
  const includedDistanceFee =
    params.includedDistanceFee ?? DEFAULT_INCLUDED_DISTANCE_FEE;
  const perKmRate = params.perKmRate ?? DEFAULT_PER_KM_RATE;

  // Extra distance beyond includedKm
  const extraKm = Math.max(0, distanceKm - includedKm);

  // Raw fee calculation before ceiling
  // Multiply in cents/hundredths to prevent floating point inaccuracies
  const rawExtraFee = Math.round(extraKm * perKmRate * 100) / 100;
  const rawFee = includedDistanceFee + rawExtraFee;

  // Round UP to whole Taka
  let fee = Math.ceil(rawFee);

  // Apply minimum fee floor
  if (fee < minFee) {
    fee = minFee;
  }

  // Absolute floor constraint: can NEVER undercut ৳10
  if (fee < MIN_FEE_FLOOR) {
    fee = MIN_FEE_FLOOR;
  }

  const isMinFeeApplied = fee === minFee;

  // Apply maximum fee cap if configured
  let isMaxFeeApplied = false;
  if (params.maxFee != null && Number.isFinite(params.maxFee)) {
    if (fee > params.maxFee) {
      fee = Math.max(minFee, Math.floor(params.maxFee));
      isMaxFeeApplied = true;
    }
  }

  return {
    fee,
    distanceKm: Math.round(distanceKm * 100) / 100,
    isMinFeeApplied,
    isMaxFeeApplied,
  };
}
