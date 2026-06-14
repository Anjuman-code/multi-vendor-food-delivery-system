import { Button } from "@/components/ui/button";
import FoodItemCard from "@/components/ui/FoodItemCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FormDialog,
  PageHeader,
  StatusBadge,
  VendorEmptyState,
} from "@/components/vendor";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useVendor } from "@/contexts/VendorContext";
import { toast } from "@/lib/toast";
import vendorService from "@/services/vendorService";
import type { MenuCategory, MenuItem, StockStatus } from "@/types/menu";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Edit,
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

const mapToFoodCard = (item: MenuItem) => ({
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
});

// ── Main page component ──────────────────────────────────────────

const VendorMenuPage: React.FC = () => {
  const { selectedRestaurantId } = useVendor();
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
    const res = await vendorService.toggleItemAvailability(selectedRestaurantId, item._id, {
      stockStatus: status,
    });
    if (res.success && res.data) {
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, ...res.data!.item } : i)),
      );
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedRestaurantId) return;
    const ok = await confirm({
      title: "Delete item",
      description: "Delete this menu item? This cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    const res = await vendorService.deleteMenuItem(selectedRestaurantId, itemId);
    if (res.success) {
      setItems((prev) => prev.filter((i) => i._id !== itemId));
      toast.success("Success", { description: "Item deleted" });
    } else {
      toast.error("Error", { description: res.message });
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!selectedRestaurantId) return;
    const ok = await confirm({
      title: "Delete category",
      description: "Delete this category? Items will be moved to uncategorized.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    const res = await vendorService.deleteCategory(selectedRestaurantId, catId);
    if (res.success) {
      setCategories((prev) => prev.filter((c) => c._id !== catId));
      setItems((prev) => prev.filter((i) => i.categoryId !== catId));
      toast.success("Success", { description: "Category deleted" });
    } else {
      toast.error("Error", { description: res.message });
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

  const totalItems = items.length;
  const availableItems = items.filter(
    (i) => i.isAvailable && i.stockStatus === "available",
  ).length;

  const header = (
    <PageHeader
      title="Menu"
      subtitle={
        !loading && selectedRestaurantId ? (
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              <span className="font-semibold text-foreground">{totalItems}</span> items
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              {availableItems} available
            </span>
            <span>{categories.length} categories</span>
          </span>
        ) : undefined
      }
      actions={
        selectedRestaurantId ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setCatModal({ type: "category" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Category
            </Button>
            <Button variant="brand" size="sm" onClick={() => navigate("/vendor/menu/items/new")}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Item
            </Button>
          </>
        ) : undefined
      }
    />
  );

  if (!selectedRestaurantId) {
    return (
      <div className="space-y-6">
        {header}
        <VendorEmptyState
          icon={UtensilsCrossed}
          title="No restaurant selected"
          description="Select a restaurant from the sidebar to manage its menu."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search menu items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search menu items"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Categories & Items */}
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
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              {/* Category header */}
              <div
                className="flex cursor-pointer select-none items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/60"
                onClick={() => toggleCategory(cat._id)}
              >
                <div className="flex w-6 shrink-0 justify-center">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {cat.icon && <span className="text-lg leading-none">{cat.icon}</span>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{cat.name}</h3>
                    {cat.availableFrom && cat.availableUntil && (
                      <StatusBadge
                        label={`${cat.availableFrom}–${cat.availableUntil}`}
                        tone="info"
                        icon={false}
                        size="sm"
                      />
                    )}
                  </div>
                  {cat.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {cat.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {catItems.length}
                </span>
                <div
                  className="flex shrink-0 items-center gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => navigate("/vendor/menu/items/new")}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"
                  >
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                  <button
                    onClick={() => setCatModal({ type: "category", category: cat })}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Edit category"
                    aria-label="Edit category"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat._id)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-destructive"
                    title="Delete category"
                    aria-label="Delete category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
                    <div className="border-t border-border">
                      {catItems.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                            <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            No items yet —{" "}
                            <button
                              onClick={() => navigate("/vendor/menu/items/new")}
                              className="font-medium text-primary hover:underline"
                            >
                              add one
                            </button>
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {catItems.map((item) => (
                            <FoodItemCard
                              key={item._id}
                              variant="vendor"
                              item={mapToFoodCard(item)}
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
            className="overflow-hidden rounded-xl border border-amber-200 bg-card shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-amber-100 px-4 py-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-amber-800">Uncategorized</h3>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {uncategorizedItems.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-amber-600">
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
                  className="h-7 gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <Plus className="h-3 w-3" /> Create Category
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {uncategorizedItems.map((item) => (
                <FoodItemCard
                  key={item._id}
                  variant="vendor"
                  item={mapToFoodCard(item)}
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
          <VendorEmptyState
            icon={UtensilsCrossed}
            title="Your menu is empty"
            description="Start by creating a category, then add items to build your menu."
            action={{
              label: "Add First Category",
              onClick: () => setCatModal({ type: "category" }),
              icon: Plus,
            }}
          />
        )}
      </div>

      {/* Category modal */}
      <CategoryModal
        open={catModal.type === "category"}
        category={catModal.type === "category" ? catModal.category : undefined}
        restaurantId={selectedRestaurantId}
        onClose={() => setCatModal({ type: "none" })}
        onSaved={loadMenu}
      />
    </div>
  );
};

// ── Category Modal (shadcn Dialog via FormDialog) ────────────────

const CategoryModal: React.FC<{
  open: boolean;
  category?: MenuCategory;
  restaurantId: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, category, restaurantId, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catIcon, setCatIcon] = useState("");
  const [catError, setCatError] = useState("");

  // Sync form when the dialog opens for a given category.
  useEffect(() => {
    if (open) {
      setCatName(category?.name || "");
      setCatDesc(category?.description || "");
      setCatIcon(category?.icon || "");
      setCatError("");
    }
  }, [open, category]);

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
      toast.success("Success", {
        description: category ? "Category updated" : "Category created",
      });
      onSaved();
      onClose();
    } else {
      toast.error("Error", { description: res.message });
    }
    setSaving(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={category ? "Edit Category" : "New Category"}
      description="Organise your menu items into sections."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="brand"
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className="min-w-20 gap-2"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {catError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {catError}
          </p>
        )}
        <div className="flex gap-3">
          <div className="w-14">
            <Label className="text-xs text-muted-foreground">Icon</Label>
            <Input
              value={catIcon}
              onChange={(e) => setCatIcon(e.target.value)}
              placeholder="🍛"
              className={cn("mt-1 h-9 text-center text-lg")}
              maxLength={2}
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Name *</Label>
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
          <Label className="text-xs text-muted-foreground">
            Description <span className="text-muted-foreground/70">(optional)</span>
          </Label>
          <Textarea
            value={catDesc}
            onChange={(e) => setCatDesc(e.target.value)}
            placeholder="A brief description of this category"
            rows={2}
            className="mt-1 resize-none text-sm"
          />
        </div>
      </div>
    </FormDialog>
  );
};

export default VendorMenuPage;
