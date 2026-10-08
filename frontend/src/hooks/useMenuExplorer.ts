import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import exploreService, {
  ExploreCategory,
  ExploreMenuItem,
  ExploreMenuParams,
} from "@/services/exploreService";

export interface FilterState {
  search: string;
  categories: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  openNow: boolean;
  dietaryTags: string[];
  restaurantIds: string[];
  cuisines: string[];
  sort: "popular" | "price_asc" | "price_desc" | "rating" | "newest";
}

export function useMenuExplorer() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Categories list for pills and filter
  const [categories, setCategories] = useState<ExploreCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Items list and pagination
  const [items, setItems] = useState<ExploreMenuItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [priceBounds, setPriceBounds] = useState<{ min: number; max: number }>({
    min: 0,
    max: 1000,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // AbortController ref for in-flight requests cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Parse filters from URL search parameters
  const filters: FilterState = useMemo(() => {
    const search = searchParams.get("search") || searchParams.get("q") || "";
    const rawCategories =
      searchParams.get("categories") || searchParams.get("category") || "";
    const categories = rawCategories
      ? rawCategories
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

    const rawMinPrice = searchParams.get("minPrice");
    const minPrice =
      rawMinPrice !== null && !Number.isNaN(Number(rawMinPrice))
        ? Number(rawMinPrice)
        : undefined;

    const rawMaxPrice = searchParams.get("maxPrice");
    const maxPrice =
      rawMaxPrice !== null && !Number.isNaN(Number(rawMaxPrice))
        ? Number(rawMaxPrice)
        : undefined;

    const rawRating = searchParams.get("minRating");
    const minRating =
      rawRating !== null && !Number.isNaN(Number(rawRating))
        ? Number(rawRating)
        : undefined;

    const openNow = searchParams.get("openNow") === "true";

    const rawDietary =
      searchParams.get("dietaryTags") || searchParams.get("dietary") || "";
    const dietaryTags = rawDietary
      ? rawDietary
          .split(",")
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean)
      : [];

    const rawRestIds = searchParams.get("restaurantIds") || "";
    const restaurantIds = rawRestIds
      ? rawRestIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : [];

    const rawCuisines = searchParams.get("cuisines") || "";
    const cuisines = rawCuisines
      ? rawCuisines
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

    const rawSort = searchParams.get("sort");
    const validSorts = ["popular", "price_asc", "price_desc", "rating", "newest"];
    const sort = (
      validSorts.includes(rawSort || "") ? rawSort : "popular"
    ) as FilterState["sort"];

    return {
      search,
      categories,
      minPrice,
      maxPrice,
      minRating,
      openNow,
      dietaryTags,
      restaurantIds,
      cuisines,
      sort,
    };
  }, [searchParams]);

  // Sync state changes to URL
  const updateUrlParams = useCallback(
    (newFilters: Partial<FilterState>, resetPage = true) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (newFilters.search !== undefined) {
            if (newFilters.search.trim()) {
              next.set("search", newFilters.search.trim());
            } else {
              next.delete("search");
              next.delete("q");
            }
          }

          if (newFilters.categories !== undefined) {
            if (newFilters.categories.length > 0) {
              next.set("categories", newFilters.categories.join(","));
              next.delete("category");
            } else {
              next.delete("categories");
              next.delete("category");
            }
          }

          if (newFilters.minPrice !== undefined) {
            if (newFilters.minPrice !== undefined && newFilters.minPrice > 0) {
              next.set("minPrice", String(newFilters.minPrice));
            } else {
              next.delete("minPrice");
            }
          }

          if (newFilters.maxPrice !== undefined) {
            if (newFilters.maxPrice !== undefined) {
              next.set("maxPrice", String(newFilters.maxPrice));
            } else {
              next.delete("maxPrice");
            }
          }

          if (newFilters.minRating !== undefined) {
            if (newFilters.minRating && newFilters.minRating > 0) {
              next.set("minRating", String(newFilters.minRating));
            } else {
              next.delete("minRating");
            }
          }

          if (newFilters.openNow !== undefined) {
            if (newFilters.openNow) {
              next.set("openNow", "true");
            } else {
              next.delete("openNow");
            }
          }

          if (newFilters.dietaryTags !== undefined) {
            if (newFilters.dietaryTags.length > 0) {
              next.set("dietaryTags", newFilters.dietaryTags.join(","));
              next.delete("dietary");
            } else {
              next.delete("dietaryTags");
              next.delete("dietary");
            }
          }

          if (newFilters.restaurantIds !== undefined) {
            if (newFilters.restaurantIds.length > 0) {
              next.set("restaurantIds", newFilters.restaurantIds.join(","));
            } else {
              next.delete("restaurantIds");
            }
          }

          if (newFilters.cuisines !== undefined) {
            if (newFilters.cuisines.length > 0) {
              next.set("cuisines", newFilters.cuisines.join(","));
            } else {
              next.delete("cuisines");
            }
          }

          if (newFilters.sort !== undefined) {
            if (newFilters.sort && newFilters.sort !== "popular") {
              next.set("sort", newFilters.sort);
            } else {
              next.delete("sort");
            }
          }

          if (resetPage) {
            next.delete("page");
          }

          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Load distinct categories on mount
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadCategories() {
      setCategoriesLoading(true);
      const res = await exploreService.getCategories(controller.signal);
      if (isMounted && res.success && res.data?.categories) {
        setCategories(res.data.categories);
      }
      if (isMounted) {
        setCategoriesLoading(false);
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Fetch items whenever URL filter params change
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setPage(1);

    const params: ExploreMenuParams = {
      search: filters.search,
      categories: filters.categories,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minRating: filters.minRating,
      openNow: filters.openNow,
      dietaryTags: filters.dietaryTags,
      restaurantIds: filters.restaurantIds,
      cuisines: filters.cuisines,
      sort: filters.sort,
      page: 1,
      limit: 20,
    };

    async function fetchFirstPage() {
      const res = await exploreService.getMenuItems(params, controller.signal);
      if (!isMounted) return;

      if (res.success && res.data) {
        setItems(res.data.items);
        setTotalCount(res.data.total);
        setHasMore(res.data.hasMore);
        if (res.data.priceRange) {
          setPriceBounds(res.data.priceRange);
        }
      } else if (!controller.signal.aborted) {
        setError(res.message || "Failed to load food items");
      }
      setIsLoading(false);
    }

    fetchFirstPage();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [filters]);

  // Load more function for pagination / infinite scroll
  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;

    const params: ExploreMenuParams = {
      search: filters.search,
      categories: filters.categories,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minRating: filters.minRating,
      openNow: filters.openNow,
      dietaryTags: filters.dietaryTags,
      restaurantIds: filters.restaurantIds,
      cuisines: filters.cuisines,
      sort: filters.sort,
      page: nextPage,
      limit: 20,
    };

    const res = await exploreService.getMenuItems(params);
    if (res.success && res.data?.items) {
      setItems((prev) => [...prev, ...res.data!.items]);
      setPage(nextPage);
      setHasMore(res.data.hasMore);
    }
    setIsLoadingMore(false);
  }, [isLoading, isLoadingMore, hasMore, page, filters]);

  // Toggle category in multi-select
  const toggleCategory = useCallback(
    (categoryName: string) => {
      const current = filters.categories;
      const exists = current.some(
        (c) => c.toLowerCase() === categoryName.toLowerCase(),
      );
      let updated: string[];
      if (exists) {
        updated = current.filter(
          (c) => c.toLowerCase() !== categoryName.toLowerCase(),
        );
      } else {
        updated = [...current, categoryName];
      }
      updateUrlParams({ categories: updated });
    },
    [filters.categories, updateUrlParams],
  );

  // Clear all categories
  const clearCategories = useCallback(() => {
    updateUrlParams({ categories: [] });
  }, [updateUrlParams]);

  // Clear all active filters
  const resetAllFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  // Calculate active filter count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categories.length > 0) count += filters.categories.length;
    if (filters.minPrice !== undefined && filters.minPrice > priceBounds.min) count++;
    if (filters.maxPrice !== undefined && filters.maxPrice < priceBounds.max) count++;
    if (filters.minRating !== undefined && filters.minRating > 0) count++;
    if (filters.openNow) count++;
    if (filters.dietaryTags.length > 0) count += filters.dietaryTags.length;
    if (filters.restaurantIds.length > 0) count += filters.restaurantIds.length;
    if (filters.cuisines.length > 0) count += filters.cuisines.length;
    return count;
  }, [filters, priceBounds]);

  // Group items by category when no category is selected and no search term is entered
  const isGroupedView = useMemo(() => {
    return filters.categories.length === 0 && !filters.search;
  }, [filters.categories.length, filters.search]);

  const groupedItems = useMemo(() => {
    if (!isGroupedView) return [];

    const map = new Map<string, ExploreMenuItem[]>();
    for (const item of items) {
      const cat = item.categoryName || "Other";
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(item);
    }

    return Array.from(map.entries()).map(([categoryName, categoryItems]) => ({
      categoryName,
      items: categoryItems,
    }));
  }, [isGroupedView, items]);

  return {
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
    refetch: () => {
      // Trigger a re-run by bumping URL
      updateUrlParams({}, true);
    },
  };
}
