import {
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  EmptyState,
  exportToCsv,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { formatDate } from "@/utils/format";
import { Ban, CheckCircle2, Download, Mail, ShieldCheck, UserX, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

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

type DialogType = "suspend" | "ban" | "unsuspend" | "unban";

const statusOf = (c: Customer) =>
  c.isBanned
    ? { label: "Banned", tone: "danger" as const }
    : c.isSuspended
      ? { label: "Suspended", tone: "warning" as const }
      : !c.isActive
        ? { label: "Inactive", tone: "neutral" as const }
        : { label: "Active", tone: "success" as const };

export default function CustomersPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(params.get("status") ?? "all");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [dialog, setDialog] = useState<DialogType | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCustomers = useCallback(
    async (p = 1, q = search, status = filterStatus) => {
      setLoading(true);
      try {
        const query: Record<string, unknown> = { page: p, limit: 20 };
        if (q) query.search = q;
        if (status === "banned") query.isBanned = true;
        else if (status === "suspended") query.isSuspended = true;
        else if (status === "inactive") query.isActive = false;
        const res = await adminService.listCustomers(query);
        const d = (res.data as ApiResponse).data;
        setCustomers(d.customers);
        setTotal(d.pagination.total);
        setTotalPages(d.pagination.pages);
        setPage(d.pagination.page);
      } catch {
        toast({ title: "Failed to load customers", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [search, filterStatus, toast],
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchCustomers(1), 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [search, filterStatus, fetchCustomers]);

  const onStatusChange = (v: string) => {
    setFilterStatus(v);
    if (v === "all") params.delete("status");
    else params.set("status", v);
    setParams(params, { replace: true });
  };

  const handleAction = async (reason?: string) => {
    if (!selected || !dialog) return;
    const map = {
      suspend: () => adminService.suspendCustomer(selected._id, { reason: reason! }),
      unsuspend: () => adminService.unsuspendCustomer(selected._id, { reason: reason! }),
      ban: () => adminService.banCustomer(selected._id, { reason: reason! }),
      unban: () => adminService.unbanCustomer(selected._id, { reason: reason! }),
    };
    try {
      await map[dialog]();
      toast({ title: "Customer updated" });
      fetchCustomers(page);
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("action failed");
    }
  };

  const exportCsv = () =>
    exportToCsv("customers", customers, [
      { key: "name", header: "Name", value: (c) => `${c.firstName} ${c.lastName}` },
      { key: "email", header: "Email", value: (c) => c.email },
      { key: "phone", header: "Phone", value: (c) => c.phoneNumber ?? "" },
      { key: "status", header: "Status", value: (c) => statusOf(c).label },
      { key: "verified", header: "Email Verified", value: (c) => (c.isEmailVerified ? "yes" : "no") },
      { key: "joined", header: "Joined", value: (c) => formatDate(c.createdAt) },
    ]);

  const columns: DataTableColumn<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {c.firstName.charAt(0)}
            {c.lastName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {c.firstName} {c.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{c.email}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Phone", render: (c) => c.phoneNumber ?? "—" },
    {
      key: "verified",
      header: "Verified",
      align: "center",
      render: (c) =>
        c.isEmailVerified ? (
          <Mail className="mx-auto h-4 w-4 text-emerald-500" aria-label="Verified" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "status", header: "Status", render: (c) => <StatusBadge {...statusOf(c)} /> },
    { key: "joined", header: "Joined", render: (c) => <span className="text-muted-foreground">{formatDate(c.createdAt)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {!c.isBanned && !c.isSuspended && (
            <IconBtn title="Suspend" tone="amber" onClick={() => { setSelected(c); setDialog("suspend"); }}>
              <UserX className="h-4 w-4" />
            </IconBtn>
          )}
          {c.isSuspended && (
            <IconBtn title="Unsuspend" tone="emerald" onClick={() => { setSelected(c); setDialog("unsuspend"); }}>
              <ShieldCheck className="h-4 w-4" />
            </IconBtn>
          )}
          {!c.isBanned ? (
            <IconBtn title="Ban" tone="red" onClick={() => { setSelected(c); setDialog("ban"); }}>
              <Ban className="h-4 w-4" />
            </IconBtn>
          ) : (
            <IconBtn title="Unban" tone="emerald" onClick={() => { setSelected(c); setDialog("unban"); }}>
              <CheckCircle2 className="h-4 w-4" />
            </IconBtn>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description={`${total} total customers`}
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!customers.length}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
      >
        <Select value={filterStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={customers}
        getRowId={(c) => c._id}
        loading={loading}
        onRowClick={(c) => navigate(`/admin/users/customers/${c._id}`)}
        emptyState={
          <EmptyState icon={Users} title="No customers found" description="Try adjusting your search or filters." className="border-0" />
        }
        pagination={{ page, pages: totalPages, total, onPageChange: (p) => fetchCustomers(p) }}
      />

      <ConfirmDialog
        open={dialog === "suspend"}
        onClose={() => setDialog(null)}
        onConfirm={handleAction}
        title={`Suspend ${selected?.firstName}?`}
        description="The customer cannot place orders until unsuspended."
        confirmLabel="Suspend Customer"
        requireReason
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
        destructive={false}
      />
      <ConfirmDialog
        open={dialog === "ban"}
        onClose={() => setDialog(null)}
        onConfirm={handleAction}
        title={`Permanently ban ${selected?.firstName}?`}
        description="This blocks the customer from the platform entirely."
        confirmLabel="Ban Customer"
        requireReason
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
