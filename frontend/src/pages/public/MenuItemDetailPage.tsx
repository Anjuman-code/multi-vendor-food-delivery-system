import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
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
  Minus,
  Plus,
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

const formatTaka = (amount: number): string => `৳${Math.round(amount)}`;

const MenuItemDetailPage: React.FC = () => {
  const { restaurantId, itemId } = useParams<{
    restaurantId: string;
    itemId: string;
  }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();

  const [item, setItem] = useState<MenuItem | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] =
    useState<MenuItemVariant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<MenuItemAddon[]>([]);

  useEffect(() => {
    if (!restaurantId || !itemId) {
      setError("Invalid item");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    menuService
      .getMenuItem(restaurantId, itemId)
      .then((res) => {
        if (res.success && res.data?.item) {
          setItem(res.data.item);
        } else {
          setError(res.message || "Failed to load menu item.");
        }
      })
      .catch(() => {
        setError("Something went wrong. Please try again.");
      })
      .finally(() => setIsLoading(false));

    // Fetch the restaurant name so the cart entry and breadcrumb are correct.
    apiService
      .getRestaurantById(restaurantId)
      .then((res) => {
        const payload = res.data as { data?: { name?: string } };
        setRestaurantName(payload?.data?.name || "");
      })
      .catch(() => {
        /* non-blocking: name is a nicety, not required to order */
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
      toast({
        title: "Added to cart",
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
    toast,
  ]);

  // ── Loading state ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-24">
        <Skeleton className="mb-6 h-6 w-32" />
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
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
          <Flame className="h-8 w-8 text-red-400" />
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

  return (
    <div className="min-h-screen bg-gray-50/60 pb-28">
      {/* Breadcrumb header */}
      <div className="sticky top-20 z-30 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
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
            <span className="truncate font-medium text-gray-900">{item.name}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* ── Image ───────────────────────────────────────── */}
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
            </div>
          </div>

          {/* ── Details ─────────────────────────────────────── */}
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

              {item.dietaryTags.length > 0 && (
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
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {item.preparationTime > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {item.preparationTime} min
                  </span>
                )}
                {item.calories ? <span>{item.calories} cal</span> : null}
                {item.servingSize ? <span>{item.servingSize}</span> : null}
              </div>
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
                        onClick={() =>
                          setSelectedVariant(active ? null : v)
                        }
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
                            {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
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
