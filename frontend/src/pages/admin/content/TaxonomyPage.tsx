import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface CuisineType {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  isActive: boolean;
  restaurantCount?: number;
}

interface TagItem {
  _id: string;
  name: string;
  slug: string;
  type?: string;
  isActive: boolean;
}

export default function TaxonomyPage() {
  const [activeTab, setActiveTab] = useState<"cuisine" | "tags">("cuisine");
  const [cuisines, setCuisines] = useState<CuisineType[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<{ id?: string; name: string; icon?: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        adminService.listCuisineTypes(),
        adminService.listTags(),
      ]);
      setCuisines((cRes.data as { data: { types: CuisineType[] } }).data.types);
      setTags((tRes.data as { data: { tags: TagItem[] } }).data.tags);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editItem || !editItem.name.trim()) return;
    setSaving(true);
    try {
      if (activeTab === "cuisine") {
        if (editItem.id) {
          await adminService.updateCuisineType(editItem.id, { name: editItem.name, icon: editItem.icon });
        } else {
          await adminService.createCuisineType({ name: editItem.name, icon: editItem.icon });
        }
      } else {
        if (editItem.id) {
          await adminService.updateTag(editItem.id, { name: editItem.name });
        } else {
          await adminService.createTag({ name: editItem.name });
        }
      }
      toast({ title: "Saved", description: `${activeTab === "cuisine" ? "Cuisine type" : "Tag"} saved.` });
      setEditItem(null);
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
      if (activeTab === "cuisine") await adminService.deleteCuisineType(deleteId);
      else await adminService.deleteTag(deleteId);
      toast({ title: "Deleted" });
      setDeleteId(null);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const items = activeTab === "cuisine" ? cuisines : tags;

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cuisine Types & Tags</h1>
          <p className="text-sm text-gray-500">Manage discovery taxonomy</p>
        </div>
        <button
          onClick={() => setEditItem({ name: "", icon: "" })}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === "cuisine" ? "Cuisine" : "Tag"}
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["cuisine", "tags"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {tab === "cuisine" ? "Cuisine Types" : "Tags"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse h-16" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-2 min-w-0">
                  {activeTab === "cuisine" && (item as CuisineType).icon ? (
                    <span className="text-xl">{(item as CuisineType).icon}</span>
                  ) : (
                    <Tag className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    {activeTab === "cuisine" && (item as CuisineType).restaurantCount !== undefined && (
                      <p className="text-xs text-gray-400">{(item as CuisineType).restaurantCount} restaurants</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => setEditItem({ id: item._id, name: item.name, icon: (item as CuisineType).icon })}
                    className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setDeleteId(item._id)}
                    className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {editItem !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditItem(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-4">
              {editItem.id ? "Edit" : "Add"} {activeTab === "cuisine" ? "Cuisine Type" : "Tag"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
                <input
                  value={editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  placeholder="e.g. Bengali"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              {activeTab === "cuisine" && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Icon (emoji)</label>
                  <input
                    value={editItem.icon ?? ""}
                    onChange={(e) => setEditItem({ ...editItem, icon: e.target.value })}
                    placeholder="e.g. 🍛"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditItem(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editItem.name.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete this item?" description="This cannot be undone. Restaurants linked to it will lose this category."
        confirmLabel="Delete" destructive />
    </div>
  );
}
