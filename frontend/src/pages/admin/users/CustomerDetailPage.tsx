import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import {
    ArrowLeft, Ban, CheckCircle, Gift, Mail, Package, Phone, Shield, ShoppingBag, Star, UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

interface CustomerDetail {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    isActive: boolean;
    isEmailVerified: boolean;
    isSuspended: boolean;
    isBanned: boolean;
    bannedReason?: string;
    suspendedReason?: string;
    createdAt: string;
    lastLogin?: string;
    profileImage?: string;
  };
  customerProfile?: {
    loyaltyPoints: number;
    totalOrders: number;
    totalSpent: number;
    tier: string;
    savedAddresses?: unknown[];
  };
  recentOrders?: Array<{
    _id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
    restaurantId?: { name: string };
  }>;
}

type DialogType = "suspend" | "unsuspend" | "ban" | "unban" | "loyalty";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogType | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState("");
  const [loyaltyReason, setLoyaltyReason] = useState("");
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminService.getCustomer(id);
      setDetail((res.data as { data: CustomerDetail }).data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleAction = async (reason?: string) => {
    if (!id) return;
    try {
      if (dialog === "suspend") await adminService.suspendCustomer(id, { reason: reason! });
      else if (dialog === "unsuspend") await adminService.unsuspendCustomer(id, { reason: reason! });
      else if (dialog === "ban") await adminService.banCustomer(id, { reason: reason! });
      else if (dialog === "unban") await adminService.unbanCustomer(id, { reason: reason! });
      toast({ title: "Success", description: "Customer updated." });
      await load();
    } catch {
      toast({ title: "Error", description: "Action failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleLoyalty = async () => {
    if (!id) return;
    const pts = parseInt(loyaltyPoints);
    if (isNaN(pts) || pts === 0 || !loyaltyReason.trim()) return;
    setLoyaltyLoading(true);
    try {
      await adminService.adjustLoyalty(id, { points: pts, reason: loyaltyReason });
      toast({ title: "Success", description: `Loyalty points adjusted by ${pts > 0 ? "+" : ""}${pts}.` });
      setLoyaltyPoints("");
      setLoyaltyReason("");
      setDialog(null);
      await load();
    } catch {
      toast({ title: "Error", description: "Failed to adjust points.", variant: "destructive" });
    } finally {
      setLoyaltyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-[3px] border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!detail) return <p className="text-center text-gray-400 mt-12">Customer not found.</p>;

  const { user, customerProfile, recentOrders } = detail;
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
          <p className="text-sm text-gray-400">{user.email}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {!user.isBanned && !user.isSuspended && (
            <button
              onClick={() => setDialog("suspend")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition-colors"
            >
              <UserX className="w-3.5 h-3.5" /> Suspend
            </button>
          )}
          {user.isSuspended && (
            <button
              onClick={() => setDialog("unsuspend")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Unsuspend
            </button>
          )}
          {!user.isBanned ? (
            <button
              onClick={() => setDialog("ban")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
            >
              <Ban className="w-3.5 h-3.5" /> Ban
            </button>
          ) : (
            <button
              onClick={() => setDialog("unban")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Unban
            </button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
        >
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-200 to-violet-200 rounded-2xl flex items-center justify-center text-2xl font-bold text-indigo-700 mb-3">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </div>
            <h2 className="font-bold text-gray-900">{fullName}</h2>
            <span className={`mt-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
              user.isBanned ? "bg-red-50 text-red-600" :
              user.isSuspended ? "bg-amber-50 text-amber-600" :
              user.isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
            }`}>
              {user.isBanned ? "Banned" : user.isSuspended ? "Suspended" : user.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{user.email}</span>
              {user.isEmailVerified && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
            </div>
            {user.phoneNumber && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{user.phoneNumber}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Shield className="w-4 h-4 text-gray-400" />
              <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            {user.lastLogin && (
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <span>Last login: {new Date(user.lastLogin).toLocaleString()}</span>
              </div>
            )}
          </div>

          {(user.bannedReason || user.suspendedReason) && (
            <div className="mt-4 p-3 bg-red-50 rounded-xl text-xs text-red-600">
              <p className="font-bold mb-1">{user.isBanned ? "Ban Reason" : "Suspension Reason"}</p>
              <p>{user.bannedReason ?? user.suspendedReason}</p>
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2 space-y-4"
        >
          {/* Loyalty card */}
          {customerProfile && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700">Loyalty & Stats</h3>
                <button
                  onClick={() => setDialog("loyalty")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <Gift className="w-3.5 h-3.5" /> Adjust Points
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Loyalty Points", value: customerProfile.loyaltyPoints.toLocaleString(), icon: Star, color: "text-amber-500" },
                  { label: "Total Orders", value: customerProfile.totalOrders.toLocaleString(), icon: ShoppingBag, color: "text-indigo-500" },
                  { label: "Total Spent", value: `৳${customerProfile.totalSpent.toLocaleString()}`, icon: Gift, color: "text-emerald-500" },
                  { label: "Tier", value: customerProfile.tier, icon: Shield, color: "text-violet-500" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 bg-gray-50 rounded-xl">
                    <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
                    <p className="text-lg font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent orders */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700">Recent Orders</h3>
              {recentOrders && recentOrders.length > 0 && (
                <Link
                  to="/admin/orders"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  View all &rarr;
                </Link>
              )}
            </div>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-1.5">
                {recentOrders.map((o, i) => (
                  <motion.div
                    key={o._id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link
                      to={`/admin/orders/${o._id}`}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-gray-50 transition-all text-sm border border-gray-100 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-gray-800 text-xs">
                            #{o.orderNumber}
                          </span>
                          {o.restaurantId?.name && (
                            <span className="text-gray-400 text-xs truncate">
                              {o.restaurantId.name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(o.createdAt).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 text-[11px] font-semibold rounded-full capitalize ${
                        o.status === "delivered" ? "bg-emerald-50 text-emerald-600" :
                        o.status === "cancelled" ? "bg-red-50 text-red-600" :
                        o.status === "pending" ? "bg-yellow-50 text-yellow-600" :
                        o.status === "confirmed" ? "bg-blue-50 text-blue-600" :
                        o.status === "preparing" ? "bg-indigo-50 text-indigo-600" :
                        o.status === "ready" || o.status === "ready_for_pickup" ? "bg-violet-50 text-violet-600" :
                        o.status === "picked_up" || o.status === "on_the_way" ? "bg-purple-50 text-purple-600" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                      <span className="shrink-0 font-semibold text-gray-800 text-sm w-20 text-right">
                        ৳{o.total.toLocaleString()}
                      </span>
                      <span className="shrink-0 text-gray-300 group-hover:text-indigo-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-gray-400">
                <Package className="w-8 h-8 mb-2" />
                <p className="text-sm">No orders yet</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Action Dialogs */}
      <ConfirmDialog open={dialog === "suspend"} onClose={() => setDialog(null)} onConfirm={handleAction}
        title={`Suspend ${user.firstName}?`}
        description="The customer will be blocked from placing orders until unsuspended."
        confirmLabel="Suspend" requireReason reasonPlaceholder="Reason for suspension…" destructive={false} />
      <ConfirmDialog open={dialog === "unsuspend"} onClose={() => setDialog(null)} onConfirm={handleAction}
        title="Lift Suspension?" description="The customer will regain full access."
        confirmLabel="Unsuspend" requireReason reasonPlaceholder="Reason…" destructive={false} />
      <ConfirmDialog open={dialog === "ban"} onClose={() => setDialog(null)} onConfirm={handleAction}
        title={`Permanently ban ${user.firstName}?`}
        description="This cannot be undone easily. The customer will be permanently blocked."
        confirmLabel="Ban Customer" requireReason reasonPlaceholder="Detailed reason for ban…" destructive />
      <ConfirmDialog open={dialog === "unban"} onClose={() => setDialog(null)} onConfirm={handleAction}
        title="Lift Ban?" description="The customer will regain access."
        confirmLabel="Unban" requireReason reasonPlaceholder="Reason for lifting ban…" destructive={false} />

      {/* Loyalty adjustment modal */}
      {dialog === "loyalty" && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDialog(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-4">Adjust Loyalty Points</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Points (+ to add, - to deduct)</label>
                <input
                  type="number"
                  value={loyaltyPoints}
                  onChange={(e) => setLoyaltyPoints(e.target.value)}
                  placeholder="e.g. 100 or -50"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Reason</label>
                <input
                  value={loyaltyReason}
                  onChange={(e) => setLoyaltyReason(e.target.value)}
                  placeholder="Reason for adjustment…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setDialog(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button
                onClick={handleLoyalty}
                disabled={loyaltyLoading || !loyaltyPoints || !loyaltyReason.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
              >
                {loyaltyLoading ? "Saving…" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
