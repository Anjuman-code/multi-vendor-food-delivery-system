import React, { memo, useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InteractiveCard,
  InteractiveCardAction,
  InteractiveCardLink,
} from "@/components/ui/InteractiveCard";
import type { ExploreMenuItem } from "@/services/exploreService";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";
import { FoodImage } from "@/components/ui/FoodImage";

export interface FoodCardProps {
  item: ExploreMenuItem;
  cartQuantity?: number;
  onAddToCart?: (item: ExploreMenuItem) => Promise<void> | void;
  onUpdateQuantity?: (
    item: ExploreMenuItem,
    newQuantity: number,
  ) => Promise<void> | void;
  onOpenQuickView?: (item: ExploreMenuItem) => void;
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


export const FoodCard: React.FC<FoodCardProps> = memo(
  ({
    item,
    cartQuantity = 0,
    onAddToCart,
    onUpdateQuantity,
    onOpenQuickView,
    isFavorite = false,
    onToggleFavorite,
  }) => {
    const [isMutating, setIsMutating] = useState(false);

    const hasOptions = useMemo(() => {
      const hasVariants = Boolean(item.variants && item.variants.length > 0);
      const hasRequiredAddons = Boolean(
        item.addons && item.addons.some((a) => a.isRequired),
      );
      return hasVariants || hasRequiredAddons;
    }, [item.variants, item.addons]);

    const isAvailable =
      item.isAvailable && item.stockStatus !== "out_of_stock" && item.isOpen;

    const discountPercent = useMemo(() => {
      if (item.originalPrice && item.originalPrice > item.price) {
        return Math.round(
          ((item.originalPrice - item.price) / item.originalPrice) * 100,
        );
      }
      return null;
    }, [item.originalPrice, item.price]);

    // Handle add to cart click
    const handleAddClick = useCallback(async () => {
      if (!isAvailable || isMutating) return;

      // If item has required options/variants, open quick view
      if (hasOptions) {
        onOpenQuickView?.(item);
        return;
      }

      setIsMutating(true);
      try {
        await onAddToCart?.(item);
      } finally {
        setIsMutating(false);
      }
    }, [isAvailable, isMutating, hasOptions, onOpenQuickView, item, onAddToCart]);

    // Handle stepper update
    const handleQuantityChange = useCallback(
      async (newQty: number) => {
        if (isMutating) return;
        setIsMutating(true);
        try {
          await onUpdateQuantity?.(item, newQty);
        } finally {
          setIsMutating(false);
        }
      },
      [isMutating, onUpdateQuantity, item],
    );

    const handleFavoriteClick = useCallback(() => {
      onToggleFavorite?.(item.restaurantId);
    }, [onToggleFavorite, item.restaurantId]);

    return (
      <InteractiveCard className="flex flex-col h-full rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
        {/* Top Media: Image & Overlays */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-gray-50">
          <FoodImage
            name={item.name}
            src={item.image}
            aspectRatio="4/3"
            className="w-full h-full"
            imgClassName="transition-transform duration-300 group-hover:scale-105"
          />

          {/* Badges on image */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
            {item.isPopular && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white shadow-sm">
                <Flame className="w-3 h-3 fill-current" />
                Popular
              </span>
            )}
            {discountPercent && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-500 text-white shadow-sm">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Secondary Action: Favorite Button */}
          <InteractiveCardAction className="absolute top-2.5 right-2.5 z-10">
            <button
              type="button"
              onClick={handleFavoriteClick}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:scale-110",
                isFavorite
                  ? "text-red-500 fill-red-500"
                  : "text-gray-600 hover:text-red-500",
              )}
              aria-label={
                isFavorite
                  ? `Remove ${item.restaurantName} from favorites`
                  : `Add ${item.restaurantName} to favorites`
              }
            >
              <Heart
                className={cn("w-4 h-4", isFavorite && "fill-current text-red-500")}
              />
            </button>
          </InteractiveCardAction>

          {/* Unavailable / Closed Overlay */}
          {!isAvailable && (
            <div className="absolute inset-0 bg-gray-950/50 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="bg-white/95 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-md uppercase tracking-wider">
                {!item.isOpen
                  ? "Restaurant Closed"
                  : item.stockStatus === "out_of_stock"
                    ? "Out of Stock"
                    : "Unavailable"}
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
          {/* Restaurant & Rating header */}
          <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
            <InteractiveCardAction className="truncate">
              <Link
                to={`/restaurants/${item.restaurantId}`}
                className="font-medium text-gray-500 hover:text-brand-600 transition-colors inline-flex items-center gap-1 truncate"
                title={item.restaurantName}
              >
                <Store className="w-3 h-3 flex-shrink-0 text-gray-400" />
                <span className="truncate">{item.restaurantName}</span>
              </Link>
            </InteractiveCardAction>

            {item.rating > 0 && (
              <div className="flex items-center gap-1 font-semibold text-gray-700 flex-shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{item.rating.toFixed(1)}</span>
                {item.reviewCount > 0 && (
                  <span className="text-[11px] text-gray-400 font-normal">
                    ({item.reviewCount})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stretched Primary Link: Item Title */}
          <h3 className="font-semibold text-gray-900 text-base leading-snug line-clamp-1 mb-1">
            <InteractiveCardLink
              to={`/menu/${item.restaurantId}/${item._id}`}
              className="text-gray-900 group-hover:text-brand-600 transition-colors"
            >
              {item.name}
            </InteractiveCardLink>
          </h3>

          {/* Description */}
          {item.description ? (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2 flex-1">
              {item.description}
            </p>
          ) : (
            <div className="flex-1" />
          )}

          {/* Dietary & Meta row */}
          <div className="flex items-center flex-wrap gap-1.5 mb-3 text-[11px]">
            {item.dietaryTags.map((tag) => {
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

            {item.preparationTime > 0 && (
              <span className="inline-flex items-center gap-1 text-gray-400 ml-auto">
                <Clock className="w-3 h-3" />
                {item.preparationTime}m
              </span>
            )}
          </div>

          {/* Bottom Row: Price & Cart Action */}
          <div className="mt-auto flex items-center justify-between gap-2 pt-2.5 border-t border-gray-100">
            {/* Price */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base sm:text-lg font-bold text-gray-900">
                  {formatCurrency(item.price)}
                </span>
                {item.originalPrice && item.originalPrice > item.price && (
                  <span className="text-xs text-gray-400 line-through">
                    {formatCurrency(item.originalPrice)}
                  </span>
                )}
              </div>
              {hasOptions && (
                <span className="text-[10px] text-gray-400 font-medium">
                  Customizable
                </span>
              )}
            </div>

            {/* Cart / Stepper Control inside InteractiveCardAction */}
            <InteractiveCardAction className="relative z-10">
              {!isAvailable ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  className="rounded-xl text-xs px-3 h-9 opacity-60 cursor-not-allowed"
                >
                  Unavailable
                </Button>
              ) : hasOptions && cartQuantity === 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenQuickView?.(item)}
                  className="rounded-xl text-xs font-semibold px-3 h-9 text-brand-600 border-brand-200 hover:bg-brand-50 hover:text-brand-700 min-h-[44px] sm:min-h-[36px]"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
                  Customize
                </Button>
              ) : cartQuantity > 0 ? (
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-0.5">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    disabled={isMutating}
                    onClick={() => handleQuantityChange(cartQuantity - 1)}
                    className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]"
                    aria-label={`Decrease quantity of ${item.name}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </motion.button>

                  <span className="w-6 text-center text-xs font-bold text-gray-900">
                    {cartQuantity}
                  </span>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    disabled={isMutating}
                    onClick={() => {
                      if (hasOptions) {
                        onOpenQuickView?.(item);
                      } else {
                        handleQuantityChange(cartQuantity + 1);
                      }
                    }}
                    className="w-8 h-8 rounded-lg bg-brand-500 shadow-sm flex items-center justify-center text-white hover:bg-brand-600 disabled:opacity-50 transition-colors min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]"
                    aria-label={`Increase quantity of ${item.name}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              ) : (
                <Button
                  size="sm"
                  loading={isMutating}
                  onClick={handleAddClick}
                  className="bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold px-3.5 h-9 shadow-sm hover:shadow transition-all min-h-[44px] sm:min-h-[36px]"
                >
                  <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              )}
            </InteractiveCardAction>
          </div>
        </div>
      </InteractiveCard>
    );
  },
);

FoodCard.displayName = "FoodCard";
