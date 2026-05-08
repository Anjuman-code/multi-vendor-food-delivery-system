import { AdminTable, Column } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { CheckCircle, EyeOff, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Review {
  _id: string;
  restaurantId: { name: string } | string;
  userId: { firstName: string; lastName: string; email: string } | string;
  rating: number;
  comment?: string;
  status: "pending" | "published" | "hidden" | "removed";
  createdAt: string;
  moderationNote?: string;
}

const statusBadge = (r: Review) => {
  const map = {
    pending: "bg-amber-50 text-amber-600",
    published: "bg-emerald-50 text-emerald-600",
    hidden: "bg-gray-100 text-gray-500",
    removed: "bg-red-50 text-red-600",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${map[r.status]}`}>
      {r.status}
    </span>
  );
};

const StarRow = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={`text-base ${i < rating ? "text-amber-400" : "text-gray-200"}`}>★</span>
    ))}
  </div>
);

export default function ReviewModerationPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selected, setSelected] = useState<Review | null>(null);
  const [dialog, setDialog] = useState<"remove" | "hide" | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async (p = 1, status = filterStatus) => {
    setLoading(true);
    try {
      const res = await adminService.listReviews({ page: p, limit: 20, status: status || undefined });
      const d = (res.data as { data: { reviews: Review[]; pagination: { total: number; pages: number; page: number; limit: number } } }).data;
      setReviews(d.reviews);
      setTotal(d.pagination.total);
      setTotalPages(d.pagination.pages);
      setPage(d.pagination.page);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetch(1); }, [filterStatus, fetch]);

  const handleApprove = async (id: string) => {
    try {
      await adminService.approveReview(id);
      toast({ title: "Published", description: "Review is now visible to customers." });
      fetch(page);
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
    }
  };

  const handleRemove = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.removeReview(selected._id, { reason: reason! });
      toast({ title: "Removed", description: "Review has been removed." });
      fetch(page);
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleHide = async () => {
    if (!selected) return;
    try {
      await adminService.hideReview(selected._id);
      toast({ title: "Hidden", description: "Review is no longer visible." });
      fetch(page);
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const authorName = (r: Review) =>
    typeof r.userId === "object" && r.userId ? `${r.userId.firstName} ${r.userId.lastName}` : "Unknown";
  const restaurantName = (r: Review) =>
    typeof r.restaurantId === "object" && r.restaurantId ? r.restaurantId.name : "—";

  const columns: Column<Review>[] = [
    {
      key: "author",
      header: "Author",
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{authorName(r)}</p>
          {typeof r.userId === "object" && r.userId && (
            <p className="text-xs text-gray-400">{r.userId.email}</p>
          )}
        </div>
      ),
    },
    {
      key: "restaurant",
      header: "Restaurant",
      render: (r) => <span className="text-sm text-gray-700">{restaurantName(r)}</span>,
    },
    { key: "rating", header: "Rating", render: (r) => <StarRow rating={r.rating} /> },
    {
      key: "comment",
      header: "Comment",
      render: (r) => (
        <p className="text-sm text-gray-600 max-w-xs truncate" title={r.comment}>
          {r.comment ?? <span className="text-gray-300 italic">No comment</span>}
        </p>
      ),
    },
    { key: "status", header: "Status", render: statusBadge },
    {
      key: "date",
      header: "Date",
      render: (r) => <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.preventDefault()}>
          {r.status === "pending" && (
            <button onClick={() => handleApprove(r._id)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Approve">
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {r.status !== "hidden" && r.status !== "removed" && (
            <button onClick={() => { setSelected(r); setDialog("hide"); }}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" title="Hide">
              <EyeOff className="w-4 h-4" />
            </button>
          )}
          {r.status !== "removed" && (
            <button onClick={() => { setSelected(r); setDialog("remove"); }}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Remove">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Review Moderation</h1>
          <p className="text-sm text-gray-500">{total} reviews</p>
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="published">Published</option>
          <option value="hidden">Hidden</option>
          <option value="removed">Removed</option>
        </select>
      </motion.div>

      <AdminTable columns={columns} data={reviews} loading={loading} page={page} totalPages={totalPages}
        onPageChange={(p) => fetch(p)} total={total} limit={20} emptyMessage="No reviews to moderate." />

      <ConfirmDialog open={dialog === "remove"} onClose={() => setDialog(null)} onConfirm={handleRemove}
        title="Remove Review?" description="The review will be permanently removed from the platform."
        confirmLabel="Remove" requireReason reasonPlaceholder="Reason for removal…" destructive />
      <ConfirmDialog open={dialog === "hide"} onClose={() => setDialog(null)} onConfirm={handleHide}
        title="Hide Review?" description="The review will be hidden from customers but not deleted."
        confirmLabel="Hide" destructive={false} />
    </div>
  );
}
