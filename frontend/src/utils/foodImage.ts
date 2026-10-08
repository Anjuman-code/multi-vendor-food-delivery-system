/**
 * Food Image Resolver — Runtime fuzzy matcher and fallback asset resolver.
 *
 * Rules:
 * 1. Precision over recall. A wrong photo is worse than a generic placeholder.
 * 2. Pure, synchronous, and memoized (sub-millisecond execution).
 * 3. Exact alias match -> Keyword-set match with excludes -> Bounded fuzzy match -> null.
 */

// eslint-disable-next-line no-restricted-imports
import {
  CANONICAL_FOOD_MANIFEST,
  GENERIC_FOOD_PLACEHOLDER,
  type CanonicalDish,
} from '../assets/foods/food-manifest.ts';
// eslint-disable-next-line no-restricted-imports
import { normalizeFoodName } from './foodNormalize.ts';

export interface FoodImageResolution {
  src: string;
  slug: string;
  displayName: string;
  confidence: number;
}

export interface ResolveOptions {
  minConfidence?: number;
}

// In-memory memoization cache (keyed by normalized name)
const RESOLUTION_CACHE = new Map<string, FoodImageResolution | null>();

// Pure generic / filler words that can NEVER match anything by themselves
const FORBIDDEN_SOLO_TOKENS = new Set([
  'chicken',
  'beef',
  'mutton',
  'fish',
  'rice',
  'special',
  'combo',
  'set',
  'menu',
  'platter',
  'box',
  'plate',
  'dish',
  'curry',
  'fry',
  'fried',
  'hot',
  'crispy',
  'spicy',
  'regular',
  'classic',
  'extra',
  'double',
]);

// Non-food items (beverages, generic condiments) that should never match food photos
const UNMATCHABLE_PATTERNS = [
  /\b(?:soft\s*drink|fresh\s*juice|juice|milkshake|shake|iced\s*tea|tea|cold\s*coffee|coffee|espresso|cappuccino|latte|smoothie|water|soda|coke|pepsi|7up|sprite|mountain\s*dew|fanta)\b/i,
  /\b(?:chutney|sauce|dressing|mayo|ketchup|raita|salad\s*bowl)\b/i,
  /\b(?:croissant|muffin|sandwich\s*bread|cookie)\b/i,
];

/**
 * Fast Levenshtein bounded edit distance.
 * Returns infinity if distance exceeds maxDist.
 */
function boundedLevenshtein(a: string, b: string, maxDist: number): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;

  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);

  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let minRow = curr[0];

    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < minRow) minRow = curr[j];
    }

    if (minRow > maxDist) return maxDist + 1;

    const temp = prev;
    prev = curr;
    curr = temp;
  }

  return prev[lb];
}

/**
 * Resolves a food item name to its canonical fallback image, or null if no confident match.
 */
export function resolveFoodImage(
  rawName: string | null | undefined,
  options?: ResolveOptions,
): FoodImageResolution | null {
  if (!rawName || typeof rawName !== 'string') return null;

  const minConfidence = options?.minConfidence ?? 0.85;

  const normalized = normalizeFoodName(rawName);
  if (!normalized || normalized.length < 2) return null;

  // Check memoized cache
  if (RESOLUTION_CACHE.has(normalized)) {
    const cached = RESOLUTION_CACHE.get(normalized)!;
    if (cached && cached.confidence < minConfidence) return null;
    return cached;
  }

  // Reject solo forbidden tokens (e.g. "Chicken", "Rice", "Special")
  if (FORBIDDEN_SOLO_TOKENS.has(normalized)) {
    RESOLUTION_CACHE.set(normalized, null);
    return null;
  }

  // Reject non-food beverages & condiments
  for (const regex of UNMATCHABLE_PATTERNS) {
    if (regex.test(normalized)) {
      RESOLUTION_CACHE.set(normalized, null);
      return null;
    }
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);

  // 1. Exact alias match (Check all dishes, sorted by priority)
  const sortedManifest = [...CANONICAL_FOOD_MANIFEST].sort((a, b) => b.priority - a.priority);

  for (const dish of sortedManifest) {
    for (const alias of dish.aliases) {
      if (normalized === alias || normalizeFoodName(alias) === normalized) {
        const result: FoodImageResolution = {
          src: dish.image,
          slug: dish.slug,
          displayName: dish.displayName,
          confidence: 1.0,
        };
        RESOLUTION_CACHE.set(normalized, result);
        return result;
      }
    }
  }

  // 2. Keyword-set match with exclusion checks
  let bestCandidate: { dish: CanonicalDish; confidence: number } | null = null;

  for (const dish of sortedManifest) {
    // Check excludes first
    let isExcluded = false;
    for (const exc of dish.excludeKeywords) {
      if (tokens.includes(exc) || normalized.includes(exc)) {
        isExcluded = true;
        break;
      }
    }
    if (isExcluded) continue;

    // Check keyword groups
    let matchedGroup: string[] | null = null;
    for (const group of dish.keywords) {
      const allPresent = group.every((kw) => {
        return tokens.some((t) => t === kw || t.startsWith(kw));
      });
      if (allPresent) {
        matchedGroup = group;
        break;
      }
    }

    if (matchedGroup) {
      // Calculate confidence based on matched keyword count and text length
      const matchedLength = matchedGroup.join(' ').length;
      const ratio = matchedLength / normalized.length;
      const confidence = Math.min(0.98, Math.max(0.85, 0.85 + ratio * 0.13));

      if (!bestCandidate || dish.priority > bestCandidate.dish.priority || confidence > bestCandidate.confidence) {
        bestCandidate = { dish, confidence };
      }
    }
  }

  if (bestCandidate && bestCandidate.confidence >= minConfidence) {
    const result: FoodImageResolution = {
      src: bestCandidate.dish.image,
      slug: bestCandidate.dish.slug,
      displayName: bestCandidate.dish.displayName,
      confidence: bestCandidate.confidence,
    };
    RESOLUTION_CACHE.set(normalized, result);
    return result;
  }

  // 3. Bounded Fuzzy Match on distinguishing tokens
  // Only applies to single or dual word items where edit distance is 1 or 2
  for (const dish of sortedManifest) {
    // Exclude check
    if (dish.excludeKeywords.some((exc) => tokens.includes(exc) || normalized.includes(exc))) {
      continue;
    }

    for (const group of dish.keywords) {
      // Must have same number of tokens or single keyword
      if (group.length === 1) {
        const targetKw = group[0];
        if (targetKw.length >= 5) {
          for (const token of tokens) {
            const maxAllowedDist = targetKw.length >= 7 ? 2 : 1;
            const dist = boundedLevenshtein(token, targetKw, maxAllowedDist);
            if (dist <= maxAllowedDist) {
              const confidence = Math.max(0.80, 0.90 - dist * 0.05);
              if (confidence >= minConfidence) {
                const result: FoodImageResolution = {
                  src: dish.image,
                  slug: dish.slug,
                  displayName: dish.displayName,
                  confidence,
                };
                RESOLUTION_CACHE.set(normalized, result);
                return result;
              }
            }
          }
        }
      }
    }
  }

  // No confident match
  RESOLUTION_CACHE.set(normalized, null);
  return null;
}

/**
 * Returns the default fallback neutral placeholder asset.
 */
export function getGenericFoodPlaceholder(): string {
  return GENERIC_FOOD_PLACEHOLDER;
}

/**
 * Resets the in-memory resolution cache (useful for testing).
 */
export function clearFoodImageCache(): void {
  RESOLUTION_CACHE.clear();
}
