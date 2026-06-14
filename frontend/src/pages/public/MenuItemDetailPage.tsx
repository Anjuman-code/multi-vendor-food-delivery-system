import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/lib/toast";
import apiService from "@/services/apiService";
import menuService from "@/services/menuService";
import type { MenuItem, MenuItemAddon, MenuItemVariant } from "@/types/menu";
import { cn } from "@/utils/cn";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Leaf,
  Minus,
  Plus,
  ShieldCheck,
  Star,
  Store,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const ITEM_GRADIENTS = [
  { from: "#f97316", to: "#ea580c" },
  { from: "#e11d48", to: "#be123c" },
  { from: "#7c3aed", to: "#6d28d9" },
  { from: "#0891b2", to: "#0e7490" },
  { from: "#16a34a", to: "#15803d" },
  { from: "#d97706", to: "#b45309" },
  { from: "#db2777", to: "#be185d" },
  { from: "#2563eb", to: "#1d4ed8" },
];

function itemGradient(name: string) {
  return ITEM_GRADIENTS[(name.charCodeAt(0) || 0) % ITEM_GRADIENTS.length];
}

const DIETARY_COLORS: Record<string, string> = {
  halal: "bg-emerald-50 text-emerald-700 border-emerald-200",
  vegetarian: "bg-green-50 text-green-700 border-green-200",
  vegan: "bg-lime-50 text-lime-700 border-lime-200",
  gluten_free: "bg-blue-50 text-blue-700 border-blue-200",
  "gluten-free": "bg-blue-50 text-blue-700 border-blue-200",
  spicy: "bg-red-50 text-red-700 border-red-200",
};

const SPICE_LABEL: Record<string, { label: string; flames: number }> = {
  mild: { label: "Mild", flames: 1 },
  medium: { label: "Medium", flames: 2 },
  hot: { label: "Hot", flames: 3 },
  "extra-hot": { label: "Extra hot", flames: 3 },
};

const formatTaka = (amount: number): string => `৳${Math.round(amount)}`;

/** Backend restaurant shape returned by GET /api/restaurants/:id. */
type ApiRestaurant = {
  _id: string;
  name: string;
  description?: string;
  address?: { street?: string; city?: string; state?: string };
  cuisineType?: string[];
  images?: { logo?: string; coverPhoto?: string };
  rating?: { average?: number; count?: number };
  deliveryTime?: string | { min: number; max: number };
  deliveryFee?: number;
  minimumOrder?: number;
};

const formatDeliveryTime = (
  deliveryTime?: string | { min: number; max: number },
): string => {
  if (!deliveryTime) return "30–45 min";
  if (typeof deliveryTime === "object")
    return `${deliveryTime.min}–${deliveryTime.max} min`;
  return deliveryTime;
};

