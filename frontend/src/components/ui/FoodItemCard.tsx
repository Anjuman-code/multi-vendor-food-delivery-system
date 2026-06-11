/**
 * FoodItemCard — unified food item rendering component.
 *
 * Variants:
 *  - grid     : vertical card (menu pages, search results). Default.
 *               On mobile automatically collapses to list layout.
 *  - list     : compact horizontal row (restaurant detail, dense lists).
 *  - highlight: prominent full-bleed card (landing page carousel / featured).
 *  - vendor   : vendor dashboard card with availability toggle + edit/delete.
 *  - cart     : minimal inline summary (cart page).
 */

import type { SpiceLevel, StockStatus } from "@/types/menu";
import { cn } from "@/utils/cn";
import { foodFallbackSVG } from "@/utils/fallbackImages";
import { AnimatePresence, motion } from "framer-motion";
import {
    Clock,
    Edit,
    Flame,
    MessageSquare,
    Minus,
    Plus,
    ShoppingBag,
    Star,
    Trash2,
    Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";

// ── Dietary tag colour map ─────────────────────────────────────────────────

const DIETARY_TAG_STYLES: Record<string, { bg: string; text: string }> = {
  halal: { bg: "#ecfdf5", text: "#065f46" },
  vegetarian: { bg: "#f0fdf4", text: "#166534" },
  vegan: { bg: "#f0fdf4", text: "#166534" },
  gluten_free: { bg: "#eff6ff", text: "#1e40af" },
  "gluten-free": { bg: "#eff6ff", text: "#1e40af" },
  spicy: { bg: "#fff7ed", text: "#9a3412" },
};
const DEFAULT_TAG_STYLE = { bg: "#f3f4f6", text: "#374151" };

function tagStyle(tag: string) {
  const key = tag.toLowerCase().replace(/[\s-]/g, "_");
  return DIETARY_TAG_STYLES[key] ?? DIETARY_TAG_STYLES[tag.toLowerCase()] ?? DEFAULT_TAG_STYLE;
}

// ── Gradient fallback (deterministic per name) ─────────────────────────────

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

// ── Spice config ───────────────────────────────────────────────────────────

const SPICE_CFG: Record<string, { label: string; color: string; dots: number }> = {
  none: { label: "", color: "", dots: 0 },
  mild: { label: "Mild", color: "text-yellow-500", dots: 1 },
  medium: { label: "Medium", color: "text-orange-500", dots: 2 },
  hot: { label: "Hot", color: "text-red-500", dots: 3 },
  "extra-hot": { label: "Extra Hot", color: "text-red-700", dots: 4 },
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface FoodItemData {
  id: string | number;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  /** Primary image URL */
  image?: string;
  isAvailable?: boolean;
  stockStatus?: StockStatus;
  dietaryTags?: string[];
  prepTimeMinutes?: number;
  variants?: Array<{ id?: string; name: string; price?: number; priceDelta?: number }>;
  addons?: Array<{ id?: string; name: string; price?: number }>;
  category?: string;
  rating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  isPopular?: boolean;
  spiceLevel?: SpiceLevel;
  // Cart-specific
  itemKey?: string;
  quantity?: number;
  specialInstructions?: string;
  lineTotal?: number;
}

export interface FoodItemCardProps {
  item: FoodItemData;
  variant?: "grid" | "list" | "highlight" | "vendor" | "cart";
  /** Current quantity already in cart (for grid/list variants) */
  cartQuantity?: number;
  // ── Customer callbacks ────────────────────────────────────────
  onClick?: (item: FoodItemData) => void;
  onAddToCart?: (item: FoodItemData) => void;
  /** qty=0 means remove */
  onUpdateQuantity?: (id: string | number, qty: number) => void;
  // ── Vendor callbacks ─────────────────────────────────────────
  onToggleAvailability?: (itemId: string | number) => void;
  onStockStatus?: (status: StockStatus) => void;
  onEdit?: (itemId: string | number) => void;
  onDelete?: (itemId: string | number) => void;
  // ── Cart callbacks ────────────────────────────────────────────
  onRemove?: (itemKey: string | number) => void;
  className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Resolve effective stock / availability status */
function resolveStockStatus(item: FoodItemData): StockStatus {
  if (item.stockStatus) return item.stockStatus;
  return item.isAvailable === false ? "hidden" : "available";
}

const VENDOR_STATUS_CFG = {
  available: { label: "Available", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  out_of_stock: { label: "Out of Stock", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  hidden: { label: "Hidden", bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
};

/** Reusable image element with object-cover and fallback */
function ItemImage({
  src,
  alt,
  className,
  gradient,
  initial,
}: {
  src?: string;
  alt: string;
  className?: string;
  gradient: { from: string; to: string };
  initial: string;
}) {
  const [failed, setFailed] = useState(false);
  const showGradient = !src || failed;

  if (showGradient) {
    return (
      <div
        className={cn("w-full h-full flex items-center justify-center", className)}
        style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
      >
        <span className="text-3xl font-bold text-white/80 select-none">{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={src || foodFallbackSVG}
      alt={alt}
      className={cn("w-full h-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}

/** Dietary tag chips, max `max` shown, rest shown as +N */
function DietaryTags({
  tags,
  max = 3,
  className,
}: {
  tags?: string[];
  max?: number;
  className?: string;
}) {
  if (!tags || tags.length === 0) return null;
  const visible = tags.slice(0, max);
  const overflow = tags.length - max;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visible.map((tag) => {
        const s = tagStyle(tag);
        return (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize"
            style={{ background: s.bg, color: s.text }}
          >
            {tag}
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
          +{overflow}
        </span>
      )}
    </div>
  );
}

/** Qty stepper used in grid/list variants */
function QtyControls({
  qty,
  onDecrease,
  onIncrease,
  size = "sm",
}: {
  qty: number;
  onDecrease: (e: React.MouseEvent) => void;
  onIncrease: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
}) {
  const btnCls = size === "md"
    ? "w-10 h-10 rounded-xl"
    : "w-9 h-9 rounded-lg";
  return (
    <div className="flex items-center gap-1">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onDecrease}
        className={cn(
          "bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-all flex items-center justify-center min-w-[44px] min-h-[44px]",
          btnCls,
        )}
        aria-label="Decrease quantity"
      >
        <Minus className="w-4 h-4" />
      </motion.button>
      <motion.span
        key={qty}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className="text-gray-900 font-bold text-base w-7 text-center"
      >
        {qty}
      </motion.span>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onIncrease}
        className={cn(
          "bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-all flex items-center justify-center min-w-[44px] min-h-[44px]",
          btnCls,
        )}
        aria-label="Increase quantity"
      >
        <Plus className="w-4 h-4" />
      </motion.button>
    </div>
  );
}

// ── Vendor Status Dropdown ─────────────────────────────────────────────────

function VendorStatusDropdown({
  stockStatus,
  onStockStatus,
}: {
  stockStatus: StockStatus;
  onStockStatus?: (s: StockStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = VENDOR_STATUS_CFG[stockStatus] ?? VENDOR_STATUS_CFG.available;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium cursor-pointer transition-colors",
          cfg.bg,
          cfg.text,
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
        {cfg.label}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.1 }}
              className="absolute bottom-full left-0 mb-1.5 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-20 w-36"
            >
              {(["available", "out_of_stock", "hidden"] as StockStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onStockStatus?.(s);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors",
                    stockStatus === s ? "text-orange-600 font-semibold" : "text-gray-600",
                  )}
                >
                  {VENDOR_STATUS_CFG[s].label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Out-of-stock overlay ───────────────────────────────────────────────────

function OutOfStockOverlay() {
  return (
    <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center z-10 rounded-inherit">
      <span className="bg-white/90 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full shadow">
        Out of Stock
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

const FoodItemCard: React.FC<FoodItemCardProps> = ({
  item,
  variant = "grid",
  cartQuantity = 0,
  onClick,
  onAddToCart,
  onUpdateQuantity,
  onToggleAvailability,
  onStockStatus,
  onEdit,
  onDelete,
  onRemove,
  className,
}) => {
  const gradient = useMemo(() => itemGradient(item.name), [item.name]);
  const initial = item.name.charAt(0).toUpperCase();

  const stockStatus = resolveStockStatus(item);
  const isOutOfStock = stockStatus === "out_of_stock";

  const discount = useMemo(
    () =>
      item.originalPrice && item.originalPrice > item.price
        ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
        : null,
    [item.originalPrice, item.price],
  );

  const spice = useMemo(
    () =>
      item.spiceLevel && item.spiceLevel !== "none"
        ? (SPICE_CFG[item.spiceLevel] ?? null)
        : null,
    [item.spiceLevel],
  );

  // ── HIGHLIGHT variant ──────────────────────────────────────────────────
  if (variant === "highlight") {
    return (
      <div className={cn("relative w-full h-full overflow-hidden rounded-3xl", className)}>
        <ItemImage
          src={item.image}
          alt={item.name}
          gradient={gradient}
          initial={initial}
          className="group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {item.isFeatured && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold px-2 py-1 rounded-full bg-yellow-400 text-yellow-900 shadow">
              <Zap className="w-2.5 h-2.5" /> Featured
            </span>
          )}
          {item.isPopular && !item.isFeatured && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white shadow">
              <Star className="w-2.5 h-2.5 fill-current" /> Popular
            </span>
          )}
        </div>

        {/* Rating badge */}
        {item.rating != null && (
          <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-white text-xs font-bold">{item.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Bottom overlay content */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-10">
          {item.category && (
            <p className="text-orange-400 font-medium tracking-widest text-[10px] uppercase mb-1">
              {item.category}
            </p>
          )}
          <h3 className="text-xl font-bold text-white leading-snug mb-3 line-clamp-2">
            {item.name}
          </h3>

          <div className="flex items-center justify-between gap-3">
            <span className="text-2xl font-bold text-white">
              ৳{item.price.toFixed(2)}
            </span>
            {onAddToCart && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onAddToCart(item)}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-4 py-2.5 rounded-full font-bold text-sm transition-all shadow min-h-[44px]"
              >
                <ShoppingBag className="w-4 h-4" />
                Order
              </motion.button>
            )}
          </div>
        </div>

        {isOutOfStock && <OutOfStockOverlay />}
      </div>
    );
  }

  // ── VENDOR variant ─────────────────────────────────────────────────────
  if (variant === "vendor") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "group bg-white rounded-xl border border-gray-200/80 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col",
          className,
        )}
      >
        {/* Image */}
        <div className="relative h-32 shrink-0 overflow-hidden">
          <ItemImage
            src={item.image}
            alt={item.name}
            gradient={gradient}
            initial={initial}
            className="group-hover:scale-105 transition-transform duration-300"
          />

          {/* Hover dark overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />

          {/* Top badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {item.isFeatured && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-yellow-400 text-yellow-900 shadow-sm">
                <Zap className="w-2.5 h-2.5" /> Featured
              </span>
            )}
            {item.isPopular && !item.isFeatured && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/90 text-orange-600 shadow-sm">
                <Star className="w-2.5 h-2.5" /> Popular
              </span>
            )}
            {discount && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-500 text-white shadow-sm">
                -{discount}%
              </span>
            )}
          </div>

          {/* Edit/Delete (hover) */}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {onEdit && (
              <button
                onClick={() => onEdit(item.id)}
                className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                title="Edit"
              >
                <Edit className="w-3.5 h-3.5 text-gray-700" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(item.id)}
                className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            )}
          </div>

          {isOutOfStock && (
            <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
              <span className="bg-white/90 text-gray-700 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-3 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 flex-1">
              {item.name}
            </h4>
            <div className="text-right shrink-0">
              <span className="font-bold text-gray-900 text-sm">৳{item.price}</span>
              {item.originalPrice && item.originalPrice > item.price && (
                <div className="text-[10px] text-gray-400 line-through leading-none">
                  ৳{item.originalPrice}
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400 line-clamp-2 mb-2 flex-1">{item.description}</p>

          <DietaryTags tags={item.dietaryTags} className="mb-2" />

          {(item.variants?.length || item.addons?.length) ? (
            <p className="text-[10px] text-gray-400 mb-2">
              {item.variants?.length
                ? `${item.variants.length} size${item.variants.length > 1 ? "s" : ""}`
                : ""}
              {item.variants?.length && item.addons?.length ? " · " : ""}
              {item.addons?.length
                ? `${item.addons.length} add-on${item.addons.length > 1 ? "s" : ""}`
                : ""}
            </p>
          ) : null}

          {/* Status & meta */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 mt-auto">
            <VendorStatusDropdown stockStatus={stockStatus} onStockStatus={onStockStatus} />

            <div className="flex items-center gap-2">
              {spice && (
                <span className={cn("flex items-center gap-0.5 text-[10px] font-medium", spice.color)}>
                  {Array.from({ length: spice.dots }).map((_, i) => (
                    <Flame key={i} className="w-2.5 h-2.5" />
                  ))}
                </span>
              )}
              {item.prepTimeMinutes != null && (
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Clock className="w-2.5 h-2.5" />
                  {item.prepTimeMinutes}m
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── CART variant ───────────────────────────────────────────────────────
  if (variant === "cart") {
    const qty = item.quantity ?? 1;
    const lineTotal = item.lineTotal ?? item.price * qty;
    const cartKey = item.itemKey ?? item.id;

    return (
      <div className={cn("flex items-stretch", className)}>
        {/* Thumbnail */}
        <div className="w-24 sm:w-28 flex-shrink-0 overflow-hidden">
          <ItemImage
            src={item.image}
            alt={item.name}
            gradient={gradient}
            initial={initial}
            className="h-full"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                {item.name}
              </h3>
              {onRemove && (
                <button
                  onClick={() => onRemove(cartKey)}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 p-0.5 min-w-[44px] min-h-[44px] flex items-center justify-end"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Variants / addons summary */}
            {((item.variants?.length ?? 0) > 0 || (item.addons?.length ?? 0) > 0) && (
              <div className="mt-1 space-y-0.5">
                {item.variants && item.variants.length > 0 && (
                  <p className="text-xs text-gray-400">
                    {item.variants.map((v) => v.name).join(", ")}
                  </p>
                )}
                {item.addons && item.addons.length > 0 && (
                  <p className="text-xs text-gray-400">
                    +{item.addons.map((a) => a.name).join(", ")}
                  </p>
                )}
              </div>
            )}

            {item.specialInstructions && (
              <div className="flex items-start gap-1 mt-1.5">
                <MessageSquare className="h-3 w-3 text-gray-300 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-400 italic leading-snug">
                  {item.specialInstructions}
                </p>
              </div>
            )}
          </div>

          {/* Price + qty */}
          <div className="flex items-center justify-between mt-3">
            <div>
              <p className="text-xs text-gray-400">৳{item.price.toFixed(0)} each</p>
              <p className="text-sm font-bold text-gray-900">৳{lineTotal.toFixed(2)}</p>
            </div>

            {onUpdateQuantity && (
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-1 py-1">
                <button
                  className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors disabled:opacity-40"
                  onClick={() => onUpdateQuantity(cartKey, qty - 1)}
                  disabled={qty <= 1}
                  aria-label="Decrease"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-6 text-center text-sm font-semibold text-gray-800">{qty}</span>
                <button
                  className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                  onClick={() => onUpdateQuantity(cartKey, qty + 1)}
                  aria-label="Increase"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── LIST variant ──────────────────────────────────────────────────────
  // Also used as the mobile-collapsed form of `grid`
  if (variant === "list") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClick ? () => onClick(item) : undefined}
        className={cn(
          "flex gap-4 p-3 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all duration-300 group",
          onClick && "cursor-pointer",
          className,
        )}
      >
        {/* Optional thumbnail */}
        {item.image && (
          <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden">
            <ItemImage
              src={item.image}
              alt={item.name}
              gradient={gradient}
              initial={initial}
            />
            {isOutOfStock && (
              <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center rounded-xl">
                <span className="bg-white/90 text-gray-700 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                  OOS
                </span>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 text-sm leading-snug group-hover:text-orange-500 transition-colors line-clamp-1">
                {item.name}
              </p>
              {item.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
              )}
              <DietaryTags tags={item.dietaryTags} max={2} className="mt-1" />
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
              <span className="text-orange-600 font-semibold text-sm whitespace-nowrap">
                ৳{item.price}
                {discount && (
                  <span className="ml-1.5 text-gray-400 line-through font-normal text-xs">
                    ৳{item.originalPrice}
                  </span>
                )}
              </span>

              {/* Action */}
              {cartQuantity > 0 && onUpdateQuantity ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateQuantity(item.id, cartQuantity - 1);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 transition-colors min-h-[44px] min-w-[44px]"
                    aria-label="Decrease"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-medium text-sm text-gray-900">{cartQuantity}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateQuantity(item.id, cartQuantity + 1);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors min-h-[44px] min-w-[44px]"
                    aria-label="Increase"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : onAddToCart ? (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(item);
                  }}
                  disabled={isOutOfStock}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-sm hover:shadow-md transition-all min-h-[44px] min-w-[44px]"
                  aria-label="Add to cart"
                >
                  <ShoppingBag className="w-4 h-4" />
                </motion.button>
              ) : null}
            </div>
          </div>

          {/* Meta row */}
          {(item.prepTimeMinutes != null || item.rating != null) && (
            <div className="flex items-center gap-3 mt-1.5">
              {item.rating != null && (
                <span className="flex items-center gap-0.5 text-xs text-gray-500">
                  <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
                  {item.rating.toFixed(1)}
                </span>
              )}
              {item.prepTimeMinutes != null && (
                <span className="flex items-center gap-0.5 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {item.prepTimeMinutes}m
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ── GRID variant (default) ────────────────────────────────────────────
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick ? () => onClick(item) : undefined}
      className={cn(
        // On xs/mobile → horizontal list layout; on sm+ → vertical card
        "bg-white border border-gray-100 hover:shadow-xl transition-all duration-300 group overflow-hidden",
        "flex flex-row sm:flex-col", // mobile: horizontal; desktop: vertical
        "rounded-2xl",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {/* Image: square on mobile, full-width 4:3 on desktop */}
      <div className="relative flex-shrink-0 w-28 sm:w-auto sm:aspect-[4/3] overflow-hidden">
        <motion.div
          className="w-full h-full"
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.4 }}
        >
          <ItemImage
            src={item.image}
            alt={item.name}
            gradient={gradient}
            initial={initial}
            className="h-full"
          />
        </motion.div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Discount badge */}
        {discount && (
          <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
            -{discount}%
          </div>
        )}

        {/* Popular / Featured badge */}
        {(item.isFeatured || item.isPopular) && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-0.5 shadow-md">
            {item.isFeatured ? (
              <>
                <Zap className="w-2.5 h-2.5" /> Featured
              </>
            ) : (
              <>
                <Flame className="w-2.5 h-2.5" /> Popular
              </>
            )}
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
            <span className="bg-white/90 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 sm:p-5">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-orange-500 transition-colors line-clamp-1 mb-1">
          {item.name}
        </h3>

        {/* Rating + Prep time */}
        <div className="flex items-center gap-3 mb-1.5">
          {item.rating != null && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
              <span className="text-xs font-medium text-gray-900">{item.rating}</span>
              {item.reviewCount != null && (
                <span className="text-[10px] text-gray-500">({item.reviewCount})</span>
              )}
            </div>
          )}
          {item.prepTimeMinutes != null && (
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="w-3 h-3" />
              <span className="text-[10px]">{item.prepTimeMinutes}m</span>
            </div>
          )}
        </div>

        <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2 flex-1 hidden sm:block">
          {item.description}
        </p>

        <DietaryTags tags={item.dietaryTags} className="mb-3 hidden sm:flex" />

        {/* Price + action */}
        <div className="flex items-center justify-between gap-2 mt-auto">
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold text-gray-900">
              ৳{item.price}
            </span>
            {item.originalPrice && item.originalPrice > item.price && (
              <span className="text-[10px] text-gray-400 line-through">
                ৳{item.originalPrice}
              </span>
            )}
          </div>

          {cartQuantity > 0 && onUpdateQuantity ? (
            <QtyControls
              qty={cartQuantity}
              onDecrease={(e) => {
                e.stopPropagation();
                onUpdateQuantity(item.id, cartQuantity - 1);
              }}
              onIncrease={(e) => {
                e.stopPropagation();
                onUpdateQuantity(item.id, cartQuantity + 1);
              }}
            />
          ) : onAddToCart ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(item);
              }}
              disabled={isOutOfStock}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all min-h-[44px] min-w-[44px]"
              aria-label="Add to cart"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
};

export default FoodItemCard;
