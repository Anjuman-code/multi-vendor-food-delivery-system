import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useVendor } from "@/contexts/VendorContext";
import { useToast } from "@/hooks/use-toast";
import vendorService from "@/services/vendorService";
import type { MenuCategory, MenuItem, SpiceLevel, StockStatus } from "@/types/menu";
import { AnimatePresence, motion } from "framer-motion";
import {
    ChevronDown,
    ChevronRight,
    Clock,
    Edit,
    Flame,
    GripVertical,
    Loader2,
    Plus,
    Save,
    Search,
    Star,
    Trash2,
    UtensilsCrossed,
    X,
    Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Helpers ──────────────────────────────────────────────────────

/** Deterministic warm gradient per item name for photo-less items */
const ITEM_GRADIENTS = [
  { from: "#f97316", to: "#ea580c" },  // orange
  { from: "#e11d48", to: "#be123c" },  // rose
  { from: "#7c3aed", to: "#6d28d9" },  // violet
  { from: "#0891b2", to: "#0e7490" },  // cyan
  { from: "#16a34a", to: "#15803d" },  // green
  { from: "#d97706", to: "#b45309" },  // amber
  { from: "#db2777", to: "#be185d" },  // pink
  { from: "#2563eb", to: "#1d4ed8" },  // blue
];

const getItemGradient = (name: string) =>
  ITEM_GRADIENTS[name.charCodeAt(0) % ITEM_GRADIENTS.length];

const spiceConfig: Record<
  SpiceLevel,
  { label: string; color: string; dots: number }
> = {
  none: { label: "", color: "", dots: 0 },
  mild: { label: "Mild", color: "text-yellow-500", dots: 1 },
  medium: { label: "Medium", color: "text-orange-500", dots: 2 },
  hot: { label: "Hot", color: "text-red-500", dots: 3 },
  "extra-hot": { label: "Extra Hot", color: "text-red-700", dots: 4 },
};

// ── Types ────────────────────────────────────────────────────────

type CategoryModalState =
  | { type: "none" }
  | { type: "category"; category?: MenuCategory };

// ── Main page component ──────────────────────────────────────────

const VendorMenuPage: React.FC = () => {
  const { selectedRestaurantId } = useVendor();
  const { toast } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [catModal, setCatModal] = useState<CategoryModalState>({ type: "none" });

  const loadMenu = useCallback(async () => {
    if (!selectedRestaurantId) return;
    setLoading(true);
    const res = await vendorService.getMenuItems(selectedRestaurantId);
    if (res.success && res.data) {
      setCategories(res.data.categories || []);
      setItems(res.data.items || []);
      setExpandedCategories(new Set((res.data.categories || []).map((c) => c._id)));
    }
    setLoading(false);
  }, [selectedRestaurantId]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    if (!selectedRestaurantId) return;
    const res = await vendorService.toggleItemAvailability(selectedRestaurantId, item._id);
    if (res.success && res.data) {
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, ...res.data!.item } : i)),
      );
    }
  };

  const handleStockStatus = async (item: MenuItem, status: StockStatus) => {
    if (!selectedRestaurantId) return;
    const res = await vendorService.toggleItemAvailability(selectedRestaurantId, item._id, { stockStatus: status });
    if (res.success && res.data) {
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, ...res.data!.item } : i)),
      );
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedRestaurantId) return;
    const ok = await confirm({ title: "Delete item", description: "Delete this menu item? This cannot be undone.", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await vendorService.deleteMenuItem(selectedRestaurantId, itemId);
    if (res.success) {
      setItems((prev) => prev.filter((i) => i._id !== itemId));
      toast({ title: "Success", description: "Item deleted" });
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!selectedRestaurantId) return;
    const ok = await confirm({ title: "Delete category", description: "Delete this category? Items will be moved to uncategorized.", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await vendorService.deleteCategory(selectedRestaurantId, catId);
    if (res.success) {
      setCategories((prev) => prev.filter((c) => c._id !== catId));
      setItems((prev) => prev.filter((i) => i.categoryId !== catId));
      toast({ title: "Success", description: "Category deleted" });
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  const getItemsForCategory = (catId: string) =>
    filteredItems.filter((i) => i.categoryId === catId);

  const uncategorizedItems = filteredItems.filter(
    (i) => !i.categoryId || !categories.find((c) => c._id === i.categoryId),
  );

  if (!selectedRestaurantId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
          <UtensilsCrossed className="w-8 h-8 text-orange-400" />
        </div>
        <p className="text-gray-600 font-medium">No restaurant selected</p>
        <p className="text-sm text-gray-400 mt-1">Select a restaurant from the sidebar to manage its menu.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 animate-spin text-orange-400" />
      </div>
    );
  }

  const totalItems = items.length;
  const availableItems = items.filter((i) => i.isAvailable && i.stockStatus === "available").length;

  return (
    <div className="space-y-5">
      {/* ── Stats strip ─────────────────────────────────────── */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900">{totalItems}</span>
          <span className="text-sm text-gray-500">items</span>
        </div>
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span className="text-sm text-gray-600">{availableItems} available</span>
        </div>
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{categories.length} categories</span>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white rounded-lg border-gray-200 h-9 text-sm focus-visible:ring-orange-400/40"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCatModal({ type: "category" })}
            className="h-9 rounded-lg gap-1.5 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 text-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Category
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/vendor/menu/items/new")}
            className="h-9 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-1.5 text-sm shadow-sm shadow-orange-200"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </Button>
        </div>
      </div>

      {/* ── Categories & Items ───────────────────────────────── */}
      <div className="space-y-3">
        {categories.map((cat, idx) => {
          const catItems = getItemsForCategory(cat._id);
          const isExpanded = expandedCategories.has(cat._id);
          return (
            <motion.div
              key={cat._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="bg-white rounded-xl border border-gray-200/80 overflow-hidden shadow-sm"
            >
              {/* Category header */}
              <div
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50/70 transition-colors select-none"
                onClick={() => toggleCategory(cat._id)}
              >
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                <div className="w-6 flex justify-center shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                {cat.icon && (
                  <span className="text-lg leading-none">{cat.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm">{cat.name}</h3>
                    {cat.availableFrom && cat.availableUntil && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-medium border border-blue-100">
                        {cat.availableFrom}–{cat.availableUntil}
                      </span>
                    )}
                  </div>
                  {cat.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{cat.description}</p>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                  {catItems.length}
                </span>
                <div
                  className="flex items-center gap-0.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => navigate("/vendor/menu/items/new")}
                    className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors font-medium"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                  <button
                    onClick={() => setCatModal({ type: "category", category: cat })}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit category"
                  >
                    <Edit className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat._id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              </div>

              {/* Items grid */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-100">
                      {catItems.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                            <UtensilsCrossed className="w-5 h-5 text-gray-300" />
                          </div>
                          <p className="text-sm text-gray-400">
                            No items yet —{" "}
                            <button
                              onClick={() => navigate("/vendor/menu/items/new")}
                              className="text-orange-500 hover:text-orange-600 font-medium"
                            >
                              add one
                            </button>
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
                          {catItems.map((item) => (
                            <ItemCard
                              key={item._id}
                              item={item}
                              onToggleAvailability={() => handleToggleAvailability(item)}
                              onStockStatus={(s) => handleStockStatus(item, s)}
                              onEdit={() => navigate(`/vendor/menu/items/${item._id}/edit`)}
                              onDelete={() => handleDeleteItem(item._id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* Uncategorized */}
        {uncategorizedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-amber-200/70 overflow-hidden shadow-sm"
          >
            <div className="px-4 py-3.5 border-b border-amber-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-amber-800 text-sm">Uncategorized</h3>
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {uncategorizedItems.length}
                  </span>
                </div>
                <p className="text-xs text-amber-500 mt-0.5">
                  {categories.length === 0
                    ? "Create a category to organize your menu"
                    : "Assign these items to a category"}
                </p>
              </div>
              {categories.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCatModal({ type: "category" })}
                  className="text-xs h-7 gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <Plus className="w-3 h-3" /> Create Category
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
              {uncategorizedItems.map((item) => (
                <ItemCard
                  key={item._id}
                  item={item}
                  onToggleAvailability={() => handleToggleAvailability(item)}
                  onStockStatus={(s) => handleStockStatus(item, s)}
                  onEdit={() => navigate(`/vendor/menu/items/${item._id}/edit`)}
                  onDelete={() => handleDeleteItem(item._id)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {categories.length === 0 && items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center mb-5 border border-orange-100">
              <UtensilsCrossed className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Your menu is empty</h3>
            <p className="text-sm text-gray-400 mb-6 text-center max-w-xs">
              Start by creating a category, then add items to build your menu.
            </p>
            <Button
              onClick={() => setCatModal({ type: "category" })}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white gap-2 shadow-sm shadow-orange-200"
            >
              <Plus className="w-4 h-4" />
              Add First Category
            </Button>
          </motion.div>
        )}
      </div>

      {/* Category modal */}
      <AnimatePresence>
        {catModal.type === "category" && (
          <CategoryModal
            category={catModal.category}
            restaurantId={selectedRestaurantId}
            onClose={() => setCatModal({ type: "none" })}
            onSaved={loadMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Item Card ────────────────────────────────────────────────────

const ItemCard: React.FC<{
  item: MenuItem;
  onToggleAvailability: () => void;
  onStockStatus: (status: StockStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ item, onToggleAvailability, onStockStatus, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const statusConfig = useMemo(() => {
    if (item.stockStatus === "out_of_stock")
      return { label: "Out of Stock", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" };
    if (item.stockStatus === "hidden" || !item.isAvailable)
      return { label: "Hidden", bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" };
    return { label: "Available", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" };
  }, [item.stockStatus, item.isAvailable]);

  const gradient = getItemGradient(item.name);
  const initial = item.name.charAt(0).toUpperCase();
  const hasImage = Boolean(item.image);
  const spice = item.spiceLevel && item.spiceLevel !== "none" ? spiceConfig[item.spiceLevel] : null;
  const discount =
    item.originalPrice && item.originalPrice > item.price
      ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white rounded-xl border border-gray-200/80 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
    >
      {/* Image / Gradient placeholder */}
      <div className="relative h-32 shrink-0 overflow-hidden">
        {hasImage ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
          >
            <span className="text-4xl font-bold text-white/80 select-none">{initial}</span>
          </div>
        )}

        {/* Overlay on hover */}
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

        {/* Action buttons (hover) */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={onEdit}
            className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
            title="Edit"
          >
            <Edit className="w-3.5 h-3.5 text-gray-700" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col flex-1">
        {/* Name + price */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 flex-1">{item.name}</h4>
          <div className="text-right shrink-0">
            <span className="font-bold text-gray-900 text-sm">৳{item.price}</span>
            {item.originalPrice && item.originalPrice > item.price && (
              <div className="text-[10px] text-gray-400 line-through leading-none">৳{item.originalPrice}</div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 line-clamp-2 mb-2 flex-1">{item.description}</p>

        {/* Dietary tags */}
        {item.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.dietaryTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  background:
                    tag === "halal"
                      ? "#ecfdf5"
                      : tag === "vegetarian" || tag === "vegan"
                        ? "#f0fdf4"
                        : "#fff7ed",
                  color:
                    tag === "halal"
                      ? "#065f46"
                      : tag === "vegetarian" || tag === "vegan"
                        ? "#166534"
                        : "#9a3412",
                }}
              >
                {tag}
              </span>
            ))}
            {item.dietaryTags.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
                +{item.dietaryTags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Extras line */}
        {(item.variants.length > 0 || item.addons.length > 0) && (
          <p className="text-[10px] text-gray-400 mb-2">
            {item.variants.length > 0 && `${item.variants.length} size${item.variants.length > 1 ? "s" : ""}`}
            {item.variants.length > 0 && item.addons.length > 0 && " · "}
            {item.addons.length > 0 && `${item.addons.length} add-on${item.addons.length > 1 ? "s" : ""}`}
          </p>
        )}

        {/* Status & meta row */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 mt-auto">
          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium cursor-pointer transition-colors ${statusConfig.bg} ${statusConfig.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
              {statusConfig.label}
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
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
                        onClick={() => { onStockStatus(s); setMenuOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${
                          item.stockStatus === s ? "text-orange-600 font-semibold" : "text-gray-600"
                        }`}
                      >
                        {s === "available" ? "Available" : s === "out_of_stock" ? "Out of Stock" : "Hidden"}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Right meta */}
          <div className="flex items-center gap-2">
            {spice && (
              <span className={`flex items-center gap-0.5 text-[10px] font-medium ${spice.color}`} title={spice.label}>
                {Array.from({ length: spice.dots }).map((_, i) => (
                  <Flame key={i} className="w-2.5 h-2.5" />
                ))}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <Clock className="w-2.5 h-2.5" />
              {item.preparationTime}m
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Category Modal ───────────────────────────────────────────────

const CategoryModal: React.FC<{
  category?: MenuCategory;
  restaurantId: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ category, restaurantId, onClose, onSaved }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [catName, setCatName] = useState(category?.name || "");
  const [catDesc, setCatDesc] = useState(category?.description || "");
  const [catIcon, setCatIcon] = useState(category?.icon || "");
  const [catError, setCatError] = useState("");

  const handleSave = async () => {
    if (!catName.trim()) {
      setCatError("Category name is required.");
      return;
    }
    setSaving(true);
    setCatError("");
    const data = {
      name: catName.trim(),
      description: catDesc.trim(),
      icon: catIcon.trim() || undefined,
    };
    const res = category
      ? await vendorService.updateCategory(restaurantId, category._id, data)
      : await vendorService.createCategory(restaurantId, data);
    if (res.success) {
      toast({ title: "Success", description: category ? "Category updated" : "Category created" });
      onSaved();
      onClose();
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {category ? "Edit Category" : "New Category"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Organise your menu items into sections</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {catError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {catError}
          </p>
        )}

        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-14">
              <Label className="text-xs text-gray-600">Icon</Label>
              <Input
                value={catIcon}
                onChange={(e) => setCatIcon(e.target.value)}
                placeholder="🍛"
                className="mt-1 text-center text-lg h-9"
                maxLength={2}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-gray-600">Name *</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Appetizers"
                className="mt-1 h-9 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-600">Description <span className="text-gray-400">(optional)</span></Label>
            <Textarea
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="A brief description of this category"
              rows={2}
              className="mt-1 text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-lg h-9"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className="h-9 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2 shadow-sm shadow-orange-200 min-w-20"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VendorMenuPage;
