/**
 * Delivery Campaign Matcher Engine.
 *
 * Rules:
 * - Free delivery is evaluated per sub-order on that restaurant's items subtotal.
 * - Out of all matching active campaigns, the best one applies (largest waiver).
 * - No stacking.
 */
import { IDeliveryCampaign } from "../../models/DeliveryCampaign";

export interface MatchCampaignInput {
  restaurantId: string;
  itemsSubtotal: number;
  deliveryFeeOriginal: number;
  distanceKm: number;
  campaigns: Array<IDeliveryCampaign & { _id?: unknown }>;
  now?: Date;
}

export interface MatchedCampaignResult {
  bestCampaign: (IDeliveryCampaign & { _id?: unknown }) | null;
  deliveryFeeOriginal: number;
  deliveryFeeDiscount: number;
  deliveryFeeCharged: number;
  snapshot: {
    campaignId?: string;
    name?: string;
    label?: string;
    waivedAmount?: number;
  } | null;
}

export function matchDeliveryCampaign(
  input: MatchCampaignInput,
): MatchedCampaignResult {
  const {
    restaurantId,
    itemsSubtotal,
    deliveryFeeOriginal,
    distanceKm,
    campaigns,
    now = new Date(),
  } = input;

  const validCampaigns: Array<{
    campaign: IDeliveryCampaign & { _id?: unknown };
    waivedAmount: number;
  }> = [];

  for (const campaign of campaigns) {
    if (!campaign.isActive || campaign.isDeleted) continue;

    // Check date window
    if (campaign.startsAt && new Date(campaign.startsAt) > now) continue;
    if (campaign.endsAt && new Date(campaign.endsAt) < now) continue;

    // Check minimum subtotal threshold
    if (itemsSubtotal < campaign.minSubtotal) continue;

    // Check restaurant scope (empty means platform-wide / all restaurants)
    if (
      campaign.restaurantIds &&
      campaign.restaurantIds.length > 0 &&
      !campaign.restaurantIds.some((id) => id.toString() === restaurantId)
    ) {
      continue;
    }

    // Check distance ceiling if configured
    if (
      campaign.maxDistanceKm != null &&
      Number.isFinite(campaign.maxDistanceKm) &&
      distanceKm > campaign.maxDistanceKm
    ) {
      continue;
    }

    // Compute waiver amount for this campaign
    const maxWaiver =
      campaign.maxWaivedAmount != null && Number.isFinite(campaign.maxWaivedAmount)
        ? Math.min(deliveryFeeOriginal, campaign.maxWaivedAmount)
        : deliveryFeeOriginal;

    const waivedAmount = Math.max(0, maxWaiver);
    validCampaigns.push({ campaign, waivedAmount });
  }

  if (validCampaigns.length === 0) {
    return {
      bestCampaign: null,
      deliveryFeeOriginal,
      deliveryFeeDiscount: 0,
      deliveryFeeCharged: deliveryFeeOriginal,
      snapshot: null,
    };
  }

  // Best match wins (largest waiver amount; ties broken by earliest created/startsAt)
  validCampaigns.sort((a, b) => b.waivedAmount - a.waivedAmount);
  const best = validCampaigns[0];

  const deliveryFeeDiscount = best.waivedAmount;
  const deliveryFeeCharged = Math.max(0, deliveryFeeOriginal - deliveryFeeDiscount);

  const campaignId =
    best.campaign._id != null ? String(best.campaign._id) : undefined;

  return {
    bestCampaign: best.campaign,
    deliveryFeeOriginal,
    deliveryFeeDiscount,
    deliveryFeeCharged,
    snapshot: {
      campaignId,
      name: best.campaign.name,
      label: best.campaign.label,
      waivedAmount: deliveryFeeDiscount,
    },
  };
}
