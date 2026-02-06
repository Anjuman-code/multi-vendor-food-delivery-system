import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  X,
  Star,
  Filter as FilterIcon,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  FilterCategory,
  FilterState,
  SortOption,
} from "@/types/restaurant";

// Animation variants
const collapseVariants = {
  open: { height: "auto", opacity: 1 },
  closed: { height: 0, opacity: 0 },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// Filter Section Component
interface FilterSectionProps {
  title: string;
  filters: FilterCategory[];
  selectedFilters: string[];
  onFilterChange: (id: string) => void;
  searchable?: boolean;
  defaultOpen?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  filters,
  selectedFilters,
  onFilterChange,
  searchable = false,
  defaultOpen = true,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const filteredFilters = useMemo(() => {
    if (!searchTerm) return filters;
    return filters.filter((f) =>
      f.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [filters, searchTerm]);

  const selectedCount = filters.filter((f) =>
    selectedFilters.includes(f.id),
  ).length;

  return (
    <motion.div variants={itemVariants} className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 group focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg"
        aria-expanded={isOpen}
        aria-controls={`filter-section-${title.toLowerCase().replace(/\s/g, "-")}`}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {selectedCount > 0 && (
            <Badge variant="orange" className="text-xs">
              {selectedCount}
            </Badge>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-orange-500 transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`filter-section-${title.toLowerCase().replace(/\s/g, "-")}`}
            initial="closed"
            animate="open"
            exit="closed"
            variants={collapseVariants}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-3">
              {searchable && (
                <div className="relative mb-3">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    aria-hidden="true"
                  />
                  <Input
                    type="text"
                    placeholder={`Search ${title.toLowerCase()}`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm bg-gray-50 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                    aria-label={`Search ${title}`}
                  />
                </div>
              )}
              <div
                className="space-y-2"
                role="group"
                aria-label={`${title} filters`}
              >
                {filteredFilters.map((filter) => (
                  <motion.label
                    key={filter.id}
                    className="flex items-center gap-3 cursor-pointer group"
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Checkbox
                      checked={selectedFilters.includes(filter.id)}
                      onCheckedChange={() => onFilterChange(filter.id)}
                      className="border-gray-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                      aria-label={`${filter.label} (${filter.count} results)`}
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors flex-1">
                      {filter.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({filter.count})
                    </span>
                  </motion.label>
                ))}
                {filteredFilters.length === 0 && (
                  <p className="text-sm text-gray-500 italic py-2">
                    No {title.toLowerCase()} found
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Rating Filter Component
interface RatingFilterProps {
  value: number;
  onChange: (value: number) => void;
}

const RatingFilter: React.FC<RatingFilterProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <motion.div variants={itemVariants} className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 group focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Minimum Rating</h3>
          {value > 0 && (
            <Badge variant="orange" className="text-xs">
              {value}+
            </Badge>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-orange-500 transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={collapseVariants}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-4 pb-3 px-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                  <span className="text-sm font-medium text-gray-900">
                    {value}
                  </span>
                </div>
                <span className="text-xs text-gray-500">& above</span>
              </div>
              <Slider
                value={[value]}
                min={0}
                max={5}
                step={0.5}
                onValueChange={(vals) => onChange(vals[0])}
                aria-label="Minimum rating filter"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">Any</span>
                <span className="text-xs text-gray-400">5.0</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Distance Filter Component
interface DistanceFilterProps {
  value: number;
  onChange: (value: number) => void;
}

const DistanceFilter: React.FC<DistanceFilterProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <motion.div variants={itemVariants} className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 group focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Distance</h3>
          {value < 50 && (
            <Badge variant="orange" className="text-xs">
              {value}km
            </Badge>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-orange-500 transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={collapseVariants}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-4 pb-3 px-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  Within {value} km
                </span>
              </div>
              <Slider
                value={[value]}
                min={1}
                max={50}
                step={1}
                onValueChange={(vals) => onChange(vals[0])}
                aria-label="Maximum distance filter"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">1 km</span>
                <span className="text-xs text-gray-400">50 km</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Sort Options
const sortOptions: { value: SortOption; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "rating-high", label: "Highest Rated" },
  { value: "rating-low", label: "Lowest Rated" },
  { value: "distance", label: "Nearest First" },
  { value: "reviews", label: "Most Reviews" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
];

// Main FiltersPanel Props
interface FiltersPanelProps {
  typeFilters: FilterCategory[];
  cuisineFilters: FilterCategory[];
  amenityFilters: FilterCategory[];
  filterState: FilterState;
  onFilterChange: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => void;
  onClearAll: () => void;
  resultCount: number;
}

const FiltersPanel: React.FC<FiltersPanelProps> = ({
  typeFilters,
  cuisineFilters,
  amenityFilters,
  filterState,
  onFilterChange,
  onClearAll,
  resultCount,
}) => {
  const totalActiveFilters =
    filterState.types.length +
    filterState.cuisines.length +
    filterState.amenities.length +
    (filterState.rating > 0 ? 1 : 0) +
    (filterState.distance < 50 ? 1 : 0);

  const handleTypeChange = useCallback(
    (id: string) => {
      const newTypes = filterState.types.includes(id)
        ? filterState.types.filter((t) => t !== id)
        : [...filterState.types, id];
      onFilterChange("types", newTypes);
    },
    [filterState.types, onFilterChange],
  );

  const handleCuisineChange = useCallback(
    (id: string) => {
      const newCuisines = filterState.cuisines.includes(id)
        ? filterState.cuisines.filter((c) => c !== id)
        : [...filterState.cuisines, id];
      onFilterChange("cuisines", newCuisines);
    },
    [filterState.cuisines, onFilterChange],
  );

  const handleAmenityChange = useCallback(
    (id: string) => {
      const newAmenities = filterState.amenities.includes(id)
        ? filterState.amenities.filter((a) => a !== id)
        : [...filterState.amenities, id];
      onFilterChange("amenities", newAmenities);
    },
    [filterState.amenities, onFilterChange],
  );

  const handleRatingChange = useCallback(
    (value: number) => {
      onFilterChange("rating", value);
    },
    [onFilterChange],
  );

  const handleDistanceChange = useCallback(
    (value: number) => {
      onFilterChange("distance", value);
    },
    [onFilterChange],
  );

  const handleSortChange = useCallback(
    (value: string) => {
      onFilterChange("sortBy", value as SortOption);
    },
    [onFilterChange],
  );

  // Filter content shared between desktop and mobile
  const filterContent = (
    <>
      {/* Sort */}
      <div className="mb-6">
        <label
          htmlFor="sort-select"
          className="font-semibold text-gray-900 mb-2 block"
        >
          Sort by
        </label>
        <Select value={filterState.sortBy} onValueChange={handleSortChange}>
          <SelectTrigger id="sort-select" className="w-full">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <FilterSection
          title="Type"
          filters={typeFilters}
          selectedFilters={filterState.types}
          onFilterChange={handleTypeChange}
        />

        <FilterSection
          title="Cuisine"
          filters={cuisineFilters}
          selectedFilters={filterState.cuisines}
          onFilterChange={handleCuisineChange}
          searchable
        />

        <FilterSection
          title="Amenities"
          filters={amenityFilters}
          selectedFilters={filterState.amenities}
          onFilterChange={handleAmenityChange}
          searchable
          defaultOpen={false}
        />

        <RatingFilter
          value={filterState.rating}
          onChange={handleRatingChange}
        />

        <DistanceFilter
          value={filterState.distance}
          onChange={handleDistanceChange}
        />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden flex items-center justify-between gap-3 mb-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              aria-label={`Open filters. ${totalActiveFilters} filters active`}
            >
              <FilterIcon className="w-4 h-4" />
              Filters
              {totalActiveFilters > 0 && (
                <Badge variant="orange" className="text-xs">
                  {totalActiveFilters}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-80 overflow-y-auto bg-white"
            aria-label="Filters panel"
          >
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Narrow down your restaurant search
              </SheetDescription>
            </SheetHeader>

            <div className="py-4">
              {totalActiveFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="mb-4 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Clear all filters
                </Button>
              )}
              {filterContent}
            </div>

            <SheetFooter className="sticky bottom-0 bg-white border-t pt-4 -mx-6 px-6 -mb-6 pb-6">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                Show {resultCount} Results
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {totalActiveFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-orange-600 hover:text-orange-700"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Desktop Sidebar Filters */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="hidden lg:block w-64 flex-shrink-0"
        role="region"
        aria-label="Filters"
      >
        <div className="sticky top-24 space-y-1 max-h-[calc(100vh-120px)] overflow-y-auto pr-2 pb-8">
          {totalActiveFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="mb-3 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <X className="w-3 h-3 mr-1" />
              Clear all filters ({totalActiveFilters})
            </Button>
          )}
          {filterContent}
        </div>
      </motion.aside>
    </>
  );
};

export default FiltersPanel;
