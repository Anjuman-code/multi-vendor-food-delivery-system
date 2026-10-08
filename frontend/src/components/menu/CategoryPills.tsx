import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/utils/cn";
import type { ExploreCategory } from "@/services/exploreService";

export interface CategoryPillsProps {
  categories: ExploreCategory[];
  selectedCategories: string[];
  onToggleCategory: (categoryName: string) => void;
  onClearCategories: () => void;
  isLoading?: boolean;
}

export const CategoryPills: React.FC<CategoryPillsProps> = memo(
  ({
    categories,
    selectedCategories,
    onToggleCategory,
    onClearCategories,
    isLoading = false,
  }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const isAllSelected = selectedCategories.length === 0;

    // Check scroll position to update arrows/edge fades
    const updateScrollAffordance = useCallback(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }, []);

    useEffect(() => {
      updateScrollAffordance();
      const el = scrollContainerRef.current;
      if (!el) return;
      el.addEventListener("scroll", updateScrollAffordance, { passive: true });
      window.addEventListener("resize", updateScrollAffordance);
      return () => {
        el.removeEventListener("scroll", updateScrollAffordance);
        window.removeEventListener("resize", updateScrollAffordance);
      };
    }, [updateScrollAffordance, categories]);

    const scrollByAmount = (amount: number) => {
      if (!scrollContainerRef.current) return;
      scrollContainerRef.current.scrollBy({
        left: amount,
        behavior: "smooth",
      });
    };

    return (
      <div className="relative w-full group py-2">
        {/* Left Scroll Button / Affordance */}
        {canScrollLeft && (
          <div className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 items-center h-full pr-4 bg-gradient-to-r from-white via-white/90 to-transparent">
            <button
              type="button"
              onClick={() => scrollByAmount(-200)}
              className="w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          role="region"
          aria-label="Category filter"
          className="flex items-center gap-2 overflow-x-auto scrollbar-none px-4 sm:px-6 py-1 -my-1 scroll-smooth"
        >
          {/* "All" Pill */}
          <button
            type="button"
            onClick={onClearCategories}
            aria-pressed={isAllSelected}
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 min-h-[44px] cursor-pointer select-none",
              isAllSelected
                ? "bg-brand-500 text-white shadow-sm ring-2 ring-brand-500/20"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200/60",
            )}
          >
            {isAllSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>All Categories</span>
          </button>

          {/* Individual Category Pills */}
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 h-[44px] w-24 rounded-full bg-gray-100 animate-pulse"
                />
              ))
            : categories.map((cat) => {
                const isSelected = selectedCategories.some(
                  (c) => c.toLowerCase() === cat.name.toLowerCase(),
                );

                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => onToggleCategory(cat.name)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 min-h-[44px] cursor-pointer select-none",
                      isSelected
                        ? "bg-brand-500 text-white font-semibold shadow-sm ring-2 ring-brand-500/20"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300",
                    )}
                  >
                    {cat.icon && (
                      <span className="text-base leading-none select-none">
                        {cat.icon}
                      </span>
                    )}
                    <span>{cat.name}</span>
                    <span
                      className={cn(
                        "text-[11px] font-normal px-1.5 py-0.5 rounded-full",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {cat.itemCount}
                    </span>
                    {isSelected && (
                      <span
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/25 hover:bg-white/40 transition-colors ml-0.5"
                        title="Remove category"
                      >
                        <X className="w-3 h-3 stroke-[2.5]" />
                      </span>
                    )}
                  </button>
                );
              })}

          {/* Persistent "Clear all categories" when any are selected */}
          {!isAllSelected && (
            <button
              type="button"
              onClick={onClearCategories}
              className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline min-h-[44px] whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear categories</span>
            </button>
          )}
        </div>

        {/* Right Scroll Button / Affordance */}
        {canScrollRight && (
          <div className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 items-center h-full pl-4 bg-gradient-to-l from-white via-white/90 to-transparent">
            <button
              type="button"
              onClick={() => scrollByAmount(200)}
              className="w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  },
);

CategoryPills.displayName = "CategoryPills";
