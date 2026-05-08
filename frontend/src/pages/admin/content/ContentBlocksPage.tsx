import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { Globe, Pencil, Plus, Trash2 } from "lucide-react";
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
  position: number;
  isActive: boolean;
}

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  banner: "Banner",
  featured_restaurants: "Featured Restaurants",
  featured_items: "Featured Items",
};

const BLOCK_TYPE_COLORS: Record<BlockType, string> = {
  banner: "bg-violet-50 text-violet-600",
  featured_restaurants: "bg-orange-50 text-orange-600",
  featured_items: "bg-emerald-50 text-emerald-600",
};

const emptyForm = (): BlockForm => ({
  type: "banner",
  title: "",
  subtitle: "",
  ctaText: "",
  ctaLink: "",
  imageUrl: "",
  position: 0,
  isActive: true,
});

export default function ContentBlocksPage() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState<BlockForm | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.listContentBlocks();
      setBlocks((res.data as { data: { blocks: ContentBlock[] } }).data.blocks);
    } catch {
      toast({ title: "Error", description: "Failed to load content blocks.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => setEditForm(emptyForm());

  const openEdit = (b: ContentBlock) =>
    setEditForm({
      id: b._id,
      type: b.type,
      title: b.title,
      subtitle: b.subtitle ?? "",
      ctaText: b.ctaText ?? "",
      ctaLink: b.ctaLink ?? "",
      imageUrl: b.imageUrl ?? "",
      position: b.position,
      isActive: b.isActive,
    });

  const handleSave = async () => {
    if (!editForm || !editForm.title.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        type: editForm.type,
        title: editForm.title.trim(),
        subtitle: editForm.subtitle.trim() || undefined,
        ctaText: editForm.ctaText.trim() || undefined,
        ctaLink: editForm.ctaLink.trim() || undefined,
        imageUrl: editForm.imageUrl.trim() || undefined,
        position: editForm.position,
        isActive: editForm.isActive,
      };
      if (editForm.id) {
        await adminService.updateContentBlock(editForm.id, payload);
      } else {
        await adminService.createContentBlock(payload);
      }
      toast({ title: "Saved", description: "Content block saved." });
      setEditForm(null);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminService.deleteContentBlock(deleteId);
      toast({ title: "Deleted" });
      setDeleteId(null);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const deletingBlock = blocks.find((b) => b._id === deleteId);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Homepage Blocks</h1>
          <p className="text-sm text-gray-500">Manage banners and featured content sections</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Block
        </button>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse h-20" />
          ))}
        </div>
      ) : blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Globe className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No content blocks yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block) => (
            <motion.div
              key={block._id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 group hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${BLOCK_TYPE_COLORS[block.type]}`}>
                    {BLOCK_TYPE_LABELS[block.type]}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${block.isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                    {block.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className="text-xs text-gray-400">pos: {block.position}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{block.title}</p>
                {block.subtitle && <p className="text-xs text-gray-500 truncate">{block.subtitle}</p>}
                {block.ctaLink && (
                  <p className="text-xs text-indigo-500 truncate">{block.ctaLink}</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => openEdit(block)}
                  className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(block._id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      {editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-gray-900">
              {editForm.id ? "Edit Block" : "New Block"}
            </h2>

            <div className="space-y-3">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value as BlockType })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((t) => (
                    <option key={t} value={t}>{BLOCK_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Block title"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={editForm.subtitle}
                  onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
                  placeholder="Optional subtitle"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* CTA */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CTA Text</label>
                  <input
                    type="text"
                    value={editForm.ctaText}
                    onChange={(e) => setEditForm({ ...editForm, ctaText: e.target.value })}
                    placeholder="e.g. View all"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CTA Link</label>
                  <input
                    type="text"
                    value={editForm.ctaLink}
                    onChange={(e) => setEditForm({ ...editForm, ctaLink: e.target.value })}
                    placeholder="/explore"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Image URL</label>
                <input
                  type="text"
                  value={editForm.imageUrl}
                  onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Position & Active */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
                  <input
                    type="number"
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min={0}
                  />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditForm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editForm.title.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
