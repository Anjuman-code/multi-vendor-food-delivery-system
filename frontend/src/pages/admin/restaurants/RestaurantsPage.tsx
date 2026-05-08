import { AdminTable, Column } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { CheckCircle, Search, Star, Store, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

interface Restaurant {
  _id: string;
  name: string;
  cuisineType: string[];
  approvalStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
  isTemporarilyClosed: boolean;
  isFeatured?: boolean;
  rating: { average: number; count: number };
  address: { area: string; district: string };
  createdAt: string;
}

const approvalBadge = (r: Restaurant) => {
  const map = {
    approved: "bg-emerald-50 text-emerald-600",
    pending: "bg-amber-50 text-amber-600",
    rejected: "bg-red-50 text-red-600",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${map[r.approvalStatus]}`}>
      {r.approvalStatus}
    </span>
  );
};

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [dialog, setDialog] = useState<"approve" | "reject" | "close" | "feature" | null>(null);
  const { toast } = useToast();
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch = useCallback(async (p = 1, q = search, status = filterStatus) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, limit: 20 };
      if (q) params.search = q;
      if (status) params.approvalStatus = status;
      const res = await adminService.listRestaurants(params);
      const d = (res.data as { data: { restaurants: Restaurant[]; pagination: { total: number; pages: number; page: number; limit: number } } }).data;
      setRestaurants(d.restaurants);
      setTotal(d.pagination.total);
      setTotalPages(d.pagination.pages);
      setPage(d.pagination.page);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetch(1), 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, filterStatus, fetch]);

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await adminService.approveRestaurant(selected._id);
      toast({ title: "Approved", description: `${selected.name} is now live.` });
      fetch(page);
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleReject = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.rejectRestaurant(selected._id, { reason: reason! });
      toast({ title: "Rejected", description: "Restaurant application rejected." });
      fetch(page);
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleClose = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.closeRestaurant(selected._id, { reason: reason! });
      toast({ title: "Closed", description: "Restaurant temporarily closed." });
      fetch(page);
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleFeature = async () => {
    if (!selected) return;
    try {
      await adminService.featureRestaurant(selected._id);
      toast({ title: "Done", description: selected.isFeatured ? "Unfeatured." : "Featured!" });
      fetch(page);
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const columns: Column<Restaurant>[] = [
    {
      key: "name",
      header: "Restaurant",
      render: (r) => (
        <Link to={`/admin/restaurants/${r._id}`} className="group flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-200 to-red-200 rounded-lg flex items-center justify-center shrink-0">
            <Store className="w-4 h-4 text-orange-700" />
          </div>
          <div>
            <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{r.name}</p>
            <p className="text-xs text-gray-400">{r.address?.area}, {r.address?.district}</p>
          </div>
        </Link>
      ),
    },
    {
      key: "cuisine",
      header: "Cuisine",
      render: (r) => <span className="text-xs text-gray-600">{r.cuisineType?.slice(0, 2).join(", ")}</span>,
    },
    { key: "status", header: "Status", render: approvalBadge },
    {
      key: "rating",
      header: "Rating",
      render: (r) =>
        r.rating?.count ? (
          <span className="flex items-center gap-1 text-gray-700 text-sm">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            {r.rating.average.toFixed(1)}
          </span>
        ) : <span className="text-gray-300">—</span>,
    },
    {
      key: "featured",
      header: "Featured",
      render: (r) =>
        r.isFeatured ? <CheckCircle className="w-4 h-4 text-indigo-500" /> : <span className="text-gray-200">—</span>,
    },
    {
      key: "added",
      header: "Added",
      render: (r) => <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.preventDefault()}>
          {r.approvalStatus === "pending" && (
            <>
              <button onClick={() => { setSelected(r); setDialog("approve"); }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Approve">
                <CheckCircle className="w-4 h-4" />
              </button>
              <button onClick={() => { setSelected(r); setDialog("reject"); }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Reject">
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {r.approvalStatus === "approved" && !r.isTemporarilyClosed && (
            <button onClick={() => { setSelected(r); setDialog("close"); }}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors" title="Close">
              <XCircle className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => { setSelected(r); setDialog("feature"); }}
            className={`p-1.5 rounded-lg transition-colors ${r.isFeatured ? "text-indigo-500 bg-indigo-50" : "text-gray-400 hover:bg-indigo-50 hover:text-indigo-500"}`}
            title={r.isFeatured ? "Unfeature" : "Feature"}>
            <Star className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Restaurants</h1>
          <p className="text-sm text-gray-500">{total} total restaurants</p>
        </div>
        <Link
          to="/admin/restaurants/approval-queue"
          className="px-4 py-2 text-sm font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition-colors"
        >
          Approval Queue
        </Link>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <AdminTable columns={columns} data={restaurants} loading={loading} page={page} totalPages={totalPages}
        onPageChange={(p) => fetch(p)} total={total} limit={20} emptyMessage="No restaurants found." />

      <ConfirmDialog open={dialog === "approve"} onClose={() => setDialog(null)} onConfirm={handleApprove}
        title={`Approve ${selected?.name}?`}
        description="The restaurant will go live and customers can place orders."
        confirmLabel="Approve" destructive={false} />
      <ConfirmDialog open={dialog === "reject"} onClose={() => setDialog(null)} onConfirm={handleReject}
        title={`Reject ${selected?.name}?`}
        description="Provide a reason for rejection to inform the vendor."
        confirmLabel="Reject" requireReason reasonPlaceholder="Reason for rejection…" destructive />
      <ConfirmDialog open={dialog === "close"} onClose={() => setDialog(null)} onConfirm={handleClose}
        title={`Close ${selected?.name}?`}
        description="The restaurant will be temporarily unavailable to customers."
        confirmLabel="Close" requireReason reasonPlaceholder="Reason for closure…" destructive={false} />
      <ConfirmDialog open={dialog === "feature"} onClose={() => setDialog(null)} onConfirm={handleFeature}
        title={selected?.isFeatured ? `Unfeature ${selected.name}?` : `Feature ${selected?.name}?`}
        description={selected?.isFeatured ? "Remove from featured section." : "Add to featured section on the homepage."}
        confirmLabel={selected?.isFeatured ? "Unfeature" : "Feature"} destructive={false} />
    </div>
  );
}
