import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { ArrowLeft, Car, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

interface DriverDetail {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isSuspended: boolean;
  createdAt: string;
  driverProfile?: {
    vehicleType?: string;
    vehicleNumber?: string;
    status?: string;
    totalDeliveries?: number;
    completedDeliveries?: number;
    cancelledDeliveries?: number;
    rating?: number;
    reviewCount?: number;
    totalEarnings?: number;
    pendingEarnings?: number;
    isOnline?: boolean;
    lastActive?: string;
  };
}

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    adminService.getDriver(id)
      .then((res) => setDriver((res.data as { data: { driver: DriverDetail } }).data.driver))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSuspend = async (reason?: string) => {
    if (!id) return;
    await adminService.suspendDriver(id, { reason: reason! });
    toast({ title: "Driver Suspended" });
    setSuspendOpen(false);
    setDriver((d) => d ? { ...d, isSuspended: true } : d);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-[3px] border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!driver) return <p className="text-gray-500">Driver not found.</p>;

  const dp = driver.driverProfile;

  return (
    <div className="space-y-5 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/admin/users/drivers" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Drivers
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Car className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{driver.firstName} {driver.lastName}</h1>
              <div className="flex items-center gap-2 mt-1">
                {dp?.isOnline
                  ? <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600">Online</span>
                  : <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">Offline</span>}
                {driver.isSuspended && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-red-600">Suspended</span>}
                {dp?.vehicleType && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-600 capitalize">{dp.vehicleType}</span>}
              </div>
            </div>
          </div>
          {!driver.isSuspended && (
            <button onClick={() => setSuspendOpen(true)}
              className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
              Suspend
            </button>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Rating", value: dp?.rating ? <div className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /><span>{dp.rating.toFixed(1)}</span></div> : "—" },
          { label: "Total Deliveries", value: dp?.totalDeliveries?.toLocaleString() ?? "—" },
          { label: "Total Earnings", value: dp?.totalEarnings ? `৳${dp.totalEarnings.toLocaleString()}` : "—" },
          { label: "Pending Earnings", value: dp?.pendingEarnings ? `৳${dp.pendingEarnings.toLocaleString()}` : "৳0" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500">{s.label}</p>
            <div className="text-xl font-bold text-gray-900 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-3">Driver Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-400">Email</span><p className="text-gray-800">{driver.email}</p></div>
          {driver.phone && <div><span className="text-gray-400">Phone</span><p className="text-gray-800">{driver.phone}</p></div>}
          {dp?.vehicleType && <div><span className="text-gray-400">Vehicle</span><p className="text-gray-800 capitalize">{dp.vehicleType}</p></div>}
          {dp?.vehicleNumber && <div><span className="text-gray-400">Plate</span><p className="text-gray-800">{dp.vehicleNumber}</p></div>}
          {dp?.completedDeliveries !== undefined && (
            <div><span className="text-gray-400">Completed</span><p className="text-gray-800">{dp.completedDeliveries}</p></div>
          )}
          {dp?.cancelledDeliveries !== undefined && (
            <div><span className="text-gray-400">Cancelled</span><p className="text-gray-800">{dp.cancelledDeliveries}</p></div>
          )}
          <div><span className="text-gray-400">Joined</span><p className="text-gray-800">{new Date(driver.createdAt).toLocaleDateString()}</p></div>
          {dp?.lastActive && (
            <div><span className="text-gray-400">Last Active</span><p className="text-gray-800">{new Date(dp.lastActive).toLocaleString()}</p></div>
          )}
        </div>
      </div>

      <ConfirmDialog open={suspendOpen} onClose={() => setSuspendOpen(false)} onConfirm={handleSuspend}
        title="Suspend this driver?" description="The driver will be unable to accept deliveries."
        confirmLabel="Suspend" requireReason reasonPlaceholder="Reason for suspension…" destructive />
    </div>
  );
}
