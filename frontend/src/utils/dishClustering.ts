import type { ExploreMenuItem } from "@/services/exploreService";
import type { ClusteredDish, DishVendorOption } from "@/types/dishGrouping.types";
import { normalizeFoodName } from "@/utils/foodNormalize";
import { resolveFoodImage } from "@/utils/foodImage";

/**
 * Derives a consistent cluster key for a menu item.
 * Uses canonical food resolution slug or normalized food title.
 */
export function getDishClusterKey(item: ExploreMenuItem): string {
  // If canonical resolution matched with high confidence, use canonical slug
  const resolution = resolveFoodImage(item.name);
  if (resolution && resolution.confidence >= 0.8) {
    return `canonical:${resolution.slug}`;
  }

  // Fallback to normalized food name
  const normalized = normalizeFoodName(item.name);
  if (normalized.length >= 3) {
    return `norm:${normalized}`;
  }

  // Strict fallback to trimmed lowercased name
  return `raw:${item.name.trim().toLowerCase()}`;
}

/**
 * Clusters a flat list of menu items by dish similarity across multiple vendors.
 */
export function clusterMenuItems(items: ExploreMenuItem[]): ClusteredDish[] {
  const clustersMap = new Map<string, ExploreMenuItem[]>();

  for (const item of items) {
    const key = getDishClusterKey(item);
    if (!clustersMap.has(key)) {
      clustersMap.set(key, []);
    }
    clustersMap.get(key)!.push(item);
  }

  const result: ClusteredDish[] = [];

  for (const [clusterKey, clusterItems] of clustersMap.entries()) {
    if (clusterItems.length === 0) continue;

    // Sort items within cluster:
    // 1. Available & open first
    // 2. Highest restaurant rating
    // 3. Highest review count
    // 4. Lowest delivery time
    const sorted = [...clusterItems].sort((a, b) => {
      const aAvail = a.isAvailable && a.isOpen ? 1 : 0;
      const bAvail = b.isAvailable && b.isOpen ? 1 : 0;
      if (aAvail !== bAvail) return bAvail - aAvail;

      const aRating = a.rating || 0;
      const bRating = b.rating || 0;
      if (bRating !== aRating) return bRating - aRating;

      const aReviews = a.reviewCount || 0;
      const bReviews = b.reviewCount || 0;
      if (bReviews !== aReviews) return bReviews - aReviews;

      return (a.deliveryTime?.min || 99) - (b.deliveryTime?.min || 99);
    });

    const primaryItem = sorted[0];

    // Compute price range
    const prices = sorted.map((i) => i.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Aggregate unique dietary tags
    const dietaryTagsSet = new Set<string>();
    for (const item of sorted) {
      for (const tag of item.dietaryTags || []) {
        dietaryTagsSet.add(tag);
      }
    }

    // Convert items to vendor options (de-duping by restaurantId in case same restaurant has identical dish)
    const seenRestaurants = new Set<string>();
    const vendors: DishVendorOption[] = [];

    for (const item of sorted) {
      if (seenRestaurants.has(item.restaurantId)) continue;
      seenRestaurants.add(item.restaurantId);

      vendors.push({
        item,
        restaurantId: item.restaurantId,
        restaurantName: item.restaurantName,
        restaurantSlug: item.restaurantSlug,
        price: item.price,
        originalPrice: item.originalPrice,
        rating: item.rating || 0,
        reviewCount: item.reviewCount || 0,
        deliveryTime: item.deliveryTime || { min: 20, max: 35 },
        deliveryFee: item.deliveryFee || 30,
        isOpen: Boolean(item.isOpen),
        isPopular: Boolean(item.isPopular),
        variants: item.variants || [],
        addons: item.addons || [],
      });
    }

    // Choose cleanest display name
    // Prefer resolution display name or primary item name
    const resolution = resolveFoodImage(primaryItem.name);
    const displayName =
      resolution && resolution.confidence >= 0.85
        ? resolution.displayName
        : primaryItem.name;

    result.push({
      clusterKey,
      name: displayName,
      normalizedName: normalizeFoodName(primaryItem.name),
      categoryName: primaryItem.categoryName || "Other",
      image: primaryItem.image,
      description: primaryItem.description || "",
      dietaryTags: Array.from(dietaryTagsSet),
      minPrice,
      maxPrice,
      hasPriceRange: minPrice !== maxPrice,
      vendorCount: vendors.length,
      primaryItem,
      vendors,
    });
  }

  return result;
}
