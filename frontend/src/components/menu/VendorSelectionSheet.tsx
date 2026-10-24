import React, { memo, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  ExternalLink,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Store,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FoodImage } from "@/components/ui/FoodImage";
import type { ClusteredDish, DishVendorOption } from "@/types/dishGrouping.types";
import type { ExploreMenuItem } from "@/services/exploreService";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";

export interface VendorSelectionSheetProps {
  dish: ClusteredDish | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  getCartQuantity: (itemId: string) => number;
  onAddToCart: (item: ExploreMenuItem) => Promise<void> | void;
  onUpdateQuantity: (
    item: ExploreMenuItem,
    newQuantity: number,
  ) => Promise<void> | void;
  onOpenQuickView?: (item: ExploreMenuItem) => void;
  favoriteRestaurantIds?: string[];
  onToggleFavorite?: (restaurantId: string) => void;
}

export const VendorSelectionSheet: React.FC<VendorSelectionSheetProps> = memo(
  ({
    dish,
    isOpen,
    onOpenChange,
    getCartQuantity,
    onAddToCart,
    onUpdateQuantity,
    onOpenQuickView,
    favoriteRestaurantIds = [],
    onToggleFavorite,
  }) => {
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const handleAdd = useCallback(
      async (vendor: DishVendorOption) => {
        const hasOptions =
          (vendor.variants && vendor.variants.length > 0) ||
          (vendor.addons && vendor.addons.some((a) => a.isRequired));

        if (hasOptions) {
          onOpenChange(false);
          onOpenQuickView?.(vendor.item);
          return;
        }

        setActionLoadingId(vendor.item._id);
        try {
          await onAddToCart(vendor.item);
        } finally {
          setActionLoadingId(null);
        }
      },
      [onAddToCart, onOpenChange, onOpenQuickView],
    );

    const handleStep = useCallback(
      async (vendor: DishVendorOption, newQty: number) => {
        setActionLoadingId(vendor.item._id);
        try {
          await onUpdateQuantity(vendor.item, newQty);
        } finally {
          setActionLoadingId(null);
        }
      },
      [onUpdateQuantity],
    );

    if (!dish) return null;

    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col h-full bg-white border-l border-gray-200"
        >
          {/* Header with Dish Banner */}
          <div className="relative bg-gray-50 border-b border-gray-100 p-4 sm:p-5">
            <div className="flex gap-4 items-center">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-200 shadow-xs">
                <FoodImage
                  src={dish.image}
                  name={dish.name}
                  alt={dish.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <SheetHeader className="text-left space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full inline-block w-fit">
                    {dish.categoryName}
                  </span>
                  <SheetTitle className="text-lg font-extrabold text-gray-900 truncate">
                    {dish.name}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-gray-500 line-clamp-1">
                    {dish.description || "Choose your preferred restaurant and delivery option"}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="font-extrabold text-brand-600">
                    {dish.hasPriceRange
                      ? `${formatCurrency(dish.minPrice)} – ${formatCurrency(dish.maxPrice)}`
                      : formatCurrency(dish.minPrice)}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-600 font-medium">
                    {dish.vendorCount} {dish.vendorCount === 1 ? "restaurant" : "restaurants"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subheader callout */}
          <div className="px-5 py-2.5 bg-brand-50/60 border-b border-brand-100/60 flex items-center justify-between text-xs text-brand-900">
            <span className="font-semibold">
              Comparing offers across Sylhet
            </span>
            <span className="text-brand-700 text-[11px]">
              Sorted by best rating & speed
            </span>
          </div>

          {/* Scrollable list of restaurants offering this dish */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-4 sm:p-5 space-y-3">
            {dish.vendors.map((vendor, index) => {
              const currentQty = getCartQuantity(vendor.item._id);
              const isFav = favoriteRestaurantIds.includes(vendor.restaurantId);
              const isBestMatch = index === 0 && dish.vendorCount > 1;
              const hasOptions =
                (vendor.variants && vendor.variants.length > 0) ||
                (vendor.addons && vendor.addons.some((a) => a.isRequired));
              const isLoading = actionLoadingId === vendor.item._id;

              return (
                <div
                  key={vendor.restaurantId}
                  className={cn(
                    "p-3.5 sm:p-4 rounded-2xl border transition-all duration-200",
                    isBestMatch
                      ? "border-brand-300 bg-brand-50/20 shadow-xs"
                      : "border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50/50",
                  )}
                >
                  {/* Top row: Best Match badge + Favorite */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        to={`/restaurants/${vendor.restaurantId}`}
                        className="font-bold text-gray-900 hover:text-brand-600 transition-colors inline-flex items-center gap-1.5 text-sm"
                      >
                        <Store className="w-3.5 h-3.5 text-gray-400" />
                        <span>{vendor.restaurantName}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </Link>

                      {isBestMatch && (
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-brand-600 text-white tracking-wide">
                          Top Choice
                        </span>
                      )}
                    </div>

                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(vendor.restaurantId)}
                        className="p-1 rounded-full text-gray-400 hover:text-rose-500 hover:bg-gray-100 transition-colors"
                        aria-label="Toggle favorite restaurant"
                      >
                        <Heart
                          className={cn(
                            "w-4 h-4",
                            isFav ? "fill-rose-500 text-rose-500" : "text-gray-400",
                          )}
                        />
                      </button>
                    )}
                  </div>

                  {/* Metadata: Rating, Delivery Time, Delivery Fee */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3.5 flex-wrap">
                    {vendor.rating > 0 && (
                      <div className="inline-flex items-center gap-1 font-semibold text-gray-700">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{vendor.rating.toFixed(1)}</span>
                        {vendor.reviewCount > 0 && (
                          <span className="text-[11px] text-gray-400 font-normal">
                            ({vendor.reviewCount})
                          </span>
                        )}
                      </div>
                    )}

                    <span className="text-gray-300">•</span>

                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{vendor.deliveryTime.min}–{vendor.deliveryTime.max}m</span>
                    </span>

                    <span className="text-gray-300">•</span>

                    <span className="inline-flex items-center gap-1">
                      <Truck className="w-3 h-3 text-gray-400" />
                      <span>
                        {vendor.deliveryFee > 0
                          ? `${formatCurrency(vendor.deliveryFee)} delivery`
                          : "Free delivery"}
                      </span>
                    </span>
                  </div>

                  {/* Bottom Action Row: Price & Add / Stepper */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-gray-900">
                          {formatCurrency(vendor.price)}
                        </span>
                        {vendor.originalPrice && vendor.originalPrice > vendor.price && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatCurrency(vendor.originalPrice)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        per portion
                      </span>
                    </div>

                    <div>
                      {currentQty > 0 ? (
                        <div className="inline-flex items-center gap-1 bg-white border border-brand-500 rounded-xl p-0.5 shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleStep(vendor, currentQty - 1)}
                            disabled={isLoading}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-600 hover:bg-brand-50 active:scale-95 transition-all disabled:opacity-50"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-gray-900">
                            {currentQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStep(vendor, currentQty + 1)}
                            disabled={isLoading}
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
                          loading={isLoading}
                          onClick={() => handleAdd(vendor)}
                          className="h-8 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                        >
                          {hasOptions ? (
                            <>
                              <SlidersHorizontal className="w-3 h-3" />
                              <span>Customize</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3 h-3" />
                              <span>Add to cart</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    );
  },
);

VendorSelectionSheet.displayName = "VendorSelectionSheet";
