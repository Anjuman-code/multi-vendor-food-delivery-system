import React, { memo, useEffect, useState } from "react";
import { Filter, RotateCcw, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/utils/format";
import httpClient from "@/lib/httpClient";
import type { FilterState } from "@/hooks/useMenuExplorer";

export interface FilterSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterState;
  priceBounds: { min: number; max: number };
  totalCount: number;
  onApplyFilters: (updated: Partial<FilterState>) => void;
  onResetFilters: () => void;
}

interface RestaurantOption {
  _id: string;
  name: string;
}

export const FilterSheet: React.FC<FilterSheetProps> = memo(
  ({
    isOpen,
    onOpenChange,
    filters,
    priceBounds,
    totalCount,
    onApplyFilters,
    onResetFilters,
  }) => {
    // Draft filter state for preview before clicking "Apply"
    const [draftPrice, setDraftPrice] = useState<[number, number]>([
      filters.minPrice ?? priceBounds.min,
      filters.maxPrice ?? priceBounds.max,
    ]);
    const [draftRating, setDraftRating] = useState<number | undefined>(
      filters.minRating,
    );
    const [draftOpenNow, setDraftOpenNow] = useState<boolean>(filters.openNow);
    const [draftDietary, setDraftDietary] = useState<string[]>(
      filters.dietaryTags,
    );
    const [draftRestaurants, setDraftRestaurants] = useState<string[]>(
      filters.restaurantIds,
    );

    // Searchable restaurant list
    const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
    const [restaurantSearch, setRestaurantSearch] = useState("");

    // Sync draft with current filters when opened
    useEffect(() => {
      if (isOpen) {
        setDraftPrice([
          filters.minPrice ?? priceBounds.min,
          filters.maxPrice ?? priceBounds.max,
        ]);
        setDraftRating(filters.minRating);
        setDraftOpenNow(filters.openNow);
        setDraftDietary(filters.dietaryTags);
        setDraftRestaurants(filters.restaurantIds);
      }
    }, [isOpen, filters, priceBounds]);

    // Fetch restaurants once for the filter list
    useEffect(() => {
      let isMounted = true;
      async function loadRestaurants() {
        try {
          const res = await httpClient.get<{
            success: boolean;
            data: RestaurantOption[];
          }>("/api/restaurants");
          if (isMounted && res.data?.data) {
            setRestaurants(
              res.data.data.map((r) => ({ _id: r._id, name: r.name })),
            );
          }
        } catch {
          // Non-critical
        }
      }
      loadRestaurants();
      return () => {
        isMounted = false;
      };
    }, []);

    const filteredRestaurants = restaurants.filter((r) =>
      r.name.toLowerCase().includes(restaurantSearch.toLowerCase()),
    );

    const toggleDietaryTag = (tag: string) => {
      setDraftDietary((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
      );
    };

    const toggleRestaurant = (id: string) => {
      setDraftRestaurants((prev) =>
        prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
      );
    };

    const handleApply = () => {
      onApplyFilters({
        minPrice: draftPrice[0] > priceBounds.min ? draftPrice[0] : undefined,
        maxPrice: draftPrice[1] < priceBounds.max ? draftPrice[1] : undefined,
        minRating: draftRating,
        openNow: draftOpenNow,
        dietaryTags: draftDietary,
        restaurantIds: draftRestaurants,
      });
      onOpenChange(false);
    };

    const handleReset = () => {
      setDraftPrice([priceBounds.min, priceBounds.max]);
      setDraftRating(undefined);
      setDraftOpenNow(false);
      setDraftDietary([]);
      setDraftRestaurants([]);
      onResetFilters();
      onOpenChange(false);
    };

    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col h-full bg-white"
        >
          {/* Header */}
          <SheetHeader className="p-5 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-bold text-gray-900">
                    Filter Menu
                  </SheetTitle>
                  <SheetDescription className="text-xs text-gray-500">
                    Refine dishes by price, rating, dietary and restaurant
                  </SheetDescription>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable Filter Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* 1. Price Range Selector */}
            <div className="space-y-3.5 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-gray-900 block">
                    Price Range
                  </label>
                  <span className="text-[11px] text-gray-500">
                    Adjust both minimum and maximum prices
                  </span>
                </div>
                <span className="text-xs font-bold text-brand-600 bg-brand-50 border border-brand-200/80 px-2.5 py-1 rounded-full shadow-xs">
                  {formatCurrency(draftPrice[0])} — {formatCurrency(draftPrice[1])}
                </span>
              </div>

              {/* Dual-Thumb Range Slider */}
              <div className="pt-2 px-1">
                <Slider
                  value={[draftPrice[0], draftPrice[1]]}
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={10}
                  onValueChange={(val) => {
                    if (Array.isArray(val) && val.length === 2) {
                      setDraftPrice([val[0], val[1]]);
                    }
                  }}
                  thumbLabels={["Minimum price slider", "Maximum price slider"]}
                  className="py-2"
                />

                <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium pt-1">
                  <span>{formatCurrency(priceBounds.min)}</span>
                  <span>{formatCurrency(priceBounds.max)}</span>
                </div>
              </div>

              {/* Styled Min & Max Input Cards */}
              <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 pt-1">
                <div className="relative rounded-xl border border-gray-200 bg-white p-2 shadow-xs focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-all">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Min Price
                  </span>
                  <div className="flex items-center mt-0.5">
                    <span className="text-xs font-semibold text-gray-400 mr-1">৳</span>
                    <input
                      type="number"
                      min={priceBounds.min}
                      max={draftPrice[1]}
                      value={draftPrice[0]}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!Number.isNaN(val)) {
                          setDraftPrice([Math.max(priceBounds.min, Math.min(val, draftPrice[1])), draftPrice[1]]);
                        }
                      }}
                      className="w-full text-xs font-bold text-gray-900 bg-transparent focus:outline-none"
                      aria-label="Minimum price in Taka"
                    />
                  </div>
                </div>

                <span className="text-xs font-bold text-gray-400 px-1">to</span>

                <div className="relative rounded-xl border border-gray-200 bg-white p-2 shadow-xs focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-all">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Max Price
                  </span>
                  <div className="flex items-center mt-0.5">
                    <span className="text-xs font-semibold text-gray-400 mr-1">৳</span>
                    <input
                      type="number"
                      min={draftPrice[0]}
                      max={priceBounds.max}
                      value={draftPrice[1]}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!Number.isNaN(val)) {
                          setDraftPrice([draftPrice[0], Math.min(priceBounds.max, Math.max(val, draftPrice[0]))]);
                        }
                      }}
                      className="w-full text-xs font-bold text-gray-900 bg-transparent focus:outline-none"
                      aria-label="Maximum price in Taka"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="pt-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Quick Presets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "All", min: priceBounds.min, max: priceBounds.max },
                    { label: "Under ৳150", min: priceBounds.min, max: 150 },
                    { label: "৳150–৳300", min: 150, max: 300 },
                    { label: "৳300–৳500", min: 300, max: 500 },
                    { label: "৳500+", min: 500, max: priceBounds.max },
                  ].map((preset) => {
                    const isSelected =
                      draftPrice[0] === preset.min && draftPrice[1] === preset.max;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setDraftPrice([preset.min, preset.max])}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          isSelected
                            ? "bg-brand-500 text-white shadow-xs"
                            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. Restaurant Open Now */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">
                  Open Restaurants Only
                </span>
                <span className="text-xs text-gray-500">
                  Only show items you can order right now
                </span>
              </div>
              <Switch
                checked={draftOpenNow}
                onCheckedChange={setDraftOpenNow}
                aria-label="Filter open restaurants only"
              />
            </div>

            {/* 3. Minimum Rating */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-gray-900 block">
                Minimum Restaurant Rating
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Any", value: undefined },
                  { label: "3.5+", value: 3.5 },
                  { label: "4.0+", value: 4.0 },
                  { label: "4.5+", value: 4.5 },
                ].map((ratingOpt) => {
                  const isSelected = draftRating === ratingOpt.value;
                  return (
                    <button
                      key={ratingOpt.label}
                      type="button"
                      onClick={() => setDraftRating(ratingOpt.value)}
                      className={`flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        isSelected
                          ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {ratingOpt.value && (
                        <Star
                          className={`w-3 h-3 ${isSelected ? "fill-white text-white" : "fill-amber-400 text-amber-400"}`}
                        />
                      )}
                      <span>{ratingOpt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Dietary Tags */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-gray-900 block">
                Dietary Preferences
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "halal", label: "Halal 🕌" },
                  { id: "vegetarian", label: "Vegetarian 🥦" },
                  { id: "vegan", label: "Vegan 🌱" },
                ].map((tag) => {
                  const isChecked = draftDietary.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleDietaryTag(tag.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        isChecked
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span>{tag.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Restaurants Multi-Select */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900 block">
                  Filter by Restaurant
                </label>
                {draftRestaurants.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDraftRestaurants([])}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Clear ({draftRestaurants.length})
                  </button>
                )}
              </div>

              {/* Search box inside restaurant list */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search restaurant..."
                  value={restaurantSearch}
                  onChange={(e) => setRestaurantSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
                {filteredRestaurants.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">
                    No restaurants match your search
                  </p>
                ) : (
                  filteredRestaurants.slice(0, 30).map((rest) => {
                    const isChecked = draftRestaurants.includes(rest._id);
                    return (
                      <label
                        key={rest._id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer text-xs transition-colors"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleRestaurant(rest._id)}
                        />
                        <span className="text-gray-800 line-clamp-1">{rest.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <SheetFooter className="p-4 border-t border-gray-100 bg-white flex flex-row items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="flex-1 rounded-xl h-11 text-xs font-semibold text-gray-700 hover:bg-gray-100"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset All
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              className="flex-[2] rounded-xl h-11 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20"
            >
              Apply ({totalCount} results)
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  },
);

FilterSheet.displayName = "FilterSheet";
