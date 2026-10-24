import React, { memo, useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  Flame,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Store,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InteractiveCard,
  InteractiveCardAction,
  InteractiveCardLink,
} from "@/components/ui/InteractiveCard";
import type { ClusteredDish } from "@/types/dishGrouping.types";
import type { ExploreMenuItem } from "@/services/exploreService";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";
import { FoodImage } from "@/components/ui/FoodImage";

export interface ClusteredFoodCardProps {
  dish: ClusteredDish;
  cartQuantity?: number;
  onAddToCart?: (item: ExploreMenuItem) => Promise<void> | void;
  onUpdateQuantity?: (
    item: ExploreMenuItem,
    newQuantity: number,
  ) => Promise<void> | void;
  onOpenQuickView?: (item: ExploreMenuItem) => void;
  onOpenVendorSelection: (dish: ClusteredDish) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (restaurantId: string) => void;
}

const DIETARY_TAG_COLORS: Record<string, { bg: string; text: string }> = {
  halal: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  vegetarian: { bg: "bg-green-50 border-green-200", text: "text-green-700" },
  vegan: { bg: "bg-lime-50 border-lime-200", text: "text-lime-700" },
  gluten_free: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
  "gluten-free": { bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
  spicy: { bg: "bg-red-50 border-red-200", text: "text-red-700" },
};

export const ClusteredFoodCard: React.FC<ClusteredFoodCardProps> = memo(
  ({
    dish,
    cartQuantity = 0,
    onAddToCart,
    onUpdateQuantity,
    onOpenQuickView,
    onOpenVendorSelection,
    isFavorite = false,
    onToggleFavorite,
  }) => {
    const [isMutating, setIsMutating] = useState(false);

    const primaryItem = dish.primaryItem;
    const isMultiVendor = dish.vendorCount > 1;

    const hasOptions = useMemo(() => {
      const hasVariants = Boolean(
        primaryItem.variants && primaryItem.variants.length > 0,
      );
      const hasRequiredAddons = Boolean(
        primaryItem.addons && primaryItem.addons.some((a) => a.isRequired),
      );
      return hasVariants || hasRequiredAddons;
    }, [primaryItem.variants, primaryItem.addons]);

    const isAvailable =
      primaryItem.isAvailable &&
      primaryItem.stockStatus !== "out_of_stock" &&
      primaryItem.isOpen;

    // Handle add to cart click
    const handleAddClick = useCallback(async () => {
      if (!isAvailable || isMutating) return;

      // If multi-vendor with price range or options, prompt vendor sheet
      if (isMultiVendor && dish.hasPriceRange) {
        onOpenVendorSelection(dish);
        return;
      }

      if (hasOptions) {
        onOpenQuickView?.(primaryItem);
        return;
      }

      setIsMutating(true);
      try {
        await onAddToCart?.(primaryItem);
      } finally {
        setIsMutating(false);
      }
    }, [
      isAvailable,
      isMutating,
      isMultiVendor,
      dish,
      onOpenVendorSelection,
      hasOptions,
      onOpenQuickView,
      primaryItem,
      onAddToCart,
    ]);

    // Handle stepper update
    const handleQuantityChange = useCallback(
      async (newQty: number) => {
        if (isMutating) return;
        setIsMutating(true);
        try {
          await onUpdateQuantity?.(primaryItem, newQty);
        } finally {
          setIsMutating(false);
        }
      },
      [isMutating, onUpdateQuantity, primaryItem],
    );

    return (
      <InteractiveCard
        className={cn(
          "group relative flex flex-col h-full bg-white rounded-2xl border border-gray-200/90 hover:border-brand-500/40 hover:shadow-lg transition-all duration-200 overflow-hidden",
          !isAvailable && "opacity-75 grayscale-[20%]",
        )}
      >
        {/* Media Container (4:3 aspect ratio) */}
        <div className="relative aspect-4/3 w-full bg-gray-100 overflow-hidden">
          <FoodImage
            src={dish.image}
            name={dish.name}
            alt={dish.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Multi-Vendor Pill Overlay */}
          {isMultiVendor ? (
            <InteractiveCardAction className="absolute top-2.5 left-2.5 z-10">
              <button
                type="button"
                onClick={() => onOpenVendorSelection(dish)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-900/85 backdrop-blur-md text-white text-[11px] font-bold shadow-md hover:bg-black transition-colors"
                title={`${dish.vendorCount} restaurants offer this dish`}
              >
                <Layers className="w-3 h-3 text-brand-400" />
                <span>{dish.vendorCount} restaurants</span>
              </button>
            </InteractiveCardAction>
          ) : (
            primaryItem.isPopular && (
              <div className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/95 backdrop-blur-xs text-white text-[11px] font-bold shadow-xs">
                <Flame className="w-3 h-3 fill-white" />
                <span>Popular</span>
              </div>
            )
          )}

          {/* Favorite Action Button */}
          {onToggleFavorite && (
            <InteractiveCardAction className="absolute top-2.5 right-2.5 z-10">
              <button
                type="button"
                onClick={() => onToggleFavorite(primaryItem.restaurantId)}
                className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-600 hover:text-rose-500 hover:bg-white shadow-sm transition-all duration-150 min-h-[44px] min-w-[44px]"
                aria-label={`Favorite ${primaryItem.restaurantName}`}
              >
                <Heart
                  className={cn(
                    "w-4 h-4 transition-transform active:scale-125",
                    isFavorite
                      ? "fill-rose-500 text-rose-500"
                      : "text-gray-500 hover:text-rose-500",
                  )}
                />
              </button>
            </InteractiveCardAction>
          )}

          {/* Out of Stock Overlay */}
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 text-center">
              <span className="px-3 py-1.5 rounded-xl bg-white text-gray-900 text-xs font-bold shadow-md">
                Currently Unavailable
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
          {/* Stretched Primary Link: Item Title */}
          <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-1 mb-1">
            <InteractiveCardLink
              to={`/menu/${primaryItem.restaurantId}/${primaryItem._id}`}
              className="text-gray-900 group-hover:text-brand-600 transition-colors"
            >
              {dish.name}
            </InteractiveCardLink>
          </h3>

          {/* Restaurant & Rating Row */}
          <div className="flex items-center justify-between gap-2 text-xs mb-2">
            <InteractiveCardAction className="truncate">
              {isMultiVendor ? (
                <button
                  type="button"
                  onClick={() => onOpenVendorSelection(dish)}
                  className="font-medium text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1 truncate text-xs"
                >
                  <Store className="w-3 h-3 flex-shrink-0 text-brand-500" />
                  <span className="truncate">
                    Top pick: {primaryItem.restaurantName}
                  </span>
                </button>
              ) : (
                <Link
                  to={`/restaurants/${primaryItem.restaurantId}`}
                  className="font-medium text-gray-500 hover:text-brand-600 transition-colors inline-flex items-center gap-1 truncate"
                  title={primaryItem.restaurantName}
                >
                  <Store className="w-3 h-3 flex-shrink-0 text-gray-400" />
                  <span className="truncate">{primaryItem.restaurantName}</span>
                </Link>
              )}
            </InteractiveCardAction>

            {primaryItem.rating > 0 && (
              <div className="flex items-center gap-1 font-semibold text-gray-700 flex-shrink-0 text-xs">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{primaryItem.rating.toFixed(1)}</span>
                {primaryItem.reviewCount > 0 && (
                  <span className="text-[11px] text-gray-400 font-normal">
                    ({primaryItem.reviewCount})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {dish.description ? (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2 flex-1">
              {dish.description}
            </p>
          ) : (
            <div className="flex-1" />
          )}

          {/* Dietary & Meta row */}
          <div className="flex items-center flex-wrap gap-1.5 mb-3 text-[11px]">
            {dish.dietaryTags.slice(0, 3).map((tag) => {
              const style =
                DIETARY_TAG_COLORS[tag.toLowerCase()] || {
                  bg: "bg-gray-100 border-gray-200",
                  text: "text-gray-600",
                };
              return (
                <span
                  key={tag}
                  className={cn(
                    "px-2 py-0.5 rounded-full font-medium border capitalize",
                    style.bg,
                    style.text,
                  )}
                >
                  {tag}
                </span>
              );
            })}

            {primaryItem.preparationTime > 0 && (
              <span className="inline-flex items-center gap-1 text-gray-400 ml-auto">
                <Clock className="w-3 h-3" />
                {primaryItem.preparationTime}m
              </span>
            )}
          </div>

          {/* Bottom Row: Price & Cart Action */}
          <div className="mt-auto flex items-center justify-between gap-2 pt-2.5 border-t border-gray-100">
            {/* Price */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                {dish.hasPriceRange ? (
                  <>
                    <span className="text-xs text-gray-400 font-medium">from</span>
                    <span className="text-base sm:text-lg font-extrabold text-gray-900">
                      {formatCurrency(dish.minPrice)}
                    </span>
                  </>
                ) : (
                  <span className="text-base sm:text-lg font-extrabold text-gray-900">
                    {formatCurrency(dish.minPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions: Multi-vendor choose button OR direct add */}
            <InteractiveCardAction>
              {isMultiVendor ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenVendorSelection(dish)}
                  className="rounded-xl border-brand-200 bg-brand-50/50 hover:bg-brand-500 hover:text-white text-brand-700 font-bold text-xs h-9 px-3 transition-colors shadow-xs"
                >
                  <span>{dish.vendorCount} options</span>
                </Button>
              ) : cartQuantity > 0 ? (
                <div className="inline-flex items-center gap-1 bg-white border border-brand-500 rounded-xl p-0.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(cartQuantity - 1)}
                    disabled={isMutating}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-600 hover:bg-brand-50 active:scale-95 transition-all disabled:opacity-50"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-gray-900">
                    {cartQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(cartQuantity + 1)}
                    disabled={isMutating}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-600 hover:bg-brand-50 active:scale-95 transition-all disabled:opacity-50"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  loading={isMutating}
                  onClick={handleAddClick}
                  disabled={!isAvailable}
                  className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs h-9 px-3.5 shadow-sm active:scale-95 transition-all"
                >
                  {hasOptions ? (
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Options
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Add
                    </span>
                  )}
                </Button>
              )}
            </InteractiveCardAction>
          </div>
        </div>
      </InteractiveCard>
    );
  },
);

ClusteredFoodCard.displayName = "ClusteredFoodCard";
