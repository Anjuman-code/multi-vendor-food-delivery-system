import { AdminTable, Column } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { Ban, CheckCircle, Search, UserX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isSuspended: boolean;
  isBanned: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface ApiResponse {
  data: {
    customers: Customer[];
    pagination: { page: number; pages: number; total: number; limit: number };
  };
}

const statusBadge = (c: Customer) => {
  if (c.isBanned)
    return <span className="px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-600 rounded-full">Banned</span>;
  if (c.isSuspended)
    return <span className="px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-600 rounded-full">Suspended</span>;
  if (!c.isActive)
    return <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500 rounded-full">Inactive</span>;
  return <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-full">Active</span>;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [dialog, setDialog] = useState<"suspend" | "ban" | "unsuspend" | "unban" | null>(null);
  const { toast } = useToast();
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCustomers = useCallback(
    async (p = 1, q = search, status = filterStatus) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page: p, limit: 20 };
        if (q) params.search = q;
        if (status === "banned") params.isBanned = true;
        else if (status === "suspended") params.isSuspended = true;
        else if (status === "inactive") params.isActive = false;
        const res = await adminService.listCustomers(params);
        const d = (res.data as ApiResponse).data;
        setCustomers(d.customers);
        setTotal(d.pagination.total);
        setTotalPages(d.pagination.pages);
        setPage(d.pagination.page);
      } finally {
        setLoading(false);
      }
    },
    [search, filterStatus],
  );

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchCustomers(1), 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, filterStatus, fetchCustomers]);

  const handleAction = async (reason?: string) => {
    if (!selected) return;
    try {
      if (dialog === "suspend") await adminService.suspendCustomer(selected._id, { reason: reason! });
      else if (dialog === "unsuspend") await adminService.unsuspendCustomer(selected._id, { reason: reason! });
      else if (dialog === "ban") await adminService.banCustomer(selected._id, { reason: reason! });
      else if (dialog === "unban") await adminService.unbanCustomer(selected._id, { reason: reason! });
      toast({ title: "Done", description: "Customer updated successfully." });
      fetchCustomers(page);
    } catch {
      toast({ title: "Error", description: "Action failed. Please try again.", variant: "destructive" });
      throw new Error("action failed");
    }
  };

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      render: (c) => (
        <Link to={`/admin/users/customers/${c._id}`} className="group flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-200 to-violet-200 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
            {c.firstName.charAt(0)}{c.lastName.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
              {c.firstName} {c.lastName}
            </p>
            <p className="text-xs text-gray-400">{c.email}</p>
          </div>
        </Link>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (c) => <span className="text-gray-600">{c.phoneNumber ?? "—"}</span>,
    },
    {
      key: "verified",
      header: "Verified",
      render: (c) =>
        c.isEmailVerified ? (
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: statusBadge,
    },
    {
      key: "joined",
      header: "Joined",
      render: (c) => <span className="text-gray-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
          {!c.isBanned && !c.isSuspended && (
            <button
              onClick={() => { setSelected(c); setDialog("suspend"); }}
              title="Suspend"
              className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
            >
              <UserX className="w-4 h-4" />
            </button>
          )}
          {c.isSuspended && (
            <button
              onClick={() => { setSelected(c); setDialog("unsuspend"); }}
              title="Unsuspend"
              className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {!c.isBanned && (
            <button
              onClick={() => { setSelected(c); setDialog("ban"); }}
              title="Ban"
              className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
          {c.isBanned && (
            <button
              onClick={() => { setSelected(c); setDialog("unban"); }}
              title="Unban"
              className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{total} total customers</p>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
        >
          <option value="">All statuses</option>
          <option value="banned">Banned</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <AdminTable
        columns={columns}
        data={customers}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => fetchCustomers(p)}
        total={total}
        limit={20}
        emptyMessage="No customers found."
      />

      {/* Dialogs */}
      <ConfirmDialog
        open={dialog === "suspend"}
        onClose={() => setDialog(null)}
        onConfirm={handleAction}
        title={`Suspend ${selected?.firstName}?`}
        description="This will prevent the customer from placing orders until unsuspended."
        confirmLabel="Suspend Customer"
        requireReason
        reasonPlaceholder="Reason for suspension…"
        destructive={false}
      />
      <ConfirmDialog
        open={dialog === "unsuspend"}
        onClose={() => setDialog(null)}
        onConfirm={handleAction}
        title={`Unsuspend ${selected?.firstName}?`}
        description="The customer will regain full access to the platform."
        confirmLabel="Unsuspend"
        requireReason
        reasonPlaceholder="Reason for lifting suspension…"
        destructive={false}
      />
      <ConfirmDialog
        open={dialog === "ban"}
        onClose={() => setDialog(null)}
        onConfirm={handleAction}
        title={`Permanently ban ${selected?.firstName}?`}
        description="This is a permanent action. The customer will be completely blocked from the platform."
        confirmLabel="Ban Customer"
        requireReason
        reasonPlaceholder="Detailed reason for ban…"
        destructive
      />
      <ConfirmDialog
        open={dialog === "unban"}
        onClose={() => setDialog(null)}
        onConfirm={handleAction}
        title={`Unban ${selected?.firstName}?`}
        description="The customer will regain full access to the platform."
        confirmLabel="Unban"
        requireReason
        reasonPlaceholder="Reason for lifting ban…"
        destructive={false}
      />
    </div>
  );
}
