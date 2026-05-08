import { AdminTable, Column } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { Package, Search, Star, UserX } from "lucide-react";
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

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Driver | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const { toast } = useToast();
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch = useCallback(async (p = 1, q = search) => {
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

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetch(1), 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, fetch]);

  const handleSuspend = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.suspendDriver(selected._id, { reason: reason! });
      toast({ title: "Suspended", description: "Driver has been suspended." });
      fetch(page);
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
          <p className="text-sm text-gray-500">{total} total drivers</p>
        </div>
      </motion.div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search drivers…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
      </div>

      <AdminTable columns={columns} data={drivers} loading={loading} page={page} totalPages={totalPages}
        onPageChange={(p) => fetch(p)} total={total} limit={20} emptyMessage="No drivers found." />

      <ConfirmDialog open={suspendOpen} onClose={() => setSuspendOpen(false)} onConfirm={handleSuspend}
        title={`Suspend ${selected?.firstName} ${selected?.lastName}?`}
        description="The driver will be unable to accept deliveries until unsuspended."
        confirmLabel="Suspend Driver" requireReason reasonPlaceholder="Reason for suspension…" destructive={false} />
    </div>
  );
}
