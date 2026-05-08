import { AdminTable, Column } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Payout {
  _id: string;
  vendorId: { firstName: string; lastName: string; email: string } | string;
  vendorProfile?: { businessName: string };
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  requestedAt: string;
  processedAt?: string;
  transactionRef?: string;
}

const statusBadge = (p: Payout) => {
  const map = {
    pending: "bg-yellow-50 text-yellow-600",
    processing: "bg-blue-50 text-blue-600",
    completed: "bg-emerald-50 text-emerald-600",
    failed: "bg-red-50 text-red-600",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${map[p.status]}`}>
      {p.status}
    </span>
  );
};

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Payout | null>(null);
  const [processOpen, setProcessOpen] = useState(false);
  const [pendingTotal, setPendingTotal] = useState(0);
  const { toast } = useToast();

  const fetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await adminService.listPayouts({ page: p, limit: 20 });
      const d = (res.data as { data: { payouts: Payout[]; pagination: { total: number; pages: number; page: number; limit: number }; pendingTotal: number } }).data;
      setPayouts(d.payouts);
      setTotal(d.pagination.total);
      setTotalPages(d.pagination.pages);
      setPage(d.pagination.page);
      setPendingTotal(d.pendingTotal ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(1); }, [fetch]);

  const handleProcess = async () => {
    if (!selected) return;
    try {
      await adminService.processPayout(selected._id);
      toast({ title: "Processed", description: "Payout marked as completed." });
      fetch(page);
    } catch {
      toast({ title: "Error", description: "Failed to process payout.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const vendorName = (p: Payout) => {
    if (p.vendorProfile?.businessName) return p.vendorProfile.businessName;
    if (typeof p.vendorId === "object" && p.vendorId) return `${p.vendorId.firstName} ${p.vendorId.lastName}`;
    return "—";
  };

  const columns: Column<Payout>[] = [
    {
      key: "vendor",
      header: "Vendor",
      render: (p) => (
        <div>
          <p className="font-medium text-gray-900">{vendorName(p)}</p>
          {typeof p.vendorId === "object" && p.vendorId && (
            <p className="text-xs text-gray-400">{p.vendorId.email}</p>
          )}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (p) => <span className="font-bold text-gray-900">৳{p.amount.toLocaleString()}</span>,
    },
    { key: "status", header: "Status", render: statusBadge },
    {
      key: "requested",
      header: "Requested",
      render: (p) => <span className="text-xs text-gray-400">{new Date(p.requestedAt).toLocaleDateString()}</span>,
    },
    {
      key: "processed",
      header: "Processed",
      render: (p) =>
        p.processedAt ? (
          <span className="text-xs text-gray-400">{new Date(p.processedAt).toLocaleDateString()}</span>
        ) : <span className="text-gray-200">—</span>,
    },
    {
      key: "ref",
      header: "Ref",
      render: (p) => <span className="text-xs font-mono text-gray-500">{p.transactionRef ?? "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (p) =>
        p.status === "pending" ? (
          <button
            onClick={(e) => { e.preventDefault(); setSelected(p); setProcessOpen(true); }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Process
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vendor Payouts</h1>
          <p className="text-sm text-gray-500">
            ৳{pendingTotal.toLocaleString()} pending across {total} requests
          </p>
        </div>
      </motion.div>

      <AdminTable columns={columns} data={payouts} loading={loading} page={page} totalPages={totalPages}
        onPageChange={(p) => fetch(p)} total={total} limit={20} emptyMessage="No payout requests." />

      <ConfirmDialog open={processOpen} onClose={() => setProcessOpen(false)} onConfirm={handleProcess}
        title={`Process payout for ${selected ? vendorName(selected) : ''}?`}
        description={`Mark ৳${selected?.amount.toLocaleString()} payout as completed. Ensure the bank transfer has been done.`}
        confirmLabel="Mark as Processed" destructive={false} />
    </div>
  );
}
