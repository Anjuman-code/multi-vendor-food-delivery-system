import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeader, SectionCard, VendorEmptyState } from "@/components/vendor";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useVendor } from "@/contexts/VendorContext";
import { toast } from "@/lib/toast";
import { extractApiError, getErrorMessage, getFieldErrors } from "@/lib/formErrors";
import vendorService from "@/services/vendorService";
import type { MenuCategory, MenuItem, StockStatus } from "@/types/menu";
import { foodFallbackSVG } from "@/utils/fallbackImages";
import { formatCurrency } from "@/utils/format";
import {
    ArrowLeft,
    Check,
    Eye,
    Loader2,
    Plus,
    Save,
    ShoppingCart,
    Store,
    X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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
    const displayPrice = price ? formatCurrency(price) : formatCurrency(0);
    const displayDesc = description || "Description will appear here...";

    const stockLabel = useMemo(() => {
        if (stockStatus === "out_of_stock") return { text: "Out of Stock", color: "bg-amber-100 text-amber-700" };
        if (stockStatus === "hidden") return { text: "Hidden", color: "bg-muted text-muted-foreground" };
        return { text: "Available", color: "bg-emerald-100 text-emerald-700" };
    }, [stockStatus]);

    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm max-w-xs">
            <div className="relative h-36 bg-muted">
                <img
                    src={image || foodFallbackSVG}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = foodFallbackSVG; }}
                />
            </div>
            <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-foreground text-sm">{displayName}</h4>
                    <span className="font-bold text-foreground text-sm whitespace-nowrap">{displayPrice}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{displayDesc}</p>
                {dietaryTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {dietaryTags.map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-primary font-medium">{tag}</span>
                        ))}
                    </div>
                )}
                {variants.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {variants.filter((v) => v.name.trim()).map((v) => (
                            <span key={v.name} className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                                {v.name}{v.price && ` +${formatCurrency(v.price)}`}
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border">
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
        <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
            <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                <img
                    src={image || foodFallbackSVG}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = foodFallbackSVG; }}
                />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-accent text-primary text-[10px] font-bold">{quantity}</span>
                    <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                </div>
                {selectedVariant && (
                    <p className="text-xs text-muted-foreground ml-6">{selectedVariant.name}</p>
                )}
                {addons.filter((a) => a.name.trim()).length > 0 && (
                    <p className="text-xs text-muted-foreground ml-6">
                        + {addons.filter((a) => a.name.trim()).map((a) => a.name).join(", ")}
                    </p>
                )}
            </div>
            <span className="text-sm font-semibold text-foreground">{formatCurrency(unitTotal)}</span>
        </div>
    );
};

// ── Main editor page ────────────────────────────────────────────

