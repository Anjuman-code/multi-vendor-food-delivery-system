import { AdminTable, Column } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { CheckCircle, Package, Search, Star, UserX, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

interface Driver {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  isSuspended: boolean;
  createdAt: string;
  driverProfile?: {
    vehicleType: string;
    totalDeliveries: number;
    rating: { average: number; count: number };
    isAvailable: boolean;
    isVerified: boolean;
  };
}

interface Application {
  _id: string;
  userId: { _id: string; firstName: string; lastName: string; email: string; phoneNumber: string };
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  applicationStatus: string;
  createdAt: string;
}

type Tab = "active" | "applications";

export default function DriversPage() {
  const [tab, setTab] = useState<Tab>("active");

  // Active drivers state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Driver | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);

  // Applications state
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsTotal, setAppsTotal] = useState(0);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const { toast } = useToast();
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDrivers = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await adminService.listDrivers({ page: p, limit: 20, search: q || undefined });
      const d = (res.data as { data: { drivers: Driver[]; pagination: { total: number; pages: number; page: number; limit: number } } }).data;
      setDrivers(d.drivers);
      setTotal(d.pagination.total);
      setTotalPages(d.pagination.pages);
      setPage(d.pagination.page);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchApplications = useCallback(async () => {
    setAppsLoading(true);
    try {
      const res = await adminService.listDriverApplications({ page: 1, limit: 50 });
      const d = (res.data as { data: { applications: Application[]; pagination: { total: number } } }).data;
      setApplications(d.applications);
      setAppsTotal(d.pagination.total);
    } finally {
      setAppsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchDrivers(1), 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, fetchDrivers]);

  useEffect(() => {
    if (tab === "applications") fetchApplications();
  }, [tab, fetchApplications]);

  const handleSuspend = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.suspendDriver(selected._id, { reason: reason! });
      toast({ title: "Suspended", description: "Driver has been suspended." });
      fetchDrivers(page);
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    try {
      await adminService.approveDriver(selectedApp.userId._id);
      toast({ title: "Approved", description: "Driver application approved." });
      fetchApplications();
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleReject = async (reason?: string) => {
    if (!selectedApp) return;
    try {
      await adminService.rejectDriver(selectedApp.userId._id, { reason: reason! });
      toast({ title: "Rejected", description: "Application rejected." });
      fetchApplications();
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const columns: Column<Driver>[] = [
    {
      key: "driver",
      header: "Driver",
      render: (d) => (
        <Link to={`/admin/users/drivers/${d._id}`} className="group flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-sky-200 to-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-sky-700 shrink-0">
            {d.firstName.charAt(0)}{d.lastName.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{d.firstName} {d.lastName}</p>
            <p className="text-xs text-gray-400">{d.email}</p>
          </div>
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (d) => {
        if (d.isSuspended) return <span className="px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-600 rounded-full">Suspended</span>;
        if (d.driverProfile?.isAvailable) return <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-full">Available</span>;
        return <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500 rounded-full">Offline</span>;
      },
    },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (d) => <span className="capitalize text-gray-600">{d.driverProfile?.vehicleType ?? "—"}</span>,
    },
    {
      key: "rating",
      header: "Rating",
      render: (d) =>
        d.driverProfile?.rating.count ? (
          <span className="flex items-center gap-1 text-gray-700">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            {d.driverProfile.rating.average.toFixed(1)}
            <span className="text-gray-400 text-xs">({d.driverProfile.rating.count})</span>
          </span>
        ) : <span className="text-gray-300">—</span>,
    },
    {
      key: "deliveries",
      header: "Deliveries",
      render: (d) => (
        <span className="flex items-center gap-1 text-gray-600">
          <Package className="w-3.5 h-3.5 text-gray-400" />
          {d.driverProfile?.totalDeliveries ?? 0}
        </span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (d) => <span className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (d) => (
        <div onClick={(e) => e.preventDefault()}>
          {!d.isSuspended && (
            <button onClick={() => { setSelected(d); setSuspendOpen(true); }}
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
          <h1 className="text-xl font-bold text-gray-900">Drivers</h1>
          <p className="text-sm text-gray-500">{tab === "active" ? `${total} total drivers` : `${appsTotal} pending applications`}</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["active", "applications"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "active" ? "Active Drivers" : "Applications"}
            {t === "applications" && appsTotal > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">{appsTotal}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "active" && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drivers…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
          </div>
          <AdminTable columns={columns} data={drivers} loading={loading} page={page} totalPages={totalPages}
            onPageChange={(p) => fetchDrivers(p)} total={total} limit={20} emptyMessage="No drivers found." />
        </>
      )}

      {tab === "applications" && (
        <div className="space-y-3">
          {appsLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>
          ) : applications.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No pending applications.</div>
          ) : (
            applications.map((app) => (
              <motion.div key={app._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center text-sm font-bold text-orange-700 shrink-0">
                    {app.userId.firstName.charAt(0)}{app.userId.lastName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{app.userId.firstName} {app.userId.lastName}</p>
                    <p className="text-xs text-gray-400">{app.userId.email} · {app.userId.phoneNumber}</p>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">{app.vehicleType} · {app.vehicleNumber} · License: {app.licenseNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">{new Date(app.createdAt).toLocaleDateString()}</span>
                  <button onClick={() => { setSelectedApp(app); setApproveOpen(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => { setSelectedApp(app); setRejectOpen(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      <ConfirmDialog open={suspendOpen} onClose={() => setSuspendOpen(false)} onConfirm={handleSuspend}
        title={`Suspend ${selected?.firstName} ${selected?.lastName}?`}
        description="The driver will be unable to accept deliveries until unsuspended."
        confirmLabel="Suspend Driver" requireReason reasonPlaceholder="Reason for suspension…" destructive={false} />

      <ConfirmDialog open={approveOpen} onClose={() => setApproveOpen(false)} onConfirm={handleApprove}
        title={`Approve ${selectedApp?.userId.firstName} ${selectedApp?.userId.lastName}?`}
        description="The driver will be notified and can start accepting deliveries."
        confirmLabel="Approve Driver" destructive={false} />

      <ConfirmDialog open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={handleReject}
        title={`Reject ${selectedApp?.userId.firstName} ${selectedApp?.userId.lastName}?`}
        description="The driver will be notified with the rejection reason."
        confirmLabel="Reject" requireReason reasonPlaceholder="Reason for rejection…" destructive />
    </div>
  );
}
