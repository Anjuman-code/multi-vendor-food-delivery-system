import {
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  EmptyState,
  FormDialog,
  PageHeader,
  SectionCard,
  SegmentedTabs,
  StatusBadge,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { Pencil, Plus, Tags, Trash2, Utensils } from "lucide-react";
import { useEffect, useState } from "react";

interface CuisineType {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
}

type TagCategory = "dietary" | "amenity" | "feature" | "meal_type";

interface TagItem {
  _id: string;
  name: string;
  slug: string;
  category: TagCategory;
  isActive: boolean;
}

const TAG_CATEGORIES: { value: TagCategory; label: string }[] = [
  { value: "dietary", label: "Dietary" },
  { value: "amenity", label: "Amenity" },
  { value: "feature", label: "Feature" },
  { value: "meal_type", label: "Meal type" },
];

const slugify = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type Tab = "cuisine" | "tags";

interface CuisineForm {
  id?: string;
  name: string;
  slug: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
}

interface TagForm {
  id?: string;
  name: string;
  slug: string;
  category: TagCategory;
  isActive: boolean;
}

const emptyCuisine = (): CuisineForm => ({
  name: "",
  slug: "",
  icon: "",
  displayOrder: 0,
  isActive: true,
});

const emptyTag = (): TagForm => ({
  name: "",
  slug: "",
  category: "dietary",
  isActive: true,
});

export default function TaxonomyPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("cuisine");
  const [cuisines, setCuisines] = useState<CuisineType[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [cuisineForm, setCuisineForm] = useState<CuisineForm | null>(null);
  const [tagForm, setTagForm] = useState<TagForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: Tab; id: string; name: string } | null
  >(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        adminService.listCuisineTypes(),
        adminService.listTags(),
      ]);
      setCuisines((cRes.data as { data: { types: CuisineType[] } }).data.types);
      setTags((tRes.data as { data: { tags: TagItem[] } }).data.tags);
    } catch {
      toast({ title: "Failed to load taxonomy", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Cuisine save ──────────────────────────────────────────────
  const saveCuisine = async () => {
    if (!cuisineForm || !cuisineForm.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: cuisineForm.name.trim(),
        slug: cuisineForm.slug.trim() || slugify(cuisineForm.name),
        icon: cuisineForm.icon.trim() || undefined,
        displayOrder: cuisineForm.displayOrder,
        isActive: cuisineForm.isActive,
      };
      if (cuisineForm.id) await adminService.updateCuisineType(cuisineForm.id, payload);
      else await adminService.createCuisineType(payload);
      toast({ title: "Cuisine type saved" });
      setCuisineForm(null);
      await load();
    } catch {
      toast({ title: "Failed to save cuisine type", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Tag save ──────────────────────────────────────────────────
  const saveTag = async () => {
    if (!tagForm || !tagForm.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: tagForm.name.trim(),
        slug: tagForm.slug.trim() || slugify(tagForm.name),
        category: tagForm.category,
        isActive: tagForm.isActive,
      };
      if (tagForm.id) await adminService.updateTag(tagForm.id, payload);
      else await adminService.createTag(payload);
      toast({ title: "Tag saved" });
      setTagForm(null);
      await load();
    } catch {
      toast({ title: "Failed to save tag", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "cuisine")
        await adminService.deleteCuisineType(deleteTarget.id);
      else await adminService.deleteTag(deleteTarget.id);
      toast({ title: "Deleted" });
      setDeleteTarget(null);
      await load();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const cuisineColumns: DataTableColumn<CuisineType>[] = [
    {
      key: "name",
      header: "Cuisine",
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-base">
            {c.icon || <Utensils className="h-4 w-4 text-accent-foreground" />}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{c.name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{c.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "displayOrder",
      header: "Order",
      align: "center",
      render: (c) => <span className="text-muted-foreground">{c.displayOrder}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (c) =>
        c.isActive ? (
          <StatusBadge label="Active" tone="success" />
        ) : (
          <StatusBadge label="Inactive" tone="neutral" />
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <IconBtn
            title="Edit"
            tone="brand"
            onClick={() =>
              setCuisineForm({
                id: c._id,
                name: c.name,
                slug: c.slug,
                icon: c.icon ?? "",
                displayOrder: c.displayOrder,
                isActive: c.isActive,
              })
            }
          >
            <Pencil className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            title="Delete"
            tone="red"
            onClick={() => setDeleteTarget({ kind: "cuisine", id: c._id, name: c.name })}
          >
            <Trash2 className="h-4 w-4" />
          </IconBtn>
        </div>
      ),
    },
  ];

  const tagColumns: DataTableColumn<TagItem>[] = [
    {
      key: "name",
      header: "Tag",
      render: (t) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{t.name}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{t.slug}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (t) => (
        <StatusBadge
          label={TAG_CATEGORIES.find((c) => c.value === t.category)?.label ?? t.category}
          tone="info"
          icon={false}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t) =>
        t.isActive ? (
          <StatusBadge label="Active" tone="success" />
        ) : (
          <StatusBadge label="Inactive" tone="neutral" />
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (t) => (
        <div className="flex items-center justify-end gap-1">
          <IconBtn
            title="Edit"
            tone="brand"
            onClick={() =>
              setTagForm({
                id: t._id,
                name: t.name,
                slug: t.slug,
                category: t.category,
                isActive: t.isActive,
              })
            }
          >
            <Pencil className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            title="Delete"
            tone="red"
            onClick={() => setDeleteTarget({ kind: "tags", id: t._id, name: t.name })}
          >
            <Trash2 className="h-4 w-4" />
          </IconBtn>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cuisine Types & Tags"
        description="Manage the discovery taxonomy used across restaurants and menus."
        actions={
          <Button
            variant="brand"
            size="sm"
            onClick={() =>
              tab === "cuisine"
                ? setCuisineForm(emptyCuisine())
                : setTagForm(emptyTag())
            }
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add {tab === "cuisine" ? "Cuisine" : "Tag"}
          </Button>
        }
      />

      <SegmentedTabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "cuisine", label: "Cuisine Types", count: cuisines.length },
          { value: "tags", label: "Tags", count: tags.length },
        ]}
      />

      {tab === "cuisine" ? (
        <SectionCard title="Cuisine Types" flush>
          <DataTable
            columns={cuisineColumns}
            data={cuisines}
            getRowId={(c) => c._id}
            loading={loading}
            emptyState={
              <EmptyState
                icon={Utensils}
                title="No cuisine types yet"
                description="Add a cuisine type so restaurants can be categorised."
                className="border-0"
              />
            }
          />
        </SectionCard>
      ) : (
        <SectionCard title="Tags" flush>
          <DataTable
            columns={tagColumns}
            data={tags}
            getRowId={(t) => t._id}
            loading={loading}
            emptyState={
              <EmptyState
                icon={Tags}
                title="No tags yet"
                description="Add tags for dietary, amenity, feature, and meal-type filters."
                className="border-0"
              />
            }
          />
        </SectionCard>
      )}

      {/* Cuisine form */}
      <FormDialog
        open={cuisineForm !== null}
        onOpenChange={(o) => !o && setCuisineForm(null)}
        title={cuisineForm?.id ? "Edit Cuisine Type" : "Add Cuisine Type"}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCuisineForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={saveCuisine}
              disabled={saving || !cuisineForm?.name.trim()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        {cuisineForm && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                value={cuisineForm.name}
                onChange={(e) =>
                  setCuisineForm({ ...cuisineForm, name: e.target.value })
                }
                placeholder="e.g. Bengali"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-slug">Slug</Label>
              <Input
                id="c-slug"
                value={cuisineForm.slug}
                onChange={(e) =>
                  setCuisineForm({ ...cuisineForm, slug: e.target.value })
                }
                placeholder={cuisineForm.name ? slugify(cuisineForm.name) : "auto-generated"}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-generate from the name.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-icon">Icon (emoji)</Label>
                <Input
                  id="c-icon"
                  value={cuisineForm.icon}
                  onChange={(e) =>
                    setCuisineForm({ ...cuisineForm, icon: e.target.value })
                  }
                  placeholder="🍛"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-order">Display order</Label>
                <Input
                  id="c-order"
                  type="number"
                  value={cuisineForm.displayOrder}
                  onChange={(e) =>
                    setCuisineForm({
                      ...cuisineForm,
                      displayOrder: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">
                  Visible to customers for discovery.
                </p>
              </div>
              <Switch
                checked={cuisineForm.isActive}
                onCheckedChange={(v) =>
                  setCuisineForm({ ...cuisineForm, isActive: v })
                }
              />
            </div>
          </div>
        )}
      </FormDialog>

      {/* Tag form */}
      <FormDialog
        open={tagForm !== null}
        onOpenChange={(o) => !o && setTagForm(null)}
        title={tagForm?.id ? "Edit Tag" : "Add Tag"}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setTagForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={saveTag}
              disabled={saving || !tagForm?.name.trim()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        {tagForm && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Name</Label>
              <Input
                id="t-name"
                value={tagForm.name}
                onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                placeholder="e.g. Vegan"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-slug">Slug</Label>
              <Input
                id="t-slug"
                value={tagForm.slug}
                onChange={(e) => setTagForm({ ...tagForm, slug: e.target.value })}
                placeholder={tagForm.name ? slugify(tagForm.name) : "auto-generated"}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-generate from the name.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-category">Category</Label>
              <Select
                value={tagForm.category}
                onValueChange={(v) =>
                  setTagForm({ ...tagForm, category: v as TagCategory })
                }
              >
                <SelectTrigger id="t-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">
                  Available as a filter on discovery.
                </p>
              </div>
              <Switch
                checked={tagForm.isActive}
                onCheckedChange={(v) => setTagForm({ ...tagForm, isActive: v })}
              />
            </div>
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This cannot be undone. Restaurants linked to it will lose this category."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

const toneClass = {
  brand: "hover:bg-accent hover:text-accent-foreground",
  red: "hover:bg-red-50 hover:text-red-600",
} as const;

const IconBtn: React.FC<{
  title: string;
  tone: keyof typeof toneClass;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, tone, onClick, children }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`rounded-lg p-1.5 text-muted-foreground transition-colors ${toneClass[tone]}`}
  >
    {children}
  </button>
);
