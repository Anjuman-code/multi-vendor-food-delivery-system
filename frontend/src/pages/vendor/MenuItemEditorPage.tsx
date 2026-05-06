import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useVendor } from "@/contexts/VendorContext";
import { useToast } from "@/hooks/use-toast";
import vendorService from "@/services/vendorService";
import type { MenuCategory, MenuItem, StockStatus } from "@/types/menu";
import { foodFallbackSVG } from "@/utils/fallbackImages";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Eye,
    Loader2,
    Plus,
    Save,
    ShoppingCart,
    X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

// ── Dietary tags ─────────────────────────────────────────────────

const DIETARY_TAGS = [
    "Vegan", "Vegetarian", "Halal", "Gluten-Free",
    "Dairy-Free", "Nut-Free", "Spicy", "Mild",
];

// ── Preview sub-components ──────────────────────────────────────

const MenuCardPreview: React.FC<{
    name: string;
    description: string;
    price: string;
    image: string;
    dietaryTags: string[];
    variants: { name: string; price: string }[];
    stockStatus: StockStatus;
}> = ({ name, description, price, image, dietaryTags, variants, stockStatus }) => {
    const displayName = name || "Item Name";
    const displayPrice = price ? `৳${Number(price).toLocaleString("en-BD")}` : "৳0";
    const displayDesc = description || "Description will appear here...";

    const stockLabel = useMemo(() => {
        if (stockStatus === "out_of_stock") return { text: "Out of Stock", color: "bg-amber-100 text-amber-700" };
        if (stockStatus === "hidden") return { text: "Hidden", color: "bg-gray-100 text-gray-500" };
        return { text: "Available", color: "bg-emerald-100 text-emerald-700" };
    }, [stockStatus]);

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm max-w-xs">
            <div className="relative h-36 bg-gray-100">
                <img
                    src={image || foodFallbackSVG}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = foodFallbackSVG; }}
                />
            </div>
            <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm">{displayName}</h4>
                    <span className="font-bold text-gray-900 text-sm whitespace-nowrap">{displayPrice}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{displayDesc}</p>
                {dietaryTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {dietaryTags.map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">{tag}</span>
                        ))}
                    </div>
                )}
                {variants.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {variants.filter((v) => v.name.trim()).map((v) => (
                            <span key={v.name} className="text-[10px] px-1.5 py-0.5 rounded-full border border-gray-200 text-gray-600">
                                {v.name}{v.price && ` +৳${v.price}`}
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${stockLabel.color}`}>{stockLabel.text}</span>
                </div>
            </div>
        </div>
    );
};

const CartRowPreview: React.FC<{
    name: string;
    price: string;
    image: string;
    variants: { name: string; price: string }[];
    addons: { name: string; price: string }[];
    quantity?: number;
}> = ({ name, price, image, variants, addons, quantity = 1 }) => {
    const displayName = name || "Item Name";
    const basePrice = Number(price) || 0;
    const selectedVariant = variants.find((v) => v.name.trim() && v.price);
    const variantPrice = selectedVariant ? Number(selectedVariant.price) || 0 : 0;
    const addonTotal = addons
        .filter((a) => a.name.trim() && a.price)
        .reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    const unitTotal = (basePrice + variantPrice + addonTotal) * quantity;

    return (
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                <img
                    src={image || foodFallbackSVG}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = foodFallbackSVG; }}
                />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-orange-100 text-orange-600 text-[10px] font-bold">{quantity}</span>
                    <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                </div>
                {selectedVariant && (
                    <p className="text-xs text-gray-500 ml-6">{selectedVariant.name}</p>
                )}
                {addons.filter((a) => a.name.trim()).length > 0 && (
                    <p className="text-xs text-gray-400 ml-6">
                        + {addons.filter((a) => a.name.trim()).map((a) => a.name).join(", ")}
                    </p>
                )}
            </div>
            <span className="text-sm font-semibold text-gray-900">৳{unitTotal.toLocaleString("en-BD")}</span>
        </div>
    );
};

// ── Main editor page ────────────────────────────────────────────

const MenuItemEditorPage: React.FC = () => {
    const { itemId } = useParams<{ itemId: string }>();
    const isEdit = Boolean(itemId);
    const { selectedRestaurantId } = useVendor();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [dirty, setDirty] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [image, setImage] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [prepTime, setPrepTime] = useState("15");
    const [stockStatus, setStockStatus] = useState<StockStatus>("available");
    const [dietaryTags, setDietaryTags] = useState<string[]>([]);
    const [variants, setVariants] = useState<{ name: string; price: string }[]>([]);
    const [addons, setAddons] = useState<{ name: string; price: string }[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Load categories and existing item data
    useEffect(() => {
        if (!selectedRestaurantId) return;
        const load = async () => {
            const res = await vendorService.getMenuItems(selectedRestaurantId);
            if (res.success && res.data) {
                setCategories(res.data.categories || []);
            }
            if (isEdit && itemId) {
                // Find the item in the loaded data or fetch it
                const allItems = res.success && res.data ? res.data.items : [];
                const found = allItems.find((i: MenuItem) => i._id === itemId);
                if (found) {
                    populateForm(found);
                } else {
                    toast({ title: "Error", description: "Item not found", variant: "destructive" });
                    navigate("/vendor/menu");
                }
            }
            setLoading(false);
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRestaurantId, itemId]);

    const populateForm = (item: MenuItem) => {
        setName(item.name);
        setDescription(item.description);
        setPrice(String(item.price));
        setImage(item.image || "");
        setCategoryId(item.categoryId || "");
        setPrepTime(String(item.preparationTime || 15));
        setStockStatus(item.stockStatus || "available");
        setDietaryTags(item.dietaryTags || []);
        setVariants(item.variants?.map((v) => ({ name: v.name, price: String(v.price) })) || []);
        setAddons(item.addons?.map((a) => ({ name: a.name, price: String(a.price) })) || []);
    };

    const markDirty = useCallback(() => setDirty(true), []);

    // Navigation guard
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (dirty) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [dirty]);

    const toggleDietaryTag = (tag: string) => {
        setDietaryTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        );
        markDirty();
    };

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = "Item name is required";
        if (!description.trim()) errs.description = "Description is required";
        const p = Number(price);
        if (!price || Number.isNaN(p) || p <= 0) errs.price = "Price must be greater than 0";
        const pt = Number(prepTime);
        if (prepTime && (Number.isNaN(pt) || pt < 1)) errs.prepTime = "Prep time must be at least 1 minute";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validate() || !selectedRestaurantId) return;
        setSaving(true);

        const data = {
            name: name.trim(),
            description: description.trim(),
            price: Number(price),
            image: image.trim() || undefined,
            categoryId: categoryId || undefined,
            preparationTime: Number(prepTime) || 15,
            stockStatus,
            dietaryTags,
            variants: variants
                .filter((v) => v.name.trim())
                .map((v) => ({ name: v.name.trim(), price: Number(v.price) || 0 })),
            addons: addons
                .filter((a) => a.name.trim())
                .map((a) => ({ name: a.name.trim(), price: Number(a.price) || 0 })),
        };

        const res = isEdit
            ? await vendorService.updateMenuItem(selectedRestaurantId, itemId!, data)
            : await vendorService.createMenuItem(selectedRestaurantId, data);

        if (res.success) {
            toast({ title: "Success", description: isEdit ? "Item updated" : "Item created" });
            setDirty(false);
            navigate("/vendor/menu");
        } else {
            toast({ title: "Error", description: res.message, variant: "destructive" });
        }
        setSaving(false);
    };

    if (!selectedRestaurantId) {
        return (
            <div className="text-center py-16 text-gray-500">
                Select a restaurant from the sidebar first.
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
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        to="/vendor/menu"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={(e) => {
                            if (dirty && !window.confirm("You have unsaved changes. Leave anyway?")) {
                                e.preventDefault();
                            }
                        }}
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {isEdit ? "Edit Item" : "New Menu Item"}
                        </h1>
                        {dirty && (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                Unsaved changes
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Two-column editor */}
            <div className="editor-grid">
                {/* Left: Form */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <Label>Item Name *</Label>
                        <Input
                            value={name}
                            onChange={(e) => { setName(e.target.value); markDirty(); }}
                            placeholder="e.g. Chicken Biryani"
                            className={`mt-1 ${errors.name ? "border-red-300" : ""}`}
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <Label>Description *</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                            placeholder="Describe the dish..."
                            rows={2}
                            className={`mt-1 ${errors.description ? "border-red-300" : ""}`}
                        />
                        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                    </div>

                    {/* Price + Prep Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Price (৳) *</Label>
                            <Input
                                type="number"
                                value={price}
                                onChange={(e) => { setPrice(e.target.value); markDirty(); }}
                                placeholder="0"
                                className={`mt-1 ${errors.price ? "border-red-300" : ""}`}
                            />
                            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                        </div>
                        <div>
                            <Label>Prep Time (min)</Label>
                            <Input
                                type="number"
                                value={prepTime}
                                onChange={(e) => { setPrepTime(e.target.value); markDirty(); }}
                                placeholder="15"
                                className={`mt-1 ${errors.prepTime ? "border-red-300" : ""}`}
                            />
                            {errors.prepTime && <p className="text-xs text-red-500 mt-1">{errors.prepTime}</p>}
                        </div>
                    </div>

                    {/* Image URL */}
                    <div>
                        <Label>Image URL</Label>
                        <Input
                            value={image}
                            onChange={(e) => { setImage(e.target.value); markDirty(); }}
                            placeholder="https://example.com/item.jpg"
                            className="mt-1"
                        />
                    </div>

                    {/* Category + Stock status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Category</Label>
                            <select
                                value={categoryId}
                                onChange={(e) => { setCategoryId(e.target.value); markDirty(); }}
                                className="w-full mt-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            >
                                <option value="">Uncategorized</option>
                                {categories.map((c) => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Stock Status</Label>
                            <select
                                value={stockStatus}
                                onChange={(e) => { setStockStatus(e.target.value as StockStatus); markDirty(); }}
                                className="w-full mt-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            >
                                <option value="available">Available</option>
                                <option value="out_of_stock">Out of Stock (visible)</option>
                                <option value="hidden">Hidden (not visible)</option>
                            </select>
                        </div>
                    </div>

                    {/* Dietary Tags */}
                    <div className="pt-2 border-t border-gray-100">
                        <Label>Dietary Tags</Label>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {DIETARY_TAGS.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleDietaryTag(tag)}
                                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                                        dietaryTags.includes(tag)
                                            ? "bg-orange-100 border-orange-300 text-orange-700"
                                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Variants */}
                    <div className="pt-2 border-t border-gray-100">
                        <Label>Sizes / Variants</Label>
                        <p className="text-xs text-gray-500 mb-2">Different sizes with price adjustments.</p>
                        {variants.map((v, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <Input
                                    placeholder="Name (e.g. Large)"
                                    value={v.name}
                                    onChange={(e) => {
                                        const n = [...variants];
                                        n[i].name = e.target.value; setVariants(n); markDirty();
                                    }}
                                    className="flex-1 text-sm"
                                />
                                <Input
                                    type="number"
                                    placeholder="+Price"
                                    value={v.price}
                                    onChange={(e) => {
                                        const n = [...variants];
                                        n[i].price = e.target.value; setVariants(n); markDirty();
                                    }}
                                    className="w-24 text-sm"
                                />
                                <Button
                                    variant="ghost"
                                    type="button"
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 h-auto"
                                    onClick={() => { setVariants(variants.filter((_, j) => j !== i)); markDirty(); }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            type="button"
                            size="sm"
                            onClick={() => { setVariants([...variants, { name: "", price: "" }]); markDirty(); }}
                            className="mt-1 w-full text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                            <Plus className="w-3 h-3 mr-1" /> Add Variant
                        </Button>
                    </div>

                    {/* Add-ons */}
                    <div className="pt-2 border-t border-gray-100">
                        <Label>Add-ons / Sides</Label>
                        <p className="text-xs text-gray-500 mb-2">Optional extras with additional price.</p>
                        {addons.map((a, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <Input
                                    placeholder="Name (e.g. Extra Cheese)"
                                    value={a.name}
                                    onChange={(e) => {
                                        const n = [...addons];
                                        n[i].name = e.target.value; setAddons(n); markDirty();
                                    }}
                                    className="flex-1 text-sm"
                                />
                                <Input
                                    type="number"
                                    placeholder="+Price"
                                    value={a.price}
                                    onChange={(e) => {
                                        const n = [...addons];
                                        n[i].price = e.target.value; setAddons(n); markDirty();
                                    }}
                                    className="w-24 text-sm"
                                />
                                <Button
                                    variant="ghost"
                                    type="button"
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 h-auto"
                                    onClick={() => { setAddons(addons.filter((_, j) => j !== i)); markDirty(); }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            type="button"
                            size="sm"
                            onClick={() => { setAddons([...addons, { name: "", price: "" }]); markDirty(); }}
                            className="mt-1 w-full text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                            <Plus className="w-3 h-3 mr-1" /> Add Option
                        </Button>
                    </div>
                </div>

                {/* Right: Live Preview */}
                <div className="space-y-6">
                    {/* Menu card preview */}
                    <div className="editor-preview-pane">
                        <p className="editor-preview-label">
                            <Eye className="w-3 h-3 inline mr-1" />
                            Menu Card Preview
                        </p>
                        <p className="text-xs text-gray-400 mb-4">
                            How this item appears in the customer menu
                        </p>
                        <div className="flex justify-center">
                            <MenuCardPreview
                                name={name}
                                description={description}
                                price={price}
                                image={image}
                                dietaryTags={dietaryTags}
                                variants={variants}
                                stockStatus={stockStatus}
                            />
                        </div>
                    </div>

                    {/* Cart row preview */}
                    <div className="editor-preview-pane">
                        <p className="editor-preview-label">
                            <ShoppingCart className="w-3 h-3 inline mr-1" />
                            Cart Row Preview
                        </p>
                        <p className="text-xs text-gray-400 mb-4">
                            How this item appears in the customer's cart
                        </p>
                        <CartRowPreview
                            name={name}
                            price={price}
                            image={image}
                            variants={variants}
                            addons={addons}
                        />
                        {addons.filter((a) => a.name.trim() && a.price).length > 0 && (
                            <div className="mt-3 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                                <p className="font-medium mb-1">Cart total calculation:</p>
                                <p>Base: ৳{Number(price || 0).toLocaleString("en-BD")}</p>
                                {variants.filter((v) => v.name.trim() && v.price).map((v) => (
                                    <p key={v.name}>+ {v.name}: ৳{Number(v.price).toLocaleString("en-BD")}</p>
                                ))}
                                {addons.filter((a) => a.name.trim() && a.price).map((a) => (
                                    <p key={a.name}>+ {a.name}: ৳{Number(a.price).toLocaleString("en-BD")}</p>
                                ))}
                                <p className="font-semibold mt-1 pt-1 border-t border-blue-200">
                                    Total: ৳{(
                                        Number(price || 0) +
                                        variants.filter((v) => v.name.trim() && v.price).reduce((s, v) => s + Number(v.price), 0) +
                                        addons.filter((a) => a.name.trim() && a.price).reduce((s, a) => s + Number(a.price), 0)
                                    ).toLocaleString("en-BD")}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky save bar */}
            <div className="editor-save-bar -mx-0">
                <div className="flex items-center gap-3">
                    {dirty && (
                        <span className="text-xs text-amber-600">You have unsaved changes</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (dirty && !window.confirm("You have unsaved changes. Leave anyway?")) return;
                            navigate("/vendor/menu");
                        }}
                        className="rounded-lg"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isEdit ? "Update Item" : "Create Item"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MenuItemEditorPage;
