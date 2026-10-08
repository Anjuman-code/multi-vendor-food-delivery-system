import React, { memo } from "react";
import { ArrowUpDown } from "lucide-react";
import type { FilterState } from "@/hooks/useMenuExplorer";

export interface SortControlProps {
  currentSort: FilterState["sort"];
  onSortChange: (sort: FilterState["sort"]) => void;
}

const SORT_OPTIONS: Array<{ value: FilterState["sort"]; label: string }> = [
  { value: "popular", label: "Recommended / Popular" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest Arrivals" },
];

export const SortControl: React.FC<SortControlProps> = memo(
  ({ currentSort, onSortChange }) => {
    return (
      <div className="relative inline-flex items-center">
        <label htmlFor="menu-sort-select" className="sr-only">
          Sort Food Items
        </label>
        <div className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shadow-sm transition-colors cursor-pointer min-h-[44px]">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <span className="hidden sm:inline text-gray-500 font-normal">Sort:</span>
          <select
            id="menu-sort-select"
            value={currentSort}
            onChange={(e) =>
              onSortChange(e.target.value as FilterState["sort"])
            }
            className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer pr-1"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  },
);

SortControl.displayName = "SortControl";
