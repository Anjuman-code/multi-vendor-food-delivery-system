import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { ArrowLeft, Car, CheckCircle, Loader2, Star, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
    licenseNumber?: string;
    applicationStatus?: string;
    totalDeliveries?: number;
    completedDeliveries?: number;
    cancelledDeliveries?: number;
    rating?: { average: number; count: number } | number;
    reviewCount?: number;
    totalEarnings?: number;
    pendingEarnings?: number;
    isOnline?: boolean;
    isAvailable?: boolean;
    lastActive?: string;
  };
}

interface DriverRating {
  _id: string;
  rating: number;
  comment?: string;
  orderId?: { orderNumber?: string } | string;
  customerId?: { firstName?: string; lastName?: string } | string;
  createdAt: string;
}

type Tab = "info" | "ratings";

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("info");
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [unsuspendOpen, setUnsuspendOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [ratings, setRatings] = useState<DriverRating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const { toast } = useToast();

  const fetchDriver = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminService.getDriver(id);
      const d = (res.data as { data: { user: DriverDetail; driverProfile: DriverDetail["driverProfile"] } }).data;
      setDriver({ ...d.user, driverProfile: d.driverProfile ?? undefined });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDriver(); }, [fetchDriver]);

  useEffect(() => {
    if (tab !== "ratings" || !id) return;
    setRatingsLoading(true);
    adminService.getDriverRatings(id, { page: 1, limit: 20 })
      .then((res) => {
        const d = (res.data as { data: { ratings: DriverRating[] } }).data;
        setRatings(d.ratings);
      })
      .finally(() => setRatingsLoading(false));
  }, [tab, id]);

  const handleSuspend = async (reason?: string) => {
    if (!id) return;
    await adminService.suspendDriver(id, { reason: reason! });
    toast({ title: "Driver Suspended" });
    setSuspendOpen(false);
    setDriver((d) => d ? { ...d, isSuspended: true } : d);
  };

  const handleApprove = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await adminService.approveDriver(id);
      toast({ title: "Approved", description: "Driver application approved." });
      fetchDriver();
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setApproveOpen(false);
    }
  };

  const handleReject = async (reason?: string) => {
    if (!id) return;
    await adminService.rejectDriver(id, { reason: reason! });
    toast({ title: "Rejected" });
    setRejectOpen(false);
    fetchDriver();
  };

  const handleUnsuspend = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await adminService.unsuspendDriver(id);
      toast({ title: "Unsuspended", description: "Driver can now accept deliveries." });
      setDriver((d) => d ? { ...d, isSuspended: false } : d);
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setUnsuspendOpen(false);
    }
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
  const appStatus = dp?.applicationStatus;
  const ratingValue = dp?.rating && typeof dp.rating === "object" ? dp.rating.average : dp?.rating as number | undefined;
  const ratingCount = dp?.rating && typeof dp.rating === "object" ? dp.rating.count : dp?.reviewCount;

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
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {dp?.isAvailable
                  ? <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600">Available</span>
                  : <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">Offline</span>}
                {driver.isSuspended && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-red-600">Suspended</span>}
                {appStatus && <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${appStatus === "approved" ? "bg-green-50 text-green-600" : appStatus === "pending" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>{appStatus}</span>}
                {dp?.vehicleType && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-600 capitalize">{dp.vehicleType}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {appStatus === "pending" && (
              <>
                <button onClick={() => setApproveOpen(true)} disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Approve
                </button>
                <button onClick={() => setRejectOpen(true)}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </>
            )}
            {driver.isSuspended ? (
              <button onClick={() => setUnsuspendOpen(true)} disabled={actionLoading}
                className="px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors">
                Unsuspend
              </button>
            ) : (
              appStatus === "approved" && (
                <button onClick={() => setSuspendOpen(true)}
                  className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                  Suspend
                </button>
              )
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Rating", value: ratingValue ? <div className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /><span>{ratingValue.toFixed(1)}</span>{ratingCount ? <span className="text-xs text-gray-400">({ratingCount})</span> : null}</div> : "—" },
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

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["info", "ratings"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Driver Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-400">Email</span><p className="text-gray-800">{driver.email}</p></div>
            {driver.phone && <div><span className="text-gray-400">Phone</span><p className="text-gray-800">{driver.phone}</p></div>}
            {dp?.vehicleType && <div><span className="text-gray-400">Vehicle</span><p className="text-gray-800 capitalize">{dp.vehicleType}</p></div>}
            {dp?.vehicleNumber && <div><span className="text-gray-400">Plate</span><p className="text-gray-800">{dp.vehicleNumber}</p></div>}
            {dp?.licenseNumber && <div><span className="text-gray-400">License</span><p className="text-gray-800">{dp.licenseNumber}</p></div>}
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
      )}

      {tab === "ratings" && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Customer Ratings</h2>
          {ratingsLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : ratings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No ratings yet.</p>
          ) : (
            <div className="space-y-3">
              {ratings.map((r) => (
                <div key={r._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex shrink-0 mt-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog open={suspendOpen} onClose={() => setSuspendOpen(false)} onConfirm={handleSuspend}
        title="Suspend this driver?" description="The driver will be unable to accept deliveries."
        confirmLabel="Suspend" requireReason reasonPlaceholder="Reason for suspension…" destructive />
      <ConfirmDialog open={approveOpen} onClose={() => setApproveOpen(false)} onConfirm={handleApprove}
        title="Approve this driver?" description="The driver will be notified and can start accepting deliveries."
        confirmLabel="Approve" destructive={false} />
      <ConfirmDialog open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={handleReject}
        title="Reject this application?" description="The driver will be notified with the reason."
        confirmLabel="Reject" requireReason reasonPlaceholder="Reason for rejection…" destructive />
      <ConfirmDialog open={unsuspendOpen} onClose={() => setUnsuspendOpen(false)} onConfirm={handleUnsuspend}
        title="Unsuspend this driver?" description="The driver will regain access to accept deliveries."
        confirmLabel="Unsuspend" destructive={false} />
    </div>
  );
}
