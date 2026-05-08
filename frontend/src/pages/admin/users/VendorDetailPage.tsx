import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

interface VendorDetail {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isSuspended: boolean;
  createdAt: string;
  vendorProfile?: {
    businessName: string;
    isVerified: boolean;
    commissionRate?: number;
    totalRestaurants?: number;
    totalRevenue?: number;
    pendingPayout?: number;
  };
  restaurants?: { _id: string; name: string; approvalStatus: string; totalOrders?: number }[];
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<"verify" | "suspend" | "commission" | null>(null);
  const [commissionInput, setCommissionInput] = useState("");
  const { toast } = useToast();

  const load = () => {
    if (!id) return;
    setLoading(true);
    adminService.getVendor(id)
      .then((res) => {
        const v = (res.data as { data: { vendor: VendorDetail } }).data.vendor;
        setVendor(v);
        setCommissionInput(String(v.vendorProfile?.commissionRate ?? 15));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleVerify = async () => {
    if (!id) return;
    await adminService.verifyVendor(id, { action: "approve" });
    toast({ title: "Vendor Verified" });
    setDialog(null);
    setVendor((v) => v ? { ...v, vendorProfile: { ...v.vendorProfile!, isVerified: true } } : v);
  };

  const handleSuspend = async (reason?: string) => {
    if (!id) return;
    await adminService.suspendVendor(id, { reason: reason! });
    toast({ title: "Vendor Suspended" });
    setDialog(null);
    setVendor((v) => v ? { ...v, isSuspended: true } : v);
  };

  const handleCommission = async () => {
    if (!id) return;
    const rate = parseFloat(commissionInput);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast({ title: "Invalid rate", variant: "destructive" });
      return;
    }
    await adminService.changeVendorCommission(id, { rate, reason: "Admin rate adjustment" });
    toast({ title: "Commission Updated" });
    setDialog(null);
    setVendor((v) => v ? { ...v, vendorProfile: { ...v.vendorProfile!, commissionRate: rate } } : v);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-[3px] border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!vendor) return <p className="text-gray-500">Vendor not found.</p>;

  return (
    <div className="space-y-5 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/admin/users/vendors" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Vendors
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{vendor.firstName} {vendor.lastName}</h1>
              {vendor.vendorProfile?.businessName && (
                <p className="text-sm text-gray-500">{vendor.vendorProfile.businessName}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {vendor.vendorProfile?.isVerified
                  ? <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600">Verified</span>
                  : <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-600">Pending Verification</span>}
                {vendor.isSuspended && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-red-600">Suspended</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!vendor.vendorProfile?.isVerified && (
              <button onClick={() => setDialog("verify")}
                className="px-3 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors">
                Verify Vendor
              </button>
            )}
            {!vendor.isSuspended && (
              <button onClick={() => setDialog("suspend")}
                className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                Suspend
              </button>
            )}
            <button onClick={() => setDialog("commission")}
              className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">
              Change Commission
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Commission Rate", value: `${vendor.vendorProfile?.commissionRate ?? 15}%` },
          { label: "Restaurants", value: vendor.vendorProfile?.totalRestaurants ?? "—" },
          { label: "Total Revenue", value: vendor.vendorProfile?.totalRevenue ? `৳${vendor.vendorProfile.totalRevenue.toLocaleString()}` : "—" },
          { label: "Pending Payout", value: vendor.vendorProfile?.pendingPayout ? `৳${vendor.vendorProfile.pendingPayout.toLocaleString()}` : "৳0" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-3">Contact Info</h2>
        <div className="space-y-1 text-sm">
          <p><span className="text-gray-400 w-20 inline-block">Email</span> {vendor.email}</p>
          {vendor.phone && <p><span className="text-gray-400 w-20 inline-block">Phone</span> {vendor.phone}</p>}
          <p><span className="text-gray-400 w-20 inline-block">Member since</span> {new Date(vendor.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Restaurants */}
      {vendor.restaurants && vendor.restaurants.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Restaurants</h2>
          <div className="divide-y divide-gray-50">
            {vendor.restaurants.map((r) => (
              <div key={r._id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-gray-400" />
                  <Link to={`/admin/restaurants/${r._id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                    {r.name}
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
                    r.approvalStatus === "approved" ? "bg-emerald-50 text-emerald-600" :
                    r.approvalStatus === "pending" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                  }`}>{r.approvalStatus}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog open={dialog === "verify"} onClose={() => setDialog(null)} onConfirm={handleVerify}
        title="Verify this vendor?" description="The vendor will gain full access to listing restaurants and receiving payouts."
        confirmLabel="Verify" destructive={false} />
      <ConfirmDialog open={dialog === "suspend"} onClose={() => setDialog(null)} onConfirm={handleSuspend}
        title="Suspend this vendor?" description="All of their restaurants will be temporarily closed."
        confirmLabel="Suspend" requireReason reasonPlaceholder="Reason for suspension…" destructive />

      {/* Commission Modal */}
      {dialog === "commission" && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDialog(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-4">Change Commission Rate</h3>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Commission Rate (%)</label>
            <input type="number" value={commissionInput} onChange={(e) => setCommissionInput(e.target.value)}
              min="0" max="100" step="0.5"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setDialog(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl">Cancel</button>
              <button onClick={handleCommission} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
