import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useMenuExplorer } from "@/hooks/useMenuExplorer";
import userService from "@/services/userService";
import { toast } from "@/lib/toast";

// Feature Components
import { FoodCard } from "@/components/menu/FoodCard";
import { FoodCardSkeleton } from "@/components/menu/FoodCardSkeleton";
import { CategoryPills } from "@/components/menu/CategoryPills";
import { FilterSheet } from "@/components/menu/FilterSheet";
import { SortControl } from "@/components/menu/SortControl";
import { ActiveFilterChips } from "@/components/menu/ActiveFilterChips";
import { StickyCartBar } from "@/components/menu/StickyCartBar";
import { QuickViewSheet } from "@/components/menu/QuickViewSheet";
import type { ExploreMenuItem } from "@/services/exploreService";

const MenuPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { items: cartItems, addItem, updateQuantity, removeItem } = useCart();

  const {
    items,
    groupedItems,
    isGroupedView,
    categories,
    categoriesLoading,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    filters,
    priceBounds,
    activeFiltersCount,
    loadMore,
    updateUrlParams,
    toggleCategory,
    clearCategories,
    resetAllFilters,
    refetch,
  } = useMenuExplorer();

  // Local state for debounced search input
  const [searchInput, setSearchInput] = useState(filters.search);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [quickViewItem, setQuickViewItem] = useState<ExploreMenuItem | null>(null);

  // Favorites tracking
  const [favoriteRestaurantIds, setFavoriteRestaurantIds] = useState<string[]>([]);

  // Sentinel ref for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Keep local search input synced with URL
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Debounced search updating URL
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== filters.search) {
        updateUrlParams({ search: searchInput });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput, filters.search, updateUrlParams]);

  // Load user favorite restaurants if logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    async function loadFavorites() {
      try {
        const res = await userService.getFavorites();
        if (isMounted && res.success && res.data?.favorites) {
          const ids = res.data.favorites
            .map((f: unknown) => {
              if (typeof f === "string") return f;
              if (typeof f === "object" && f !== null && "_id" in f) {
                return (f as { _id: string })._id;
              }
              return "";
            })
            .filter(Boolean);
          setFavoriteRestaurantIds(ids);
        }
      } catch {
        // Non-critical
      }
    }

    loadFavorites();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Toggle favorite restaurant
  const handleToggleFavorite = useCallback(
    async (restaurantId: string) => {
      if (!isAuthenticated) {
        toast.info("Log in to save favorites", {
          description: "Sign in to keep your favorite restaurants synced across devices.",
        });
        return;
      }

      const isFav = favoriteRestaurantIds.includes(restaurantId);
      if (isFav) {
        setFavoriteRestaurantIds((prev) => prev.filter((id) => id !== restaurantId));
        await userService.removeFavorite(restaurantId);
        toast.success("Removed from favorites");
      } else {
        setFavoriteRestaurantIds((prev) => [...prev, restaurantId]);
        await userService.addFavorite(restaurantId);
        toast.success("Saved to favorites");
      }
    },
    [isAuthenticated, favoriteRestaurantIds],
  );

  // Get current quantity in cart for an item
  const getCartQuantity = useCallback(
    (itemId: string) => {
      const match = cartItems.find((ci) => ci.menuItemId === itemId);
      return match?.quantity || 0;
    },
    [cartItems],
  );

  // Handle direct Add to Cart on FoodCard
  const handleAddToCart = useCallback(
    async (item: ExploreMenuItem) => {
      await addItem(item.restaurantId, item.restaurantName, {
        menuItemId: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: 1,
        variants: [],
        addons: [],
      });
      toast.success("Added to cart", {
        description: `${item.name} from ${item.restaurantName}`,
      });
    },
    [addItem],
  );

  // Handle Stepper quantity change
  const handleUpdateQuantity = useCallback(
    async (item: ExploreMenuItem, newQty: number) => {
      const existing = cartItems.find((ci) => ci.menuItemId === item._id);
      if (!existing) return;

      const key = existing.itemKey || existing.menuItemId;
      if (newQty <= 0) {
        await removeItem(key);
      } else {
        await updateQuantity(key, newQty);
      }
    },
    [cartItems, removeItem, updateQuantity],
  );

  // Setup IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, loadMore]);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-24">
      {/* ── Page Header & Sticky Discovery Bar ── */}
      <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          {/* Top Search & Controls Row */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search food, dishes, restaurants, cuisines..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-gray-100/80 hover:bg-gray-100 focus:bg-white text-sm font-medium text-gray-900 rounded-2xl border border-transparent focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all min-h-[44px]"
                aria-label="Search food items"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    updateUrlParams({ search: "" });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                  aria-label="Clear search text"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Sheet Trigger Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFilterSheetOpen(true)}
              className="relative rounded-2xl border-gray-200 bg-white hover:bg-gray-50 px-3.5 h-11 text-xs font-semibold text-gray-700 min-h-[44px] shadow-sm flex-shrink-0"
              aria-label={`Open filters (${activeFiltersCount} active)`}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5 text-gray-500" />
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1.5 w-5 h-5 rounded-full bg-brand-500 text-white text-[11px] font-extrabold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            {/* Sort Control */}
            <div className="flex-shrink-0">
              <SortControl
                currentSort={filters.sort}
                onSortChange={(sort) => updateUrlParams({ sort })}
              />
            </div>
          </div>

          {/* Horizontally Scrollable Category Pills Row */}
          <CategoryPills
            categories={categories}
            selectedCategories={filters.categories}
            onToggleCategory={toggleCategory}
            onClearCategories={clearCategories}
            isLoading={categoriesLoading}
          />
        </div>

        {/* Removable Active Filter Chips */}
        <div className="max-w-7xl mx-auto border-t border-gray-100/80">
          <ActiveFilterChips
            filters={filters}
            priceBounds={priceBounds}
            onRemoveSearch={() => {
              setSearchInput("");
              updateUrlParams({ search: "" });
            }}
            onRemoveCategory={toggleCategory}
            onRemovePrice={() =>
              updateUrlParams({ minPrice: undefined, maxPrice: undefined })
            }
            onRemoveRating={() => updateUrlParams({ minRating: undefined })}
            onRemoveOpenNow={() => updateUrlParams({ openNow: false })}
            onRemoveDietary={(tag) =>
              updateUrlParams({
                dietaryTags: filters.dietaryTags.filter((t) => t !== tag),
              })
            }
            onRemoveRestaurant={(id) =>
              updateUrlParams({
                restaurantIds: filters.restaurantIds.filter((r) => r !== id),
              })
            }
            onRemoveCuisine={(c) =>
              updateUrlParams({
                cuisines: filters.cuisines.filter((item) => item !== c),
              })
            }
            onClearAll={resetAllFilters}
          />
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Results Count Header */}
        {!isLoading && !error && (
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
              {filters.search
                ? `Dishes for "${filters.search}"`
                : filters.categories.length === 1
                  ? `${filters.categories[0]} Menu`
                  : filters.categories.length > 1
                    ? `${filters.categories.join(", ")} Dishes`
                    : "Explore All Dishes"}
            </h1>

            <span
              role="status"
              aria-live="polite"
              className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm"
            >
              {totalCount} {totalCount === 1 ? "dish" : "dishes"} available
            </span>
          </div>
        )}

        {/* ── State 1: Initial Loading Skeletons ── */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <FoodCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ── State 2: Error State ── */}
        {!isLoading && error && (
          <EmptyState
            variant="error"
            title="Failed to load food menu"
            description={error}
            action={{
              label: "Try Again",
              onClick: refetch,
              icon: RefreshCw,
            }}
            className="my-8"
          />
        )}

        {/* ── State 3: Zero Results Empty State ── */}
        {!isLoading && !error && items.length === 0 && (
          <EmptyState
            title="No dishes found"
            description={
              activeFiltersCount > 0
                ? "No food items matched your active filters. Try clearing some filters or searching for something else."
                : "No food items are currently available. Please check back later!"
            }
            action={
              activeFiltersCount > 0
                ? {
                    label: "Clear All Filters",
                    onClick: resetAllFilters,
                  }
                : undefined
            }
            className="my-8"
          />
        )}

        {/* ── State 4: Categorized Sections (when no category filter is applied) ── */}
        {!isLoading && !error && items.length > 0 && isGroupedView && (
          <div className="space-y-10">
            {groupedItems.map((group) => (
              <section
                key={group.categoryName}
                aria-labelledby={`heading-${group.categoryName}`}
                className="space-y-4"
              >
                {/* Category Section Sticky Header */}
                <div className="sticky top-[182px] z-20 bg-gray-50/95 backdrop-blur-sm py-2 px-1 border-b border-gray-200/80 flex items-center justify-between">
                  <h2
                    id={`heading-${group.categoryName}`}
                    className="text-lg font-bold text-gray-900 flex items-center gap-2"
                  >
                    <span>{group.categoryName}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                      {group.items.length}
                    </span>
                  </h2>

                  <button
                    type="button"
                    onClick={() => toggleCategory(group.categoryName)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    View only {group.categoryName}
                  </button>
                </div>

                {/* Items Grid for this category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {group.items.map((item) => (
                    <FoodCard
                      key={item._id}
                      item={item}
                      cartQuantity={getCartQuantity(item._id)}
                      onAddToCart={handleAddToCart}
                      onUpdateQuantity={handleUpdateQuantity}
                      onOpenQuickView={setQuickViewItem}
                      isFavorite={favoriteRestaurantIds.includes(item.restaurantId)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* ── State 5: Flat Grid (when one or more filters/categories are applied) ── */}
        {!isLoading && !error && items.length > 0 && !isGroupedView && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {items.map((item) => (
              <FoodCard
                key={item._id}
                item={item}
                cartQuantity={getCartQuantity(item._id)}
                onAddToCart={handleAddToCart}
                onUpdateQuantity={handleUpdateQuantity}
                onOpenQuickView={setQuickViewItem}
                isFavorite={favoriteRestaurantIds.includes(item.restaurantId)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}

        {/* ── Infinite Scroll Sentinel & Load More Fallback ── */}
        {!isLoading && hasMore && (
          <div className="mt-10 flex flex-col items-center justify-center gap-3">
            <div ref={sentinelRef} className="h-4 w-full" />

            <Button
              type="button"
              variant="outline"
              loading={isLoadingMore}
              onClick={loadMore}
              className="rounded-2xl px-6 h-12 text-sm font-semibold border-gray-300 hover:bg-gray-100 shadow-sm min-h-[44px]"
            >
              {isLoadingMore ? (
                <span>Loading more delicious dishes...</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <ArrowDown className="w-4 h-4" />
                  Load More Dishes
                </span>
              )}
            </Button>
          </div>
        )}
      </main>

      {/* ── Filter Sheet ── */}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        filters={filters}
        priceBounds={priceBounds}
        totalCount={totalCount}
        onApplyFilters={(updated) => updateUrlParams(updated)}
        onResetFilters={resetAllFilters}
      />

      {/* ── Quick View Modal Sheet ── */}
      <QuickViewSheet
        item={quickViewItem}
        isOpen={Boolean(quickViewItem)}
        onOpenChange={(open) => !open && setQuickViewItem(null)}
      />

      {/* ── Floating Mobile Cart Bar ── */}
      <StickyCartBar />
    </div>
  );
};

export default MenuPage;
