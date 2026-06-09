import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import menuService from "@/services/menuService";
import type { MenuItem, MenuItemAddon, MenuItemVariant } from "@/types/menu";
import { cn } from "@/utils/cn";
import {
  ArrowLeft,
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

const MenuItemDetailPage: React.FC = () => {
  const { restaurantId, itemId } = useParams<{
    restaurantId: string;
    itemId: string;
  }>();
  const navigate = useNavigate();
  const { addItem, isRestaurantMismatch, clearCart } = useCart();
  const { toast } = useToast();

  const [item, setItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
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
  }, [restaurantId, itemId]);

  const toggleAddon = useCallback((addon: MenuItemAddon) => {
    setSelectedAddons((prev) =>
      prev.some((a) => a._id === addon._id)
        ? prev.filter((a) => a._id !== addon._id)
        : [...prev, addon],
    );
  }, []);

  const effectivePrice = useMemo(() => {
    if (!item) return 0;
    const base = item.price;
    const variantDelta = selectedVariant ? selectedVariant.price : 0;
    const addonTotal = selectedAddons.reduce((s, a) => s + a.price, 0);
    return (base + variantDelta + addonTotal) * quantity;
  }, [item, selectedVariant, selectedAddons, quantity]);

  const handleAddToCart = useCallback(() => {
    if (!item || !restaurantId) return;

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

    if (isRestaurantMismatch(restaurantId)) {
      clearCart();
      setTimeout(() => {
        addItem(restaurantId, "", cartItem);
      }, 0);
    } else {
      addItem(restaurantId, "", cartItem);
    }

    toast({
      title: "Added to cart",
      description: `${item.name} (${quantity}x) has been added to your cart.`,
    });
  }, [
    item,
    restaurantId,
    quantity,
    selectedVariant,
    selectedAddons,
    addItem,
    isRestaurantMismatch,
    clearCart,
    toast,
  ]);

  // ── Loading state ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-[4/3] rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────
  if (error || !item) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <Flame className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Item not found
        </h2>
        <p className="text-gray-600 mb-6">{error || "This item may have been removed."}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go back
        </Button>
      </div>
    );
  }

  const gradient = itemGradient(item.name);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500 truncate">
            <Link
              to={`/restaurants/${restaurantId}`}
              className="hover:text-orange-500 transition-colors truncate"
            >
              Restaurant
            </Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-gray-900 font-medium truncate">
              {item.name}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* ── Image ───────────────────────────────────────── */}
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                }}
              >
                <span className="text-6xl font-bold text-white/80 select-none">
                  {item.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              {item.isPopular && (
                <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0">
                  <Flame className="w-3 h-3 mr-1" /> Popular
                </Badge>
              )}
              {item.isFeatured && (
                <Badge className="bg-purple-500 hover:bg-purple-600 text-white border-0">
                  Featured
                </Badge>
              )}
            </div>

            {item.originalPrice && item.originalPrice > item.price && (
              <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                -
                {Math.round(
                  ((item.originalPrice - item.price) / item.originalPrice) * 100,
                )}
                %
              </div>
            )}
          </div>

          {/* ── Details ─────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            {/* Name + Price */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {item.name}
              </h1>

              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-2xl font-bold text-orange-500">
                  ৳{item.price}
                </span>
                {item.originalPrice && item.originalPrice > item.price && (
                  <span className="text-lg text-gray-400 line-through">
                    ৳{item.originalPrice}
                  </span>
                )}
              </div>

              {/* Tags */}
              {item.dietaryTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {item.dietaryTags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "text-[11px] font-medium px-2.5 py-1 rounded-full border",
                        DIETARY_COLORS[tag.toLowerCase()] ||
                          "bg-gray-100 text-gray-700 border-gray-200",
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                {item.preparationTime > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {item.preparationTime} min
                  </span>
                )}
                {item.calories && (
                  <span>{item.calories} cal</span>
                )}
                {item.servingSize && (
                  <span>{item.servingSize}</span>
                )}
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1 uppercase tracking-wider">
                  Description
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            )}

            {/* Variants */}
            {item.variants.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider">
                  Choose an option
                </h3>
                <div className="space-y-2">
                  {item.variants.map((v) => (
                    <button
                      key={v._id}
                      onClick={() => setSelectedVariant(v)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left",
                        selectedVariant?._id === v._id
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300",
                      )}
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {v.name}
                      </span>
                      <span className="text-sm font-semibold text-orange-500">
                        +৳{v.price}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Addons */}
            {item.addons.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider">
                  Extras
                </h3>
                <div className="space-y-2">
                  {item.addons.map((a) => (
                    <button
                      key={a._id}
                      onClick={() => toggleAddon(a)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left",
                        selectedAddons.some((s) => s._id === a._id)
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                            selectedAddons.some((s) => s._id === a._id)
                              ? "border-orange-500 bg-orange-500"
                              : "border-gray-300",
                          )}
                        >
                          {selectedAddons.some((s) => s._id === a._id) && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm text-gray-900">
                          {a.name}
                          {a.isRequired && (
                            <span className="text-red-500 ml-0.5">*</span>
                          )}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {a.price > 0 ? `+৳${a.price}` : "Free"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bottom bar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-4 sticky bottom-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-semibold text-lg">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={!item.isAvailable}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-6 rounded-xl text-base"
              >
                Add to Cart — ৳{effectivePrice}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuItemDetailPage;
