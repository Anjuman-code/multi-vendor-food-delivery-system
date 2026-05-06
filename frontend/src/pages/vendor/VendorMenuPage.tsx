import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVendor } from "@/contexts/VendorContext";
import { useToast } from "@/hooks/use-toast";
import vendorService from "@/services/vendorService";
import type { MenuCategory, MenuItem, StockStatus } from "@/types/menu";
import { foodFallbackSVG } from "@/utils/fallbackImages";
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
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Types ────────────────────────────────────────────────────────

type CategoryModalState =
  | { type: "none" }
  | { type: "category"; category?: MenuCategory };

// ── Main page component ──────────────────────────────────────────

const VendorMenuPage: React.FC = () => {
  const { selectedRestaurantId } = useVendor();
  const { toast } = useToast();
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
    if (!window.confirm("Delete this menu item?")) return;
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
    if (!window.confirm("Delete this category? Items will be moved to uncategorized.")) return;
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
      <div className="text-center py-16">
        <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Select a restaurant from the sidebar to manage its menu.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setCatModal({ type: "category" })}
          className="rounded-lg gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
        <Button
          onClick={() => navigate("/vendor/menu/items/new")}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {/* Categories & Items */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const catItems = getItemsForCategory(cat._id);
          const isExpanded = expandedCategories.has(cat._id);
          return (
            <motion.div
              key={cat._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Category header */}
              <div
                className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCategory(cat._id)}
              >
                <GripVertical className="w-4 h-4 text-gray-300" />
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                  {cat.description && <p className="text-sm text-gray-500">{cat.description}</p>}
                </div>
                <span className="text-sm text-gray-400">{catItems.length} items</span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/vendor/menu/items/new")}
                    className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </Button>
                  <button
                    onClick={() => setCatModal({ type: "category", category: cat })}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                    title="Edit category"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat._id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg"
                    title="Delete category"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Items grid */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-100">
                      {catItems.length === 0 ? (
                        <p className="text-sm text-gray-400 px-5 py-6 text-center">
                          No items in this category.{" "}
                          <button
                            onClick={() => navigate("/vendor/menu/items/new")}
                            className="text-orange-500 hover:text-orange-600 underline"
                          >
                            Add one
                          </button>
                        </p>
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
          <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50/50">
              <div>
                <h3 className="font-semibold text-amber-800">Uncategorized</h3>
                <p className="text-xs text-amber-600 mt-0.5">
                  {categories.length === 0
                    ? "Create a category to organize your menu"
                    : "These items aren't assigned to any category"}
                </p>
              </div>
              {categories.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCatModal({ type: "category" })}
                  className="text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-100"
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
          </div>
        )}

        {categories.length === 0 && items.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Empty Menu</h3>
            <p className="text-gray-500 mb-6">Start by adding categories and menu items.</p>
            <Button
              onClick={() => setCatModal({ type: "category" })}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Category
            </Button>
          </div>
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

  const stockLabel = useMemo(() => {
    if (item.stockStatus === "out_of_stock") return { text: "Out of Stock", color: "bg-amber-100 text-amber-700" };
    if (item.stockStatus === "hidden" || !item.isAvailable) return { text: "Hidden", color: "bg-gray-100 text-gray-500" };
    return { text: "Available", color: "bg-emerald-100 text-emerald-700" };
  }, [item.stockStatus, item.isAvailable]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-card-md transition-all overflow-hidden relative group"
    >
      <div className="relative h-32 bg-gray-100">
        <img
          src={item.image || foodFallbackSVG}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = foodFallbackSVG; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 bg-white rounded-lg shadow hover:bg-gray-50" title="Edit">
            <Edit className="w-3.5 h-3.5 text-gray-700" />
          </button>
          <button onClick={onDelete} className="p-1.5 bg-white rounded-lg shadow hover:bg-red-50" title="Delete">
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-medium text-gray-900 text-sm leading-snug line-clamp-2">{item.name}</h4>
          <span className="font-bold text-gray-900 text-sm whitespace-nowrap">৳{item.price}</span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>
        {item.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.dietaryTags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">{tag}</span>
            ))}
            {item.dietaryTags.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500">+{item.dietaryTags.length - 3}</span>
            )}
          </div>
        )}
        {(item.variants.length > 0 || item.addons.length > 0) && (
          <p className="text-[10px] text-gray-400 mb-2">
            {item.variants.length > 0 && `${item.variants.length} size${item.variants.length > 1 ? "s" : ""}`}
            {item.variants.length > 0 && item.addons.length > 0 && " · "}
            {item.addons.length > 0 && `${item.addons.length} add-on${item.addons.length > 1 ? "s" : ""}`}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-50">
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer ${stockLabel.color}`}
            >
              {stockLabel.text}
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  className="absolute bottom-full left-0 mb-1 bg-white rounded-lg border border-gray-200 shadow-card-lg py-1 z-10 w-36"
                >
                  {(["available", "out_of_stock", "hidden"] as StockStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => { onStockStatus(s); setMenuOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                        item.stockStatus === s ? "text-orange-600 font-medium" : "text-gray-600"
                      }`}
                    >
                      {s === "available" ? "Available" : s === "out_of_stock" ? "Out of Stock" : "Hidden"}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="text-[10px] text-gray-400">{item.preparationTime}min</span>
        </div>
      </div>
    </motion.div>
  );
};

// ── Category Modal (category only) ───────────────────────────────

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
  const [catError, setCatError] = useState("");

  const handleSave = async () => {
    if (!catName.trim()) {
      setCatError("Category name is required.");
      return;
    }
    setSaving(true);
    setCatError("");
    const data = { name: catName.trim(), description: catDesc.trim() };
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
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {category ? "Edit Category" : "New Category"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {catError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{catError}</p>
        )}
        <div>
          <Label>Name</Label>
          <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Appetizers" className="mt-1" />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Textarea value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="A brief description" rows={2} className="mt-1" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="rounded-lg">Cancel</Button>
          <Button
            disabled={saving}
            onClick={handleSave}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VendorMenuPage;
