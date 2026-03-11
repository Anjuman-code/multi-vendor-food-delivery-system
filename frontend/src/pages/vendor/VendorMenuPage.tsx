import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Loader2,
  X,
  Save,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import vendorService from "@/services/vendorService";
import { useVendor } from "@/contexts/VendorContext";
import type { MenuCategory, MenuItem } from "@/types/menu";
import { useToast } from "@/hooks/use-toast";

type ModalState =
  | { type: "none" }
  | { type: "category"; category?: MenuCategory }
  | { type: "item"; item?: MenuItem };

const VendorMenuPage: React.FC = () => {
  const { selectedRestaurantId } = useVendor();
  const { toast } = useToast();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const loadMenu = useCallback(async () => {
    if (!selectedRestaurantId) return;
    setLoading(true);
    const res = await vendorService.getMenuItems(selectedRestaurantId);
    if (res.success && res.data) {
      setCategories(res.data.categories || []);
      setItems(res.data.items || []);
      // Expand all categories by default
      setExpandedCategories(
        new Set((res.data.categories || []).map((c) => c._id)),
      );
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
    const res = await vendorService.toggleItemAvailability(
      selectedRestaurantId,
      item._id,
    );
    if (res.success) {
      setItems((prev) =>
        prev.map((i) =>
          i._id === item._id ? { ...i, isAvailable: !i.isAvailable } : i,
        ),
      );
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedRestaurantId) return;
    if (!window.confirm("Delete this menu item?")) return;
    const res = await vendorService.deleteMenuItem(
      selectedRestaurantId,
      itemId,
    );
    if (res.success) {
      setItems((prev) => prev.filter((i) => i._id !== itemId));
      toast({ title: "Success", description: "Item deleted" });
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!selectedRestaurantId) return;
    if (!window.confirm("Delete this category and its items?")) return;
    const res = await vendorService.deleteCategory(selectedRestaurantId, catId);
    if (res.success) {
      setCategories((prev) => prev.filter((c) => c._id !== catId));
      setItems((prev) => prev.filter((i) => i.categoryId !== catId));
      toast({ title: "Success", description: "Category deleted" });
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
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
        <p className="text-gray-500">
          Select a restaurant from the sidebar to manage its menu.
        </p>
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {categories.length} categories · {items.length} items
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setModal({ type: "category" })}
            className="rounded-lg gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
          <Button
            onClick={() => setModal({ type: "item" })}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search menu items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
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
                  {cat.description && (
                    <p className="text-sm text-gray-500">{cat.description}</p>
                  )}
                </div>
                <span className="text-sm text-gray-400">
                  {catItems.length} items
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModal({ type: "category", category: cat });
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                    title="Edit category"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(cat._id);
                    }}
                    className="p-1.5 hover:bg-red-50 rounded-lg"
                    title="Delete category"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Items */}
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
                        <p className="text-sm text-gray-400 px-5 py-4 text-center">
                          No items in this category
                        </p>
                      ) : (
                        catItems.map((item) => (
                          <MenuItemRow
                            key={item._id}
                            item={item}
                            onToggle={() => handleToggleAvailability(item)}
                            onEdit={() => setModal({ type: "item", item })}
                            onDelete={() => handleDeleteItem(item._id)}
                          />
                        ))
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-600">Uncategorized</h3>
            </div>
            {uncategorizedItems.map((item) => (
              <MenuItemRow
                key={item._id}
                item={item}
                onToggle={() => handleToggleAvailability(item)}
                onEdit={() => setModal({ type: "item", item })}
                onDelete={() => handleDeleteItem(item._id)}
              />
            ))}
          </div>
        )}

        {categories.length === 0 && items.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Empty Menu
            </h3>
            <p className="text-gray-500 mb-6">
              Start by adding categories and menu items.
            </p>
            <Button
              onClick={() => setModal({ type: "category" })}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Category
            </Button>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal.type !== "none" && (
          <FormModal
            modal={modal}
            categories={categories}
            restaurantId={selectedRestaurantId}
            onClose={() => setModal({ type: "none" })}
            onSaved={loadMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Menu Item Row ────────────────────────────────────────────────

const MenuItemRow: React.FC<{
  item: MenuItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ item, onToggle, onEdit, onDelete }) => (
  <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
      {item.image ? (
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <UtensilsCrossed className="w-5 h-5 text-gray-300" />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 truncate">{item.name}</p>
      <p className="text-sm text-gray-500 truncate">{item.description}</p>
    </div>
    <p className="font-semibold text-gray-900 whitespace-nowrap">
      ৳{item.price}
    </p>
    <button
      onClick={onToggle}
      title={item.isAvailable ? "Mark unavailable" : "Mark available"}
    >
      {item.isAvailable ? (
        <ToggleRight className="w-8 h-8 text-green-500" />
      ) : (
        <ToggleLeft className="w-8 h-8 text-gray-300" />
      )}
    </button>
    <button
      onClick={onEdit}
      className="p-1.5 hover:bg-gray-100 rounded-lg"
      title="Edit"
    >
      <Edit className="w-4 h-4 text-gray-500" />
    </button>
    <button
      onClick={onDelete}
      className="p-1.5 hover:bg-red-50 rounded-lg"
      title="Delete"
    >
      <Trash2 className="w-4 h-4 text-red-400" />
    </button>
  </div>
);

// ── Form Modal ───────────────────────────────────────────────────

const FormModal: React.FC<{
  modal: ModalState;
  categories: MenuCategory[];
  restaurantId: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ modal, categories, restaurantId, onClose, onSaved }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Category form state
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Item form state
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemPrepTime, setItemPrepTime] = useState("");

  useEffect(() => {
    if (modal.type === "category" && modal.category) {
      setCatName(modal.category.name);
      setCatDesc(modal.category.description || "");
    }
    if (modal.type === "item" && modal.item) {
      setItemName(modal.item.name);
      setItemDesc(modal.item.description);
      setItemPrice(String(modal.item.price));
      setItemCategoryId(modal.item.categoryId || "");
      setItemPrepTime(String(modal.item.preparationTime || ""));
    }
  }, [modal]);

  const handleSaveCategory = async () => {
    if (!catName.trim()) return;
    setSaving(true);
    const data = { name: catName.trim(), description: catDesc.trim() };
    const isEdit = modal.type === "category" && modal.category;
    const res = isEdit
      ? await vendorService.updateCategory(
          restaurantId,
          modal.category!._id,
          data,
        )
      : await vendorService.createCategory(restaurantId, data);
    if (res.success) {
      toast({
        title: "Success",
        description: isEdit ? "Category updated" : "Category created",
      });
      onSaved();
      onClose();
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim() || !itemPrice) return;
    setSaving(true);
    const data = {
      name: itemName.trim(),
      description: itemDesc.trim(),
      price: Number(itemPrice),
      categoryId: itemCategoryId || undefined,
      preparationTime: itemPrepTime ? Number(itemPrepTime) : undefined,
    };
    const isEdit = modal.type === "item" && modal.item;
    const res = isEdit
      ? await vendorService.updateMenuItem(restaurantId, modal.item!._id, data)
      : await vendorService.createMenuItem(restaurantId, data);
    if (res.success) {
      toast({
        title: "Success",
        description: isEdit ? "Item updated" : "Item created",
      });
      onSaved();
      onClose();
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
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
            {modal.type === "category"
              ? modal.category
                ? "Edit Category"
                : "New Category"
              : modal.type === "item" && modal.item
                ? "Edit Item"
                : "New Item"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {modal.type === "category" ? (
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Appetizers"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="A brief description"
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Chicken Biryani"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="Describe the dish..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (৳)</Label>
                <Input
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Prep Time (min)</Label>
                <Input
                  type="number"
                  value={itemPrepTime}
                  onChange={(e) => setItemPrepTime(e.target.value)}
                  placeholder="15"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="w-full mt-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="rounded-lg">
            Cancel
          </Button>
          <Button
            disabled={saving}
            onClick={
              modal.type === "category" ? handleSaveCategory : handleSaveItem
            }
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VendorMenuPage;
