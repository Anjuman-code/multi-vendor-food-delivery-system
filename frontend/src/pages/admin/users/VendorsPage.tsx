import { AdminTable, Column } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { CheckCircle, Search, UserX, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

interface Vendor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  isSuspended: boolean;
  createdAt: string;
  vendorProfile?: {
    businessName: string;
    isVerified: boolean;
    commissionRate?: number;
    pendingPayout?: number;
  };
}

const statusBadge = (v: Vendor) => {
  if (v.isSuspended) return <span className="px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-600 rounded-full">Suspended</span>;
  if (v.vendorProfile?.isVerified) return <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-full">Verified</span>;
  return <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500 rounded-full">Pending</span>;
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [dialog, setDialog] = useState<"suspend" | "verify" | "reject" | null>(null);
  const { toast } = useToast();
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await adminService.listVendors({ page: p, limit: 20, search: q || undefined });
      const d = (res.data as { data: { vendors: Vendor[]; pagination: { total: number; pages: number; page: number; limit: number } } }).data;
      setVendors(d.vendors);
      setTotal(d.pagination.total);
      setTotalPages(d.pagination.pages);
      setPage(d.pagination.page);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetch(1), 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, fetch]);

  const handleSuspend = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.suspendVendor(selected._id, { reason: reason! });
      toast({ title: "Suspended", description: `${selected.vendorProfile?.businessName} has been suspended.` });
      fetch(page);
    } catch {
      toast({ title: "Error", description: "Failed to suspend vendor.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleVerify = async () => {
    if (!selected) return;
    try {
      await adminService.verifyVendor(selected._id, { action: "approve" });
      toast({ title: "Approved", description: "Vendor has been verified." });
      fetch(page);
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleReject = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.verifyVendor(selected._id, { action: "reject", reason });
      toast({ title: "Rejected", description: "Vendor application rejected." });
      fetch(page);
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const columns: Column<Vendor>[] = [
    {
      key: "vendor",
      header: "Vendor",
      render: (v) => (
        <Link to={`/admin/users/vendors/${v._id}`} className="group flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
            {v.firstName.charAt(0)}{v.lastName.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
              {v.vendorProfile?.businessName ?? `${v.firstName} ${v.lastName}`}
            </p>
            <p className="text-xs text-gray-400">{v.email}</p>
          </div>
        </Link>
      ),
    },
    { key: "status", header: "Status", render: statusBadge },
    {
      key: "commission",
      header: "Commission",
      render: (v) => <span className="text-gray-600">{v.vendorProfile?.commissionRate ?? 15}%</span>,
    },
    {
      key: "payout",
      header: "Pending Payout",
      render: (v) => <span className="text-gray-700 font-medium">৳{(v.vendorProfile?.pendingPayout ?? 0).toLocaleString()}</span>,
    },
    {
      key: "joined",
      header: "Joined",
      render: (v) => <span className="text-xs text-gray-400">{new Date(v.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (v) => (
        <div className="flex gap-1" onClick={(e) => e.preventDefault()}>
          {!v.vendorProfile?.isVerified && !v.isSuspended && (
            <>
              <button onClick={() => { setSelected(v); setDialog("verify"); }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Approve">
                <CheckCircle className="w-4 h-4" />
              </button>
              <button onClick={() => { setSelected(v); setDialog("reject"); }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Reject">
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {!v.isSuspended && v.vendorProfile?.isVerified && (
            <button onClick={() => { setSelected(v); setDialog("suspend"); }}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors" title="Suspend">
              <UserX className="w-4 h-4" />
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
          <h1 className="text-xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500">{total} total vendors</p>
        </div>
      </motion.div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
        </div>
      </div>

      <AdminTable columns={columns} data={vendors} loading={loading} page={page} totalPages={totalPages}
        onPageChange={(p) => fetch(p)} total={total} limit={20} emptyMessage="No vendors found." />

      <ConfirmDialog open={dialog === "suspend"} onClose={() => setDialog(null)} onConfirm={handleSuspend}
        title={`Suspend ${selected?.vendorProfile?.businessName}?`}
        description="All restaurants under this vendor will be temporarily closed."
        confirmLabel="Suspend Vendor" requireReason reasonPlaceholder="Reason for suspension…" destructive={false} />
      <ConfirmDialog open={dialog === "verify"} onClose={() => setDialog(null)} onConfirm={handleVerify}
        title={`Approve ${selected?.vendorProfile?.businessName}?`}
        description="The vendor will be verified and can start adding restaurants."
        confirmLabel="Approve Vendor" destructive={false} />
      <ConfirmDialog open={dialog === "reject"} onClose={() => setDialog(null)} onConfirm={handleReject}
        title={`Reject ${selected?.vendorProfile?.businessName}?`}
        description="The vendor application will be rejected. Please provide a reason."
        confirmLabel="Reject" requireReason reasonPlaceholder="Reason for rejection…" destructive />
    </div>
  );
}
