import React, { memo } from "react";
import { X, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import type { FilterState } from "@/hooks/useMenuExplorer";

export interface ActiveFilterChipsProps {
  filters: FilterState;
  priceBounds: { min: number; max: number };
  onRemoveSearch: () => void;
  onRemoveCategory: (category: string) => void;
  onRemovePrice: () => void;
  onRemoveRating: () => void;
  onRemoveOpenNow: () => void;
  onRemoveDietary: (tag: string) => void;
  onRemoveRestaurant: (id: string) => void;
  onRemoveCuisine: (cuisine: string) => void;
  onClearAll: () => void;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = memo(
  ({
    filters,
    priceBounds,
    onRemoveSearch,
    onRemoveCategory,
    onRemovePrice,
    onRemoveRating,
    onRemoveOpenNow,
    onRemoveDietary,
    onRemoveRestaurant,
    onRemoveCuisine,
    onClearAll,
  }) => {
    const hasActivePrice =
      (filters.minPrice !== undefined && filters.minPrice > priceBounds.min) ||
      (filters.maxPrice !== undefined && filters.maxPrice < priceBounds.max);

    const hasAnyFilter =
      Boolean(filters.search) ||
      filters.categories.length > 0 ||
      hasActivePrice ||
      Boolean(filters.minRating) ||
      filters.openNow ||
      filters.dietaryTags.length > 0 ||
      filters.restaurantIds.length > 0 ||
      filters.cuisines.length > 0;

    if (!hasAnyFilter) return null;

    return (
      <div className="flex flex-wrap items-center gap-1.5 py-2 px-4 sm:px-6">
        <span className="text-xs font-medium text-gray-400 mr-1">
          Active filters:
        </span>

        {/* Search Query Chip */}
        {filters.search && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-brand-50 border border-brand-200 text-brand-700">
            <span>Query: "{filters.search}"</span>
            <button
              type="button"
              onClick={onRemoveSearch}
              className="p-0.5 rounded-full hover:bg-brand-100 text-brand-700 transition-colors"
              aria-label="Remove search filter"
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          </span>
        )}

        {/* Category Chips */}
        {filters.categories.map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-100 border border-gray-200 text-gray-800"
          >
            <span>{cat}</span>
            <button
              type="button"
              onClick={() => onRemoveCategory(cat)}
              className="p-0.5 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
              aria-label={`Remove ${cat} category filter`}
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          </span>
        ))}

        {/* Price Range Chip */}
        {hasActivePrice && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-100 border border-gray-200 text-gray-800">
            <span>
              Price: {formatCurrency(filters.minPrice ?? priceBounds.min)} -{" "}
              {formatCurrency(filters.maxPrice ?? priceBounds.max)}
            </span>
            <button
              type="button"
              onClick={onRemovePrice}
              className="p-0.5 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
              aria-label="Remove price filter"
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          </span>
        )}

        {/* Min Rating Chip */}
        {filters.minRating && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-amber-50 border border-amber-200 text-amber-800">
            <span>⭐ {filters.minRating}+ Stars</span>
            <button
              type="button"
              onClick={onRemoveRating}
              className="p-0.5 rounded-full hover:bg-amber-100 text-amber-800 transition-colors"
              aria-label="Remove rating filter"
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          </span>
        )}

        {/* Open Now Chip */}
        {filters.openNow && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span>🟢 Open Now</span>
            <button
              type="button"
              onClick={onRemoveOpenNow}
              className="p-0.5 rounded-full hover:bg-emerald-100 text-emerald-800 transition-colors"
              aria-label="Remove Open Now filter"
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          </span>
        )}

        {/* Dietary Tag Chips */}
        {filters.dietaryTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-green-50 border border-green-200 text-green-800 capitalize"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => onRemoveDietary(tag)}
              className="p-0.5 rounded-full hover:bg-green-100 text-green-800 transition-colors"
              aria-label={`Remove ${tag} filter`}
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          </span>
        ))}

        {/* Restaurant Chips */}
        {filters.restaurantIds.map((rId) => (
          <span
            key={rId}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-purple-50 border border-purple-200 text-purple-800"
          >
            <span>Restaurant selected</span>
            <button
              type="button"
              onClick={() => onRemoveRestaurant(rId)}
              className="p-0.5 rounded-full hover:bg-purple-100 text-purple-800 transition-colors"
              aria-label="Remove restaurant filter"
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          </span>
        ))}

        {/* Cuisine Chips */}
        {filters.cuisines.map((cuisine) => (
          <span
            key={cuisine}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-100 border border-gray-200 text-gray-800 capitalize"
          >
            <span>{cuisine}</span>
            <button
              type="button"
              onClick={() => onRemoveCuisine(cuisine)}
              className="p-0.5 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
              aria-label={`Remove ${cuisine} cuisine filter`}
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          </span>
        ))}

        {/* Clear All Button */}
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors ml-1"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear all</span>
        </button>
      </div>
    );
  },
);

ActiveFilterChips.displayName = "ActiveFilterChips";
