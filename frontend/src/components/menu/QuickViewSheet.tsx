import React, { memo, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  ExternalLink,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ExploreMenuItem } from "@/services/exploreService";
import { formatCurrency } from "@/utils/format";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/lib/toast";
import { FoodImage } from "@/components/ui/FoodImage";

export interface QuickViewSheetProps {
  item: ExploreMenuItem | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickViewSheet: React.FC<QuickViewSheetProps> = memo(
  ({ item, isOpen, onOpenChange }) => {
    const { addItem } = useCart();

    const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
    const [quantity, setQuantity] = useState(1);
    const [isAdding, setIsAdding] = useState(false);

    // Reset selection when item changes
    useEffect(() => {
      if (item) {
        setSelectedVariant(
          item.variants && item.variants.length > 0
            ? item.variants[0].name
            : null,
        );
        setSelectedAddons([]);
        setQuantity(1);
      }
    }, [item]);

    // Calculate total price based on variant and addons
    const totalPrice = useMemo(() => {
      if (!item) return 0;
      let base = item.price;

      if (selectedVariant && item.variants) {
        const v = item.variants.find((v) => v.name === selectedVariant);
        if (v) base = v.price;
      }

      let addonsSum = 0;
      if (item.addons) {
        for (const addonId of selectedAddons) {
          const a = item.addons.find(
            (a) => (a._id || a.name) === addonId || a.name === addonId,
          );
          if (a) addonsSum += a.price;
        }
      }

      return (base + addonsSum) * quantity;
    }, [item, selectedVariant, selectedAddons, quantity]);

    if (!item) return null;

    const toggleAddon = (identifier: string) => {
      setSelectedAddons((prev) =>
        prev.includes(identifier)
          ? prev.filter((id) => id !== identifier)
          : [...prev, identifier],
      );
    };

    const handleAddToCart = async () => {
      if (!item) return;

      // Validate required addons if any
      const missingRequired = (item.addons || []).filter(
        (a) =>
          a.isRequired &&
          !selectedAddons.includes(a._id || a.name) &&
          !selectedAddons.includes(a.name),
      );

      if (missingRequired.length > 0) {
        toast.error("Selection Required", {
          description: `Please select: ${missingRequired.map((m) => m.name).join(", ")}`,
        });
        return;
      }

      setIsAdding(true);
      try {
        const variantsPayload = selectedVariant
          ? [
              {
                name: selectedVariant,
                price:
                  item.variants?.find((v) => v.name === selectedVariant)?.price ||
                  item.price,
              },
            ]
          : [];

        const addonsPayload = (item.addons || [])
          .filter(
            (a) =>
              selectedAddons.includes(a._id || a.name) ||
              selectedAddons.includes(a.name),
          )
          .map((a) => ({
            name: a.name,
            price: a.price,
          }));

        await addItem(item.restaurantId, item.restaurantName, {
          menuItemId: item._id,
          name: item.name,
          price: totalPrice / quantity,
          image: item.image,
          quantity,
          variants: variantsPayload,
          addons: addonsPayload,
        });

        toast.success("Added to Cart", {
          description: `${quantity}x ${item.name} added from ${item.restaurantName}`,
        });

        onOpenChange(false);
      } finally {
        setIsAdding(false);
      }
    };

    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="sm:max-w-lg sm:inset-x-auto sm:right-0 sm:bottom-0 sm:top-0 sm:h-full max-h-[90vh] sm:max-h-full rounded-t-3xl sm:rounded-none p-0 flex flex-col bg-white overflow-hidden"
        >
          {/* Header Image */}
          <div className="relative aspect-[16/9] w-full bg-gray-100 flex-shrink-0">
            <FoodImage
              name={item.name}
              src={item.image}
              aspectRatio="16/9"
              className="w-full h-full"
              imgClassName="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            <div className="absolute bottom-3 left-4 right-4 text-white">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/20">
                {item.categoryName}
              </span>
            </div>
          </div>

          {/* Scrollable details */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Title & Restaurant row */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <Link
                  to={`/restaurants/${item.restaurantId}`}
                  onClick={() => onOpenChange(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>{item.restaurantName}</span>
                </Link>

                {item.rating > 0 && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{item.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              <SheetTitle className="text-xl font-bold text-gray-900 leading-tight">
                {item.name}
              </SheetTitle>

              {item.description && (
                <SheetDescription className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  {item.description}
                </SheetDescription>
              )}
            </div>

            {/* Dietary Tags & Prep time */}
            <div className="flex items-center gap-2 flex-wrap">
              {item.dietaryTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize font-medium"
                >
                  {tag}
                </span>
              ))}
              {item.preparationTime > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400 ml-auto">
                  <Clock className="w-3.5 h-3.5" />
                  {item.preparationTime} mins
                </span>
              )}
            </div>

            {/* Variants (Sizes) */}
            {item.variants && item.variants.length > 0 && (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Select Size / Option (Required)
                </label>
                <div className="space-y-2">
                  {item.variants.map((v) => {
                    const isSelected = selectedVariant === v.name;
                    return (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => setSelectedVariant(v.name)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                          isSelected
                            ? "border-brand-500 bg-brand-50/50 text-brand-900 font-semibold ring-1 ring-brand-500"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span>{v.name}</span>
                        <span className="font-bold">{formatCurrency(v.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Addons */}
            {item.addons && item.addons.length > 0 && (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Add-ons / Extras
                </label>
                <div className="space-y-2">
                  {item.addons.map((a) => {
                    const identifier = a._id || a.name;
                    const isChecked = selectedAddons.includes(identifier);
                    return (
                      <button
                        key={identifier}
                        type="button"
                        onClick={() => toggleAddon(identifier)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                          isChecked
                            ? "border-brand-500 bg-brand-50/50 text-brand-900 font-semibold ring-1 ring-brand-500"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-brand-500 focus:ring-brand-400"
                          />
                          <span>{a.name}</span>
                          {a.isRequired && (
                            <span className="text-[10px] text-red-500 font-semibold">
                              (Required)
                            </span>
                          )}
                        </span>
                        <span className="font-bold text-gray-900">
                          +{formatCurrency(a.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Link to full details */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <Link
                to={`/menu/${item.restaurantId}/${item._id}`}
                onClick={() => onOpenChange(false)}
                className="text-gray-500 hover:text-brand-600 inline-flex items-center gap-1 font-medium"
              >
                <span>View full item details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Footer: Stepper & Add to Cart */}
          <SheetFooter className="p-4 border-t border-gray-100 bg-white flex flex-row items-center gap-3">
            {/* Quantity Stepper */}
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-xl p-1 bg-gray-50">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-xs font-bold text-gray-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add Button */}
            <Button
              loading={isAdding}
              onClick={handleAddToCart}
              className="flex-1 rounded-xl h-11 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20"
            >
              <ShoppingBag className="w-4 h-4 mr-1.5" />
              Add to Cart • {formatCurrency(totalPrice)}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  },
);

QuickViewSheet.displayName = "QuickViewSheet";
