import { Button } from "@/components/ui/button";
import FoodItemCard from "@/components/ui/FoodItemCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useVendor } from "@/contexts/VendorContext";
import { useToast } from "@/hooks/use-toast";
import vendorService from "@/services/vendorService";
import type { MenuCategory, MenuItem, StockStatus } from "@/types/menu";
import { AnimatePresence, motion } from "framer-motion";
import {
    ChevronDown,
    ChevronRight,
    Edit,
    GripVertical,
    Loader2,
    Plus,
    Save,
    Search,
    Trash2,
    UtensilsCrossed,
    X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";



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
                            <FoodItemCard
                              key={item._id}
                              variant="vendor"
                              item={{
                                id: item._id,
                                name: item.name,
                                description: item.description,
                                price: item.price,
                                originalPrice: item.originalPrice,
                                image: item.image,
                                isAvailable: item.isAvailable,
                                stockStatus: item.stockStatus,
                                dietaryTags: item.dietaryTags,
                                prepTimeMinutes: item.preparationTime,
                                variants: item.variants.map((v) => ({ id: v._id, name: v.name, price: v.price })),
                                addons: item.addons.map((a) => ({ id: a._id, name: a.name, price: a.price })),
                                isFeatured: item.isFeatured,
                                isPopular: item.isPopular,
                                spiceLevel: item.spiceLevel,
                              }}
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
                <FoodItemCard
                  key={item._id}
                  variant="vendor"
                  item={{
                    id: item._id,
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    originalPrice: item.originalPrice,
                    image: item.image,
                    isAvailable: item.isAvailable,
                    stockStatus: item.stockStatus,
                    dietaryTags: item.dietaryTags,
                    prepTimeMinutes: item.preparationTime,
                    variants: item.variants.map((v) => ({ id: v._id, name: v.name, price: v.price })),
                    addons: item.addons.map((a) => ({ id: a._id, name: a.name, price: a.price })),
                    isFeatured: item.isFeatured,
                    isPopular: item.isPopular,
                    spiceLevel: item.spiceLevel,
                  }}
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
