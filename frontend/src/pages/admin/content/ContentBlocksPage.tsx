import {
  ConfirmDialog,
  EmptyState,
  FormDialog,
  PageHeader,
  SectionCard,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { formatDate } from "@/utils/format";
import { ArrowDown, ArrowUp, ImageIcon, LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type BlockType = "banner" | "featured_restaurants" | "featured_items";

interface ContentBlock {
  _id: string;
  type: BlockType;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
  entityIds?: string[];
  position: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
}

interface BlockForm {
  id?: string;
  type: BlockType;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
  entityIds: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  banner: "Banner",
  featured_restaurants: "Featured Restaurants",
  featured_items: "Featured Items",
};

const emptyForm = (): BlockForm => ({
  type: "banner",
  title: "",
  subtitle: "",
  ctaText: "",
  ctaLink: "",
  imageUrl: "",
  entityIds: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
});

/** ISO datetime → value for <input type="date"> (yyyy-mm-dd). */
const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");

export default function ContentBlocksPage() {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [form, setForm] = useState<BlockForm | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.listContentBlocks();
      setBlocks((res.data as { data: { blocks: ContentBlock[] } }).data.blocks);
    } catch {
      toast({ title: "Failed to load content blocks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (b: ContentBlock) =>
    setForm({
      id: b._id,
      type: b.type,
      title: b.title,
      subtitle: b.subtitle ?? "",
      ctaText: b.ctaText ?? "",
      ctaLink: b.ctaLink ?? "",
      imageUrl: b.imageUrl ?? "",
      entityIds: (b.entityIds ?? []).join(", "),
      isActive: b.isActive,
      startsAt: toDateInput(b.startsAt),
      endsAt: toDateInput(b.endsAt),
    });

  const handleSave = async () => {
    if (!form || !form.title.trim()) return;
    setSaving(true);
    try {
      const entityIds = form.entityIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const payload: Record<string, unknown> = {
        type: form.type,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        ctaText: form.ctaText.trim() || undefined,
        ctaLink: form.ctaLink.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        entityIds,
        isActive: form.isActive,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };
      if (form.id) await adminService.updateContentBlock(form.id, payload);
      else await adminService.createContentBlock(payload);
      toast({ title: "Content block saved" });
      setForm(null);
      await load();
    } catch {
      toast({ title: "Failed to save content block", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminService.deleteContentBlock(deleteId);
      toast({ title: "Content block deleted" });
      setDeleteId(null);
      await load();
    } catch {
      toast({ title: "Failed to delete content block", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length || reordering) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next); // optimistic
    setReordering(true);
    try {
      const order = next.map((b, i) => ({ id: b._id, position: i }));
      await adminService.reorderContentBlocks(order);
      await load();
    } catch {
      toast({ title: "Failed to reorder", variant: "destructive" });
      await load();
    } finally {
      setReordering(false);
    }
  };

  const deletingBlock = blocks.find((b) => b._id === deleteId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Homepage Blocks"
        description="Curate banners and featured content sections shown on the homepage."
        actions={
          <Button variant="brand" size="sm" onClick={() => setForm(emptyForm())}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Block
          </Button>
        }
      />

      <SectionCard title="Blocks" description="Ordered top to bottom as shown to customers." flush>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : blocks.length === 0 ? (
          <EmptyState
            icon={LayoutTemplate}
            title="No content blocks yet"
            description="Add a banner or featured section to populate the homepage."
            className="border-0"
          />
        ) : (
          <ul className="divide-y divide-border">
            {blocks.map((block, i) => (
              <li key={block._id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex flex-col">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || reordering}
                    title="Move up"
                    aria-label="Move up"
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === blocks.length - 1 || reordering}
                    title="Move down"
                    aria-label="Move down"
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>

                {block.imageUrl ? (
                  <img
                    src={block.imageUrl}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <StatusBadge label={BLOCK_TYPE_LABELS[block.type]} tone="brand" icon={false} />
                    <StatusBadge
                      label={block.isActive ? "Active" : "Inactive"}
                      tone={block.isActive ? "success" : "neutral"}
                    />
                    {(block.startsAt || block.endsAt) && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(block.startsAt)} – {formatDate(block.endsAt)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm font-semibold text-foreground">{block.title}</p>
                  {block.subtitle && (
                    <p className="truncate text-xs text-muted-foreground">{block.subtitle}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openEdit(block)}
                    title="Edit"
                    aria-label="Edit"
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(block._id)}
                    title="Delete"
                    aria-label="Delete"
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <FormDialog
        open={form !== null}
        onOpenChange={(o) => !o && setForm(null)}
        title={form?.id ? "Edit Block" : "New Block"}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="brand" onClick={handleSave} disabled={saving || !form?.title.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="b-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as BlockType })}
              >
                <SelectTrigger id="b-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {BLOCK_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-title">Title</Label>
              <Input
                id="b-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Block title"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-subtitle">Subtitle</Label>
              <Input
                id="b-subtitle"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Optional subtitle"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="b-cta-text">CTA text</Label>
                <Input
                  id="b-cta-text"
                  value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                  placeholder="e.g. View all"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-cta-link">CTA link</Label>
                <Input
                  id="b-cta-link"
                  value={form.ctaLink}
                  onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                  placeholder="/explore"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-image">Image URL</Label>
              <Input
                id="b-image"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>

            {form.type !== "banner" && (
              <div className="space-y-1.5">
                <Label htmlFor="b-entities">
                  {form.type === "featured_restaurants" ? "Restaurant IDs" : "Menu item IDs"}
                </Label>
                <Textarea
                  id="b-entities"
                  value={form.entityIds}
                  onChange={(e) => setForm({ ...form, entityIds: e.target.value })}
                  placeholder="Comma-separated IDs"
                  rows={2}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated, in display order.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="b-starts">Starts at</Label>
                <Input
                  id="b-starts"
                  type="date"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-ends">Ends at</Label>
                <Input
                  id="b-ends"
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">
                  Show this block on the homepage.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={`Delete "${deletingBlock?.title}"?`}
        description="This content block will be permanently removed from the homepage."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
