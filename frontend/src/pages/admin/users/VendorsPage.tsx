import {
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  EmptyState,
  exportToCsv,
  FilterBar,
  PageHeader,
  StatusBadge,
  type StatusTone,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import adminService from "@/services/adminService";
import { formatCurrency, formatDate, formatPercent } from "@/utils/format";
import { CheckCircle2, Download, ShieldCheck, Store, UserX, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Vendor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  isSuspended: boolean;
  isBanned: boolean;
  createdAt: string;
  vendorProfile?: {
    businessName?: string;
    isVerified?: boolean;
    commissionRate?: number;
    totalEarnings?: number;
    pendingPayout?: number;
  } | null;
}

interface ApiResponse {
  data: {
    vendors: Vendor[];
    pagination: { page: number; pages: number; total: number; limit: number };
  };
}

type DialogType = "verify" | "reject" | "suspend" | "unsuspend";

const statusOf = (v: Vendor): { label: string; tone: StatusTone } =>
  v.isSuspended
    ? { label: "Suspended", tone: "warning" }
    : v.vendorProfile?.isVerified
      ? { label: "Verified", tone: "success" }
      : { label: "Pending", tone: "neutral" };

const displayName = (v: Vendor) => v.vendorProfile?.businessName ?? `${v.firstName} ${v.lastName}`;

export default function VendorsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(params.get("status") ?? "all");
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [dialog, setDialog] = useState<DialogType | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchVendors = useCallback(
    async (p = 1, q = search, status = filterStatus) => {
      setLoading(true);
      try {
        const query: Record<string, unknown> = { page: p, limit: 20 };
        if (q) query.search = q;
        // Server-side filters: suspended (User.isSuspended), pending/verified
        // (VendorProfile.isVerified, resolved by the controller).
        if (status === "suspended") query.isSuspended = true;
        else if (status === "pending") query.isVerified = false;
        else if (status === "verified") query.isVerified = true;
        else if (status === "active") query.isActive = true;
        const res = await adminService.listVendors(query);
        const d = (res.data as ApiResponse).data;
        setVendors(d.vendors);
        setTotal(d.pagination.total);
        setTotalPages(d.pagination.pages);
        setPage(d.pagination.page);
      } catch {
        toast.error("Failed to load vendors");
      } finally {
        setLoading(false);
      }
    },
    [search, filterStatus],
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchVendors(1), 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [search, filterStatus, fetchVendors]);

  const onStatusChange = (v: string) => {
    setFilterStatus(v);
    if (v === "all") params.delete("status");
    else params.set("status", v);
    setParams(params, { replace: true });
  };

  const handleVerify = async () => {
    if (!selected) return;
    try {
      await adminService.verifyVendor(selected._id, { action: "approve" });
      toast.success("Vendor verified");
      fetchVendors(page);
    } catch {
      toast.error("Action failed");
      throw new Error("failed");
    }
  };

  const handleReject = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.verifyVendor(selected._id, { action: "reject", reason });
      toast.success("Vendor rejected");
      fetchVendors(page);
    } catch {
      toast.error("Action failed");
      throw new Error("failed");
    }
  };

  const handleSuspend = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.suspendVendor(selected._id, { reason: reason! });
      toast.success("Vendor suspended");
      fetchVendors(page);
    } catch {
      toast.error("Action failed");
      throw new Error("failed");
    }
  };

  const handleUnsuspend = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.unsuspendVendor(selected._id, { reason: reason! });
      toast.success("Vendor unsuspended");
      fetchVendors(page);
    } catch {
      toast.error("Action failed");
      throw new Error("failed");
    }
  };

  const exportCsv = () =>
    exportToCsv("vendors", vendors, [
      { key: "business", header: "Business", value: (v) => displayName(v) },
      { key: "email", header: "Email", value: (v) => v.email },
      { key: "status", header: "Status", value: (v) => statusOf(v).label },
      { key: "commission", header: "Commission", value: (v) => formatPercent(v.vendorProfile?.commissionRate ?? 0) },
      { key: "earnings", header: "Total Earnings", value: (v) => formatCurrency(v.vendorProfile?.totalEarnings ?? 0) },
      { key: "payout", header: "Pending Payout", value: (v) => formatCurrency(v.vendorProfile?.pendingPayout ?? 0) },
      { key: "joined", header: "Joined", value: (v) => formatDate(v.createdAt) },
    ]);

  const columns: DataTableColumn<Vendor>[] = [
    {
      key: "vendor",
      header: "Vendor",
      render: (v) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {(v.vendorProfile?.businessName ?? v.firstName).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{displayName(v)}</p>
            <p className="truncate text-xs text-muted-foreground">{v.email}</p>
          </div>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (v) => <StatusBadge {...statusOf(v)} /> },
    {
      key: "commission",
      header: "Commission",
      render: (v) => (
        <span className="text-muted-foreground">{formatPercent(v.vendorProfile?.commissionRate ?? 0)}</span>
      ),
    },
    {
      key: "earnings",
      header: "Earnings",
      align: "right",
      render: (v) => (
        <span className="font-medium text-foreground">{formatCurrency(v.vendorProfile?.totalEarnings ?? 0)}</span>
      ),
    },
    {
      key: "payout",
      header: "Pending Payout",
      align: "right",
      render: (v) => (
        <span className="font-medium text-foreground">{formatCurrency(v.vendorProfile?.pendingPayout ?? 0)}</span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (v) => <span className="text-muted-foreground">{formatDate(v.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (v) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {!v.vendorProfile?.isVerified && !v.isSuspended && (
            <>
              <IconBtn title="Approve" tone="emerald" onClick={() => { setSelected(v); setDialog("verify"); }}>
                <CheckCircle2 className="h-4 w-4" />
              </IconBtn>
              <IconBtn title="Reject" tone="red" onClick={() => { setSelected(v); setDialog("reject"); }}>
                <XCircle className="h-4 w-4" />
              </IconBtn>
            </>
          )}
          {v.isSuspended ? (
            <IconBtn title="Unsuspend" tone="emerald" onClick={() => { setSelected(v); setDialog("unsuspend"); }}>
              <ShieldCheck className="h-4 w-4" />
            </IconBtn>
          ) : (
            <IconBtn title="Suspend" tone="amber" onClick={() => { setSelected(v); setDialog("suspend"); }}>
              <UserX className="h-4 w-4" />
            </IconBtn>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendors"
        description={`${total} total vendors`}
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!vendors.length}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, business or email…"
      >
        <Select value={filterStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending verification</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="active">Active</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={vendors}
        getRowId={(v) => v._id}
        loading={loading}
        onRowClick={(v) => navigate(`/admin/users/vendors/${v._id}`)}
        emptyState={
          <EmptyState icon={Store} title="No vendors found" description="Try adjusting your search or filters." className="border-0" />
        }
        pagination={{ page, pages: totalPages, total, onPageChange: (p) => fetchVendors(p) }}
      />

      <ConfirmDialog
        open={dialog === "verify"}
        onClose={() => setDialog(null)}
        onConfirm={handleVerify}
        title={`Approve ${selected ? displayName(selected) : ""}?`}
        description="The vendor will be verified and can start listing restaurants."
        confirmLabel="Approve Vendor"
        destructive={false}
      />
      <ConfirmDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        onConfirm={handleReject}
        title={`Reject ${selected ? displayName(selected) : ""}?`}
        description="The vendor application will be rejected. Provide a reason for the audit log."
        confirmLabel="Reject"
        requireReason
        reasonPlaceholder="Reason for rejection…"
        destructive
      />
      <ConfirmDialog
        open={dialog === "suspend"}
        onClose={() => setDialog(null)}
        onConfirm={handleSuspend}
        title={`Suspend ${selected ? displayName(selected) : ""}?`}
        description="All restaurants under this vendor will be temporarily closed until unsuspended."
        confirmLabel="Suspend Vendor"
        requireReason
        reasonPlaceholder="Reason for suspension…"
        destructive={false}
      />
      <ConfirmDialog
        open={dialog === "unsuspend"}
        onClose={() => setDialog(null)}
        onConfirm={handleUnsuspend}
        title={`Unsuspend ${selected ? displayName(selected) : ""}?`}
        description="The vendor regains access and their restaurants will reopen."
        confirmLabel="Unsuspend"
        requireReason
        reasonPlaceholder="Reason for lifting the suspension…"
        destructive={false}
      />
    </div>
  );
}

const toneClass = {
  amber: "hover:bg-amber-50 hover:text-amber-600",
  red: "hover:bg-red-50 hover:text-red-600",
  emerald: "hover:bg-emerald-50 hover:text-emerald-600",
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
