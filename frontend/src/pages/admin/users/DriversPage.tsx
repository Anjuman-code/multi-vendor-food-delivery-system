import {
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  EmptyState,
  exportToCsv,
  FilterBar,
  PageHeader,
  SegmentedTabs,
  StatusBadge,
  type StatusTone,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { formatDate } from "@/utils/format";
import { Bike, CheckCircle2, Download, Package, ShieldCheck, Star, UserX, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Driver {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  isSuspended: boolean;
  createdAt: string;
  driverProfile?: {
    vehicleType?: string;
    totalDeliveries?: number;
    rating?: { average: number; count: number };
    isAvailable?: boolean;
    applicationStatus?: string;
  } | null;
}

interface Application {
  _id: string;
  userId: { _id: string; firstName: string; lastName: string; email: string; phoneNumber?: string } | null;
  vehicleType?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  applicationStatus: string;
  createdAt: string;
}

type Tab = "active" | "applications";

const driverStatus = (d: Driver): { label: string; tone: StatusTone } =>
  d.isSuspended
    ? { label: "Suspended", tone: "warning" }
    : d.driverProfile?.isAvailable
      ? { label: "Available", tone: "success" }
      : { label: "Offline", tone: "neutral" };

export default function DriversPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "applications" ? "applications" : "active");

  // Active drivers
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Driver | null>(null);
  const [driverDialog, setDriverDialog] = useState<"suspend" | "unsuspend" | null>(null);

  // Applications
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsPage, setAppsPage] = useState(1);
  const [appsTotal, setAppsTotal] = useState(0);
  const [appsPages, setAppsPages] = useState(1);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [appDialog, setAppDialog] = useState<"approve" | "reject" | null>(null);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDrivers = useCallback(
    async (p = 1, q = search) => {
      setLoading(true);
      try {
        const query: Record<string, unknown> = { page: p, limit: 20 };
        if (q) query.search = q;
        const res = await adminService.listDrivers(query);
        const d = (res.data as { data: { drivers: Driver[]; pagination: { total: number; pages: number; page: number } } }).data;
        setDrivers(d.drivers);
        setTotal(d.pagination.total);
        setTotalPages(d.pagination.pages);
        setPage(d.pagination.page);
      } catch {
        toast({ title: "Failed to load drivers", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [search, toast],
  );

  const fetchApplications = useCallback(
    async (p = 1) => {
      setAppsLoading(true);
      try {
        const res = await adminService.listDriverApplications({ page: p, limit: 20 });
        const d = (res.data as { data: { applications: Application[]; pagination: { total: number; pages: number; page: number } } }).data;
        setApplications(d.applications);
        setAppsTotal(d.pagination.total);
        setAppsPages(d.pagination.pages);
        setAppsPage(d.pagination.page);
      } catch {
        toast({ title: "Failed to load applications", variant: "destructive" });
      } finally {
        setAppsLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchDrivers(1), 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [search, fetchDrivers]);

  useEffect(() => {
    if (tab === "applications") fetchApplications(1);
  }, [tab, fetchApplications]);

  const onTabChange = (t: Tab) => {
    setTab(t);
    if (t === "applications") params.set("tab", "applications");
    else params.delete("tab");
    setParams(params, { replace: true });
  };

  const handleSuspend = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.suspendDriver(selected._id, { reason: reason! });
      toast({ title: "Driver suspended" });
      fetchDrivers(page);
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleUnsuspend = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.unsuspendDriver(selected._id, { reason: reason! });
      toast({ title: "Driver unsuspended" });
      fetchDrivers(page);
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleApprove = async () => {
    if (!selectedApp?.userId) return;
    try {
      await adminService.approveDriver(selectedApp.userId._id);
      toast({ title: "Application approved" });
      fetchApplications(appsPage);
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleReject = async (reason?: string) => {
    if (!selectedApp?.userId) return;
    try {
      await adminService.rejectDriver(selectedApp.userId._id, { reason: reason! });
      toast({ title: "Application rejected" });
      fetchApplications(appsPage);
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const exportCsv = () => {
    if (tab === "active") {
      exportToCsv("drivers", drivers, [
        { key: "name", header: "Name", value: (d) => `${d.firstName} ${d.lastName}` },
        { key: "email", header: "Email", value: (d) => d.email },
        { key: "vehicle", header: "Vehicle", value: (d) => d.driverProfile?.vehicleType ?? "" },
        { key: "status", header: "Status", value: (d) => driverStatus(d).label },
        { key: "deliveries", header: "Deliveries", value: (d) => d.driverProfile?.totalDeliveries ?? 0 },
        { key: "rating", header: "Rating", value: (d) => d.driverProfile?.rating?.average?.toFixed(1) ?? "" },
        { key: "joined", header: "Joined", value: (d) => formatDate(d.createdAt) },
      ]);
    } else {
      exportToCsv("driver-applications", applications, [
        { key: "name", header: "Name", value: (a) => (a.userId ? `${a.userId.firstName} ${a.userId.lastName}` : "") },
        { key: "email", header: "Email", value: (a) => a.userId?.email ?? "" },
        { key: "phone", header: "Phone", value: (a) => a.userId?.phoneNumber ?? "" },
        { key: "vehicle", header: "Vehicle", value: (a) => a.vehicleType ?? "" },
        { key: "vehicleNumber", header: "Vehicle Number", value: (a) => a.vehicleNumber ?? "" },
        { key: "license", header: "License", value: (a) => a.licenseNumber ?? "" },
        { key: "applied", header: "Applied", value: (a) => formatDate(a.createdAt) },
      ]);
    }
  };

  const driverColumns: DataTableColumn<Driver>[] = [
    {
      key: "driver",
      header: "Driver",
      render: (d) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {d.firstName.charAt(0)}
            {d.lastName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {d.firstName} {d.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{d.email}</p>
          </div>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (d) => <StatusBadge {...driverStatus(d)} /> },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (d) => <span className="capitalize text-muted-foreground">{d.driverProfile?.vehicleType ?? "—"}</span>,
    },
    {
      key: "rating",
      header: "Rating",
      render: (d) =>
        d.driverProfile?.rating?.count ? (
          <span className="flex items-center gap-1 text-foreground">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {d.driverProfile.rating.average.toFixed(1)}
            <span className="text-xs text-muted-foreground">({d.driverProfile.rating.count})</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "deliveries",
      header: "Deliveries",
      align: "right",
      render: (d) => (
        <span className="flex items-center justify-end gap-1 text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          {d.driverProfile?.totalDeliveries ?? 0}
        </span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (d) => <span className="text-muted-foreground">{formatDate(d.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (d) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {d.isSuspended ? (
            <IconBtn title="Unsuspend" tone="emerald" onClick={() => { setSelected(d); setDriverDialog("unsuspend"); }}>
              <ShieldCheck className="h-4 w-4" />
            </IconBtn>
          ) : (
            <IconBtn title="Suspend" tone="amber" onClick={() => { setSelected(d); setDriverDialog("suspend"); }}>
              <UserX className="h-4 w-4" />
            </IconBtn>
          )}
        </div>
      ),
    },
  ];

  const appColumns: DataTableColumn<Application>[] = [
    {
      key: "applicant",
      header: "Applicant",
      render: (a) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {a.userId?.firstName.charAt(0) ?? "?"}
            {a.userId?.lastName.charAt(0) ?? ""}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {a.userId ? `${a.userId.firstName} ${a.userId.lastName}` : "Unknown"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{a.userId?.email ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (a) => (
        <div className="text-sm">
          <p className="capitalize text-foreground">{a.vehicleType ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{a.vehicleNumber ?? ""}</p>
        </div>
      ),
    },
    { key: "license", header: "License", render: (a) => <span className="text-muted-foreground">{a.licenseNumber ?? "—"}</span> },
    {
      key: "applied",
      header: "Applied",
      render: (a) => <span className="text-muted-foreground">{formatDate(a.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) => (
        <div className="flex items-center justify-end gap-1">
          <IconBtn title="Approve" tone="emerald" onClick={() => { setSelectedApp(a); setAppDialog("approve"); }}>
            <CheckCircle2 className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="Reject" tone="red" onClick={() => { setSelectedApp(a); setAppDialog("reject"); }}>
            <XCircle className="h-4 w-4" />
          </IconBtn>
        </div>
      ),
    },
  ];

  const appName = selectedApp?.userId
    ? `${selectedApp.userId.firstName} ${selectedApp.userId.lastName}`
    : "this applicant";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Drivers"
        description={tab === "active" ? `${total} total drivers` : `${appsTotal} pending applications`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={tab === "active" ? !drivers.length : !applications.length}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <SegmentedTabs
        value={tab}
        onChange={onTabChange}
        options={[
          { value: "active", label: "Active Drivers", count: total },
          { value: "applications", label: "Applications", count: appsTotal },
        ]}
      />

      {tab === "active" ? (
        <>
          <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search by name or email…" />
          <DataTable
            columns={driverColumns}
            data={drivers}
            getRowId={(d) => d._id}
            loading={loading}
            onRowClick={(d) => navigate(`/admin/users/drivers/${d._id}`)}
            emptyState={<EmptyState icon={Bike} title="No drivers found" description="Try adjusting your search." className="border-0" />}
            pagination={{ page, pages: totalPages, total, onPageChange: (p) => fetchDrivers(p) }}
          />
        </>
      ) : (
        <DataTable
          columns={appColumns}
          data={applications}
          getRowId={(a) => a._id}
          loading={appsLoading}
          onRowClick={(a) => a.userId && navigate(`/admin/users/drivers/${a.userId._id}`)}
          emptyState={<EmptyState icon={CheckCircle2} title="No pending applications" description="All driver applications have been reviewed." className="border-0" />}
          pagination={{ page: appsPage, pages: appsPages, total: appsTotal, onPageChange: (p) => fetchApplications(p) }}
        />
      )}

      <ConfirmDialog
        open={driverDialog === "suspend"}
        onClose={() => setDriverDialog(null)}
        onConfirm={handleSuspend}
        title={`Suspend ${selected?.firstName} ${selected?.lastName}?`}
        description="The driver will be unable to accept deliveries until unsuspended."
        confirmLabel="Suspend Driver"
        requireReason
        reasonPlaceholder="Reason for suspension…"
        destructive={false}
      />
      <ConfirmDialog
        open={driverDialog === "unsuspend"}
        onClose={() => setDriverDialog(null)}
        onConfirm={handleUnsuspend}
        title={`Unsuspend ${selected?.firstName} ${selected?.lastName}?`}
        description="The driver will regain access to accept deliveries."
        confirmLabel="Unsuspend"
        requireReason
        reasonPlaceholder="Reason for lifting the suspension…"
        destructive={false}
      />
      <ConfirmDialog
        open={appDialog === "approve"}
        onClose={() => setAppDialog(null)}
        onConfirm={handleApprove}
        title={`Approve ${appName}?`}
        description="The driver will be notified and can start accepting deliveries."
        confirmLabel="Approve Driver"
        destructive={false}
      />
      <ConfirmDialog
        open={appDialog === "reject"}
        onClose={() => setAppDialog(null)}
        onConfirm={handleReject}
        title={`Reject ${appName}?`}
        description="The driver will be notified with the rejection reason."
        confirmLabel="Reject"
        requireReason
        reasonPlaceholder="Reason for rejection…"
        destructive
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