const MenuItemDetailPage: React.FC = () => {
  const { restaurantId, itemId } = useParams<{
    restaurantId: string;
    itemId: string;
  }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [item, setItem] = useState<MenuItem | null>(null);
  const [restaurant, setRestaurant] = useState<ApiRestaurant | null>(null);
  const [relatedItems, setRelatedItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] =
    useState<MenuItemVariant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<MenuItemAddon[]>([]);

  const restaurantName = restaurant?.name ?? "";

  useEffect(() => {
    if (!restaurantId || !itemId) {
      setError("Invalid item");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setQuantity(1);
    setSelectedVariant(null);
    setSelectedAddons([]);

    menuService
      .getMenuItem(restaurantId, itemId)
      .then((res) => {
        if (res.success && res.data?.item) {
          setItem(res.data.item);
        } else {
          setError(res.message || "Failed to load menu item.");
        }
      })
      .catch(() => setError("Something went wrong. Please try again."))
      .finally(() => setIsLoading(false));

    // Restaurant info powers the breadcrumb, cart entry and the info sidebar.
    apiService
      .getRestaurantById(restaurantId)
      .then((res) => {
        const payload = res.data as { data?: ApiRestaurant };
        if (payload?.data) setRestaurant(payload.data);
      })
      .catch(() => {
        /* non-blocking: sidebar degrades gracefully without it */
      });

    // Full menu lets us surface "more from this restaurant".
    menuService
      .getMenu(restaurantId)
      .then((res) => {
        if (res.success && res.data?.items) {
          setRelatedItems(res.data.items);
        }
      })
      .catch(() => {
        /* non-blocking */
      });
  }, [restaurantId, itemId]);

  const toggleAddon = useCallback((addon: MenuItemAddon) => {
    setSelectedAddons((prev) =>
      prev.some((a) => a._id === addon._id)
        ? prev.filter((a) => a._id !== addon._id)
        : [...prev, addon],
    );
  }, []);

  const unitPrice = useMemo(() => {
    if (!item) return 0;
    const variantDelta = selectedVariant ? selectedVariant.price : 0;
    const addonTotal = selectedAddons.reduce((s, a) => s + a.price, 0);
    return item.price + variantDelta + addonTotal;
  }, [item, selectedVariant, selectedAddons]);

  const effectivePrice = unitPrice * quantity;

  // "More from this restaurant" — prefer same category, then fill with others.
  const suggestions = useMemo(() => {
    if (!item) return [];
    const others = relatedItems.filter(
      (r) => r._id !== item._id && r.isAvailable !== false,
    );
    const sameCat = others.filter(
      (r) => item.categoryId && r.categoryId === item.categoryId,
    );
    const rest = others.filter(
      (r) => !item.categoryId || r.categoryId !== item.categoryId,
    );
    return [...sameCat, ...rest].slice(0, 4);
  }, [item, relatedItems]);

  const handleAddToCart = useCallback(async () => {
    if (!item || !restaurantId) return;
    setIsAdding(true);

    const cartItem = {
      menuItemId: item._id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity,
      variants: selectedVariant
        ? [
            {
              optionId: selectedVariant._id,
              name: selectedVariant.name,
              price: selectedVariant.price,
            },
          ]
        : [],
      addons: selectedAddons.map((a) => ({
        optionId: a._id,
        name: a.name,
        price: a.price,
      })),
    };

    try {
      await addItem(restaurantId, restaurantName, cartItem);
      toast.success("Added to cart", {
        description: `${item.name} (${quantity}x) has been added to your cart.`,
      });
    } finally {
      setIsAdding(false);
    }
  }, [
    item,
    restaurantId,
    restaurantName,
    quantity,
    selectedVariant,
    selectedAddons,
    addItem,
  ]);

  // ── Loading state ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-24">
        <Skeleton className="mb-6 h-6 w-32" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="aspect-square rounded-3xl" />
            <div className="space-y-4">
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────
  if (error || !item) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-16 text-center">
        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <UtensilsCrossed className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          Item not found
        </h2>
        <p className="mb-6 text-gray-600">
          {error || "This item may have been removed."}
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go back
        </Button>
      </div>
    );
  }

  const gradient = itemGradient(item.name);
  const hasDiscount = !!item.originalPrice && item.originalPrice > item.price;
  const discountPct = hasDiscount
    ? Math.round(((item.originalPrice! - item.price) / item.originalPrice!) * 100)
    : 0;
  const spice = item.spiceLevel ? SPICE_LABEL[item.spiceLevel] : undefined;

  const facts = [
    item.preparationTime > 0
      ? { icon: Clock, label: "Prep time", value: `${item.preparationTime} min` }
      : null,
    item.calories
      ? { icon: Flame, label: "Calories", value: `${item.calories} cal` }
      : null,
    item.servingSize
      ? { icon: UtensilsCrossed, label: "Serves", value: item.servingSize }
      : null,
    spice
      ? { icon: Flame, label: "Spice", value: spice.label }
      : null,
  ].filter(Boolean) as { icon: typeof Clock; label: string; value: string }[];

  return (
    <div className="min-h-screen bg-gray-50/60 pb-28 md:pb-12">
      {/* Breadcrumb header */}
      <div className="sticky top-20 z-30 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <button
            onClick={() => navigate(-1)}
            className="-ml-2 rounded-lg p-2 transition-colors hover:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-2 truncate text-sm text-gray-500">
            <Link
              to={`/restaurants/${restaurantId}`}
              className="truncate transition-colors hover:text-brand-600"
            >
              {restaurantName || "Restaurant"}
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="truncate font-medium text-gray-900">
              {item.name}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ── Image + details ─────────────────────────────── */}
          <div className="grid gap-8 md:grid-cols-2">
            {/* Image */}
            <div className="md:sticky md:top-36 md:self-start">
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-gray-100 shadow-sm">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                    }}
                  >
                    <span className="select-none text-7xl font-bold text-white/80">
                      {item.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="absolute left-3 top-3 flex gap-2">
                  {item.isPopular && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                      <Flame className="h-3 w-3" /> Popular
                    </span>
                  )}
                  {item.isFeatured && (
                    <span className="rounded-full bg-purple-500 px-3 py-1 text-xs font-semibold text-white">
                      Featured
                    </span>
                  )}
                </div>

                {hasDiscount && (
                  <div className="absolute right-3 top-3 rounded-full bg-brand-500 px-2.5 py-1 text-xs font-bold text-white">
                    -{discountPct}%
                  </div>
                )}

                {!item.isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-gray-900">
                      Currently unavailable
                    </span>
                  </div>
                )}
              </div>

              {/* At-a-glance facts under the image (desktop) */}
              {facts.length > 0 && (
                <div className="mt-4 hidden grid-cols-2 gap-2 md:grid">
                  {facts.map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-3"
                    >
                      <f.icon className="h-4 w-4 shrink-0 text-brand-500" />
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                          {f.label}
                        </p>
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {f.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
                  {item.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-2xl font-bold text-brand-500">
                    {formatTaka(item.price)}
                  </span>
                  {hasDiscount && (
                    <span className="text-lg text-gray-400 line-through">
                      {formatTaka(item.originalPrice!)}
                    </span>
                  )}
                </div>

                {(item.dietaryTags.length > 0 || spice) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.dietaryTags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
                          DIETARY_COLORS[tag.toLowerCase()] ||
                            "border-gray-200 bg-gray-100 text-gray-700",
                        )}
                      >
                        {tag.replace(/[_-]/g, " ")}
                      </span>
                    ))}
                    {spice && (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700">
                        {Array.from({ length: spice.flames }).map((_, i) => (
                          <Flame key={i} className="h-3 w-3" />
                        ))}
                        {spice.label}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {item.description && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-900">
                    Description
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {item.description}
                  </p>
                </div>
              )}

              {/* Variants */}
              {item.variants.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-900">
                    Choose an option
                  </h3>
                  <div className="space-y-2">
                    {item.variants.map((v) => {
                      const active = selectedVariant?._id === v._id;
                      return (
                        <button
                          key={v._id}
                          onClick={() => setSelectedVariant(active ? null : v)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all",
                            active
                              ? "border-brand-500 bg-brand-50"
                              : "border-gray-200 hover:border-gray-300",
                          )}
                          aria-pressed={active}
                        >
                          <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <span
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors",
                                active
                                  ? "border-brand-500 bg-brand-500"
                                  : "border-gray-300",
                              )}
                            >
                              {active && (
                                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              )}
                            </span>
                            {v.name}
                          </span>
                          <span className="text-sm font-semibold text-brand-500">
                            +{formatTaka(v.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Addons */}
              {item.addons.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-900">
                    Extras
                  </h3>
                  <div className="space-y-2">
                    {item.addons.map((a) => {
                      const active = selectedAddons.some((s) => s._id === a._id);
                      return (
                        <button
                          key={a._id}
                          onClick={() => toggleAddon(a)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all",
                            active
                              ? "border-brand-500 bg-brand-50"
                              : "border-gray-200 hover:border-gray-300",
                          )}
                          aria-pressed={active}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded border-2 transition-colors",
                                active
                                  ? "border-brand-500 bg-brand-500"
                                  : "border-gray-300",
                              )}
                            >
                              {active && <Check className="h-3 w-3 text-white" />}
                            </span>
                            <span className="text-sm text-gray-900">
                              {a.name}
                              {a.isRequired && (
                                <span className="ml-0.5 text-red-500">*</span>
                              )}
                            </span>
                          </span>
                          <span className="text-sm text-gray-500">
                            {a.price > 0 ? `+${formatTaka(a.price)}` : "Free"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Desktop action row */}
              <div className="hidden items-center gap-4 md:flex">
                <QuantityStepper quantity={quantity} setQuantity={setQuantity} />
                <Button
                  onClick={handleAddToCart}
                  variant="brand"
                  size="xl"
                  disabled={!item.isAvailable || isAdding}
                  className="flex-1 justify-between"
                >
                  <span>{item.isAvailable ? "Add to cart" : "Unavailable"}</span>
                  {item.isAvailable && <span>{formatTaka(effectivePrice)}</span>}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Information sidebar ───────────────────────────── */}
          <aside className="space-y-5">
            {/* Restaurant card */}
            {restaurant && (
              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-50">
                    {restaurant.images?.logo &&
                    !restaurant.images.logo.startsWith("placeholder") ? (
                      <img
                        src={restaurant.images.logo}
                        alt={restaurant.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Store className="h-6 w-6 text-brand-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">
                      {restaurant.name}
                    </p>
                    {restaurant.cuisineType &&
                      restaurant.cuisineType.length > 0 && (
                        <p className="truncate text-xs text-gray-500">
                          {restaurant.cuisineType.slice(0, 3).join(" · ")}
                        </p>
                      )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <SidebarStat
                    icon={Star}
                    value={
                      restaurant.rating?.average
                        ? restaurant.rating.average.toFixed(1)
                        : "New"
                    }
                    label={
                      restaurant.rating?.count
                        ? `${restaurant.rating.count} reviews`
                        : "rating"
                    }
                  />
                  <SidebarStat
                    icon={Clock}
                    value={formatDeliveryTime(restaurant.deliveryTime).replace(
                      " min",
                      "",
                    )}
                    label="min"
                  />
                  <SidebarStat
                    icon={Truck}
                    value={
                      restaurant.deliveryFee
                        ? formatTaka(restaurant.deliveryFee)
                        : "Free"
                    }
                    label="delivery"
                  />
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="mt-4 w-full"
                >
                  <Link to={`/restaurants/${restaurantId}`}>
                    View full menu
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}

            {/* Good to know */}
            {(facts.length > 0 || item.dietaryTags.length > 0) && (
              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Good to know
                </h3>
                <dl className="space-y-2.5">
                  {facts.map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <dt className="flex items-center gap-2 text-gray-500">
                        <f.icon className="h-4 w-4 text-gray-400" />
                        {f.label}
                      </dt>
                      <dd className="font-medium text-gray-900">{f.value}</dd>
                    </div>
                  ))}
                  {restaurant?.minimumOrder ? (
                    <div className="flex items-center justify-between text-sm">
                      <dt className="flex items-center gap-2 text-gray-500">
                        <ShieldCheck className="h-4 w-4 text-gray-400" />
                        Min. order
                      </dt>
                      <dd className="font-medium text-gray-900">
                        {formatTaka(restaurant.minimumOrder)}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {item.dietaryTags.length > 0 && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50/70 p-3">
                    <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-xs leading-relaxed text-emerald-800">
                      Suitable for{" "}
                      <span className="font-medium capitalize">
                        {item.dietaryTags
                          .map((t) => t.replace(/[_-]/g, " "))
                          .join(", ")}
                      </span>{" "}
                      diets.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* More from this restaurant */}
            {suggestions.length > 0 && (
              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  More from {restaurantName || "this kitchen"}
                </h3>
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <Link
                      key={s._id}
                      to={`/menu/${restaurantId}/${s._id}`}
                      className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-gray-50"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        {s.image ? (
                          <img
                            src={s.image}
                            alt={s.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center text-lg font-bold text-white/80"
                            style={{
                              background: `linear-gradient(135deg, ${itemGradient(s.name).from}, ${itemGradient(s.name).to})`,
                            }}
                          >
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {s.name}
                        </p>
                        <p className="text-sm font-semibold text-brand-500">
                          {formatTaka(s.price)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-gray-200 bg-white p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden">
        <QuantityStepper quantity={quantity} setQuantity={setQuantity} />
        <Button
          onClick={handleAddToCart}
          variant="brand"
          size="lg"
          disabled={!item.isAvailable || isAdding}
          className="flex-1 justify-between"
        >
          <span>{item.isAvailable ? "Add to cart" : "Unavailable"}</span>
          {item.isAvailable && <span>{formatTaka(effectivePrice)}</span>}
        </Button>
      </div>
    </div>
  );
};

const SidebarStat: React.FC<{
  icon: typeof Star;
  value: string;
  label: string;
}> = ({ icon: Icon, value, label }) => (
  <div className="rounded-xl bg-gray-50 py-2.5">
    <Icon className="mx-auto mb-1 h-4 w-4 text-brand-500" />
    <p className="text-sm font-bold leading-none text-gray-900">{value}</p>
    <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
      {label}
    </p>
  </div>
);

interface QuantityStepperProps {
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
}

const QuantityStepper: React.FC<QuantityStepperProps> = ({
  quantity,
  setQuantity,
}) => (
  <div className="flex shrink-0 items-center gap-2">
    <button
      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
      disabled={quantity <= 1}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 transition-colors hover:bg-gray-50 disabled:opacity-40"
      aria-label="Decrease quantity"
    >
      <Minus className="h-4 w-4" />
    </button>
    <span className="w-8 text-center text-lg font-semibold">{quantity}</span>
    <button
      onClick={() => setQuantity((q) => q + 1)}
      className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white transition-colors hover:bg-brand-600"
      aria-label="Increase quantity"
    >
      <Plus className="h-4 w-4" />
    </button>
  </div>
);

export default MenuItemDetailPage;