const MenuItemEditorPage: React.FC = () => {
    const { itemId } = useParams<{ itemId: string }>();
    const isEdit = Boolean(itemId);
    const { selectedRestaurantId } = useVendor();
    const confirm = useConfirm();
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
    const [newCategoryName, setNewCategoryName] = useState("");
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [creatingCategory, setCreatingCategory] = useState(false);

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
                    toast.error("Error", { description: "Item not found" });
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

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim() || !selectedRestaurantId) return;
        setCreatingCategory(true);
        const res = await vendorService.createCategory(selectedRestaurantId, { name: newCategoryName.trim() });
        if (res.success && res.data?.category) {
            const created = res.data.category;
            setCategories((prev) => [...prev, created]);
            setCategoryId(created._id);
            markDirty();
            setShowNewCategory(false);
            setNewCategoryName("");
            toast.success("Category created", { description: `"${created.name}" added` });
        } else {
            toast.error("Error", { description: res.message || "Failed to create category" });
        }
        setCreatingCategory(false);
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
            toast.success("Success", { description: isEdit ? "Item updated" : "Item created" });
            setDirty(false);
            navigate("/vendor/menu");
        } else {
            // Map any backend field errors back onto the matching inputs; the
            // server uses `preparationTime` while the form tracks it as `prepTime`.
            const fieldErrors = getFieldErrors(extractApiError(res));
            if (fieldErrors.length > 0) {
                const mapped: Record<string, string> = {};
                for (const fe of fieldErrors) {
                    const key = fe.field === "preparationTime" ? "prepTime" : fe.field;
                    mapped[key] = fe.message;
                }
                setErrors((prev) => ({ ...prev, ...mapped }));
                toast.error("Please fix the highlighted fields", {
                    description: fieldErrors[0].message,
                });
            } else {
                toast.error("Error", { description: getErrorMessage(res) });
            }
        }
        setSaving(false);
    };

    const handleBack = async () => {
        if (dirty) {
            const ok = await confirm({ description: "You have unsaved changes. Leave anyway?", confirmLabel: "Leave" });
            if (!ok) return;
        }
        navigate("/vendor/menu");
    };

    if (!selectedRestaurantId) {
        return (
            <div className="max-w-6xl mx-auto py-8">
                <VendorEmptyState
                    icon={Store}
                    title="No restaurant selected"
                    description="Select a restaurant from the sidebar to start editing menu items."
                />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto pb-28">
            {/* Header */}
            <PageHeader
                className="mb-6"
                title={
                    <span className="flex items-center gap-3">
                        <button
                            type="button"
                            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
                            onClick={handleBack}
                        >
                            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                        </button>
                        {isEdit ? "Edit Item" : "New Item"}
                    </span>
                }
                subtitle={
                    dirty ? (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            Unsaved changes
                        </span>
                    ) : undefined
                }
            />

            {/* Two-column editor */}
            <div className="editor-grid">
                {/* Left: Form */}
                <div className="space-y-5">
                    {/* Basics */}
                    <SectionCard title="Basics" description="Name and description shown to customers.">
                        <div className="space-y-5">
                            {/* Name */}
                            <div>
                                <Label>Item Name *</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); markDirty(); }}
                                    placeholder="e.g. Chicken Biryani"
                                    className={`mt-1 ${errors.name ? "border-destructive" : ""}`}
                                />
                                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                            </div>

                            {/* Description */}
                            <div>
                                <Label>Description *</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                                    placeholder="Describe the dish..."
                                    rows={2}
                                    className={`mt-1 ${errors.description ? "border-destructive" : ""}`}
                                />
                                {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
                            </div>
                        </div>
                    </SectionCard>

                    {/* Pricing */}
                    <SectionCard title="Pricing" description="Base price and preparation time.">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Price (৳) *</Label>
                                <Input
                                    type="number"
                                    value={price}
                                    onChange={(e) => { setPrice(e.target.value); markDirty(); }}
                                    placeholder="0"
                                    className={`mt-1 ${errors.price ? "border-destructive" : ""}`}
                                />
                                {errors.price && <p className="text-xs text-destructive mt-1">{errors.price}</p>}
                            </div>
                            <div>
                                <Label>Prep Time (min)</Label>
                                <Input
                                    type="number"
                                    value={prepTime}
                                    onChange={(e) => { setPrepTime(e.target.value); markDirty(); }}
                                    placeholder="15"
                                    className={`mt-1 ${errors.prepTime ? "border-destructive" : ""}`}
                                />
                                {errors.prepTime && <p className="text-xs text-destructive mt-1">{errors.prepTime}</p>}
                            </div>
                        </div>
                    </SectionCard>

                    {/* Image */}
                    <SectionCard title="Image" description="A direct link to the dish photo.">
                        <div>
                            <Label>Image URL</Label>
                            <Input
                                value={image}
                                onChange={(e) => { setImage(e.target.value); markDirty(); }}
                                placeholder="https://example.com/item.jpg"
                                className="mt-1"
                            />
                        </div>
                    </SectionCard>

                    {/* Category + Stock status */}
                    <SectionCard title="Category & Availability" description="How the item is grouped and whether it's orderable.">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Category</Label>
                                <div className="flex gap-1.5 mt-1">
                                    <Select
                                        value={categoryId || "__none"}
                                        onValueChange={(v) => { setCategoryId(v === "__none" ? "" : v); markDirty(); }}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Uncategorized" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none">Uncategorized</SelectItem>
                                            {categories.map((c) => (
                                                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <button
                                        type="button"
                                        title="Create new category"
                                        onClick={() => { setShowNewCategory((v) => !v); setNewCategoryName(""); }}
                                        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-accent transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                {showNewCategory && (
                                    <div className="flex gap-1.5 mt-1.5">
                                        <Input
                                            autoFocus
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            onKeyDown={async (e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    await handleCreateCategory();
                                                } else if (e.key === "Escape") {
                                                    setShowNewCategory(false);
                                                }
                                            }}
                                            placeholder="New category name"
                                            className="flex-1 text-sm h-8"
                                        />
                                        <button
                                            type="button"
                                            disabled={creatingCategory || !newCategoryName.trim()}
                                            onClick={handleCreateCategory}
                                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                        >
                                            {creatingCategory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowNewCategory(false)}
                                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <Label>Stock Status</Label>
                                <Select
                                    value={stockStatus}
                                    onValueChange={(v) => { setStockStatus(v as StockStatus); markDirty(); }}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="available">Available</SelectItem>
                                        <SelectItem value="out_of_stock">Out of Stock (visible)</SelectItem>
                                        <SelectItem value="hidden">Hidden (not visible)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Dietary Tags */}
                    <SectionCard title="Dietary Tags" description="Help customers filter by dietary needs.">
                        <div className="flex flex-wrap gap-1.5">
                            {DIETARY_TAGS.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleDietaryTag(tag)}
                                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                                        dietaryTags.includes(tag)
                                            ? "border-primary bg-accent text-primary"
                                            : "bg-card border-border text-muted-foreground hover:border-foreground/30"
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </SectionCard>

                    {/* Variants */}
                    <SectionCard title="Sizes / Variants" description="Different sizes with price adjustments.">
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
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 p-2 h-auto"
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
                            className="mt-1 w-full text-xs text-primary border-border hover:bg-accent"
                        >
                            <Plus className="w-3 h-3 mr-1" /> Add Variant
                        </Button>
                    </SectionCard>

                    {/* Add-ons */}
                    <SectionCard title="Add-ons / Sides" description="Optional extras with additional price.">
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
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 p-2 h-auto"
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
                            className="mt-1 w-full text-xs text-primary border-border hover:bg-accent"
                        >
                            <Plus className="w-3 h-3 mr-1" /> Add Option
                        </Button>
                    </SectionCard>
                </div>

                {/* Right: Live Preview */}
                <div className="space-y-6">
                    {/* Menu card preview */}
                    <SectionCard
                        title={
                            <span className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" />
                                Menu Card Preview
                            </span>
                        }
                        description="How this item appears in the customer menu"
                    >
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
                    </SectionCard>

                    {/* Cart row preview */}
                    <SectionCard
                        title={
                            <span className="flex items-center gap-1.5">
                                <ShoppingCart className="w-3.5 h-3.5" />
                                Cart Row Preview
                            </span>
                        }
                        description="How this item appears in the customer's cart"
                    >
                        <CartRowPreview
                            name={name}
                            price={price}
                            image={image}
                            variants={variants}
                            addons={addons}
                        />
                        {addons.filter((a) => a.name.trim() && a.price).length > 0 && (
                            <div className="mt-3 bg-muted rounded-lg p-3 text-xs text-muted-foreground">
                                <p className="font-medium mb-1 text-foreground">Cart total calculation:</p>
                                <p>Base: {formatCurrency(Number(price || 0))}</p>
                                {variants.filter((v) => v.name.trim() && v.price).map((v) => (
                                    <p key={v.name}>+ {v.name}: {formatCurrency(Number(v.price))}</p>
                                ))}
                                {addons.filter((a) => a.name.trim() && a.price).map((a) => (
                                    <p key={a.name}>+ {a.name}: {formatCurrency(Number(a.price))}</p>
                                ))}
                                <p className="font-semibold mt-1 pt-1 border-t border-border text-foreground">
                                    Total: {formatCurrency(
                                        Number(price || 0) +
                                        variants.filter((v) => v.name.trim() && v.price).reduce((s, v) => s + Number(v.price), 0) +
                                        addons.filter((a) => a.name.trim() && a.price).reduce((s, a) => s + Number(a.price), 0)
                                    )}
                                </p>
                            </div>
                        )}
                    </SectionCard>
                </div>
            </div>

            {/* Sticky save bar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-card px-6 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-3">
                    {dirty && (
                        <span className="text-xs text-amber-600">You have unsaved changes</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        className="rounded-lg"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="brand"
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-lg gap-2"
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
