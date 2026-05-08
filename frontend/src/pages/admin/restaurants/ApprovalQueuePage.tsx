import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Store, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface QueueItem {
  _id: string;
  name: string;
  cuisineType: string[];
  address: { area: string; district: string };
  createdAt: string;
  owner?: { firstName: string; lastName: string; email: string };
}

export default function ApprovalQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.getApprovalQueue();
      setItems((res.data as { data: { restaurants: QueueItem[] } }).data.restaurants);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await adminService.approveRestaurant(selected._id);
      toast({ title: "Approved", description: `${selected.name} is now live.` });
      load();
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleReject = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.rejectRestaurant(selected._id, { reason: reason! });
      toast({ title: "Rejected", description: "Application rejected." });
      load();
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-gray-900">Restaurant Approval Queue</h1>
        <p className="text-sm text-gray-500">{items.length} applications pending review</p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mb-3" />
          <h2 className="text-lg font-bold text-gray-700">All caught up!</h2>
          <p className="text-gray-400 text-sm">No pending restaurant applications.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <Link to={`/admin/restaurants/${item._id}`} className="font-bold text-gray-900 hover:text-indigo-600 transition-colors text-sm">
                      {item.name}
                    </Link>
                    <p className="text-xs text-gray-400">{item.address?.area}, {item.address?.district}</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  daysSince(item.createdAt) > 3 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                }`}>
                  <Clock className="w-3 h-3" />
                  {daysSince(item.createdAt)}d
                </span>
              </div>

              {item.cuisineType?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.cuisineType.slice(0, 3).map((c) => (
                    <span key={c} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">{c}</span>
                  ))}
                </div>
              )}

              {item.owner && (
                <p className="text-xs text-gray-400 mb-4">
                  Owner: <span className="text-gray-600">{item.owner.firstName} {item.owner.lastName}</span>
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setSelected(item); setDialog("approve"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => { setSelected(item); setDialog("reject"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmDialog open={dialog === "approve"} onClose={() => setDialog(null)} onConfirm={handleApprove}
        title={`Approve ${selected?.name}?`}
        description="The restaurant will go live and customers can place orders."
        confirmLabel="Approve Restaurant" destructive={false} />
      <ConfirmDialog open={dialog === "reject"} onClose={() => setDialog(null)} onConfirm={handleReject}
        title={`Reject ${selected?.name}?`}
        description="Please provide a reason that will be communicated to the vendor."
        confirmLabel="Reject" requireReason reasonPlaceholder="Reason for rejection…" destructive />
    </div>
  );
}
