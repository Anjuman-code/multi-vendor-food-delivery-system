import { Button } from "@/components/ui/button";
import { useSocketContext } from "@/contexts/SocketContext";
import { useVendor } from "@/contexts/VendorContext";
import { useToast } from "@/hooks/use-toast";
import vendorService from "@/services/vendorService";
import type { VendorOrder, VendorOrderStatus } from "@/types/vendor";
import { AnimatePresence, motion } from "framer-motion";
import {
    Bell,
    BellOff,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    Clock,
    Loader2,
    Package,
    Timer,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// ── Constants ────────────────────────────────────────────────────

type TabId = "live" | "incoming" | "history";

const TABS: { id: TabId; label: string; statuses: VendorOrderStatus[]; color: string }[] = [
  { id: "live", label: "Live", statuses: ["preparing", "ready"], color: "border-orange-500 text-orange-600" },
  { id: "incoming", label: "Incoming", statuses: ["pending"], color: "border-blue-500 text-blue-600" },
  { id: "history", label: "History", statuses: ["confirmed", "picked_up", "delivered", "cancelled"], color: "border-gray-400 text-gray-600" },
];

const LIVE_STATUSES: VendorOrderStatus[] = ["preparing", "ready"];
const INCOMING_STATUSES: VendorOrderStatus[] = ["pending"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-emerald-100 text-emerald-700",
  picked_up: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// Single-action button: the "next logical step" for each status
const NEXT_ACTION: Record<string, { label: string; status: string } | null> = {
  pending: { label: "Confirm Order", status: "confirmed" },
  confirmed: { label: "Start Preparing", status: "preparing" },
  preparing: { label: "Mark as Ready", status: "ready" },
  ready: null, // driver picks up
  picked_up: null,
  delivered: null,
  cancelled: null,
};

// ── Audio notification hook ──────────────────────────────────────

const useAudioNotification = () => {
  const [audioEnabled, setAudioEnabled] = useState(() => {
    return localStorage.getItem("vendor-order-audio") !== "false";
  });
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChime = useCallback(() => {
    if (!audioEnabled) return;
    try {
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio not supported
    }
  }, [audioEnabled]);

  const toggle = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("vendor-order-audio", String(next));
      return next;
    });
  }, []);

  return { audioEnabled, toggle, playChime };
};

// ── Countdown timer ─────────────────────────────────────────────

const ElapsedTimer: React.FC<{ createdAt: string }> = ({ createdAt }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const isUrgent = mins >= 15;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono ${isUrgent ? "text-red-600" : "text-gray-500"}`}>
      <Timer className="w-3 h-3" />
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
};

// ── Order Card ──────────────────────────────────────────────────

const OrderCard: React.FC<{
  order: VendorOrder;
  onStatusUpdate: (orderId: string, status: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}> = ({ order, onStatusUpdate, expanded, onToggleExpand }) => {
  const customerName =
    typeof order.customerId === "object"
      ? `${order.customerId.firstName} ${order.customerId.lastName}`.trim()
      : order.customer?.name || "—";

  const action = NEXT_ACTION[order.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden"
    >
      {/* Summary row */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={`/vendor/orders/${order._id}`}
              className="font-semibold text-orange-600 hover:underline text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {order.orderNumber}
            </Link>
            <span className={`status-pill ${STATUS_COLORS[order.status]}`}>
              {order.status.replace(/_/g, " ")}
            </span>
            {LIVE_STATUSES.includes(order.status) && (
              <ElapsedTimer createdAt={order.createdAt} />
            )}
          </div>
          <p className="text-sm text-gray-500">
            {customerName} · {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""} · ৳{order.total.toLocaleString("en-BD")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {action && (
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); onStatusUpdate(order._id, action.status); }}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs h-8 px-3"
            >
              {order.status === "pending" ? (
                <Package className="w-3.5 h-3.5 mr-1" />
              ) : (
                <Clock className="w-3.5 h-3.5 mr-1" />
              )}
              {action.label}
            </Button>
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-5 py-3 space-y-2 bg-gray-50/50">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-800">{item.quantity}x {item.name}</span>
                    {item.variants && item.variants.length > 0 && (
                      <span className="text-gray-400 ml-1">
                        ({item.variants.map((v) => v.name).join(", ")})
                      </span>
                    )}
                    {item.specialInstructions && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.specialInstructions}</p>
                    )}
                  </div>
                  <span className="text-gray-600 ml-4">৳{item.itemTotal}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>৳{order.total.toLocaleString("en-BD")}</span>
              </div>
              {order.specialInstructions && (
                <p className="text-xs text-gray-500 mt-1">
                  Note: {order.specialInstructions}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Main page ────────────────────────────────────────────────────

const VendorOrdersPage: React.FC = () => {
  const { restaurants } = useVendor();
  const { toast } = useToast();
  const { newOrderCount } = useSocketContext();
  const { audioEnabled, toggle: toggleAudio, playChime } = useAudioNotification();
  const [activeTab, setActiveTab] = useState<TabId>("live");
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, pages: 0 });

  const activeStatuses = TABS.find((t) => t.id === activeTab)?.statuses || [];

  const loadOrders = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params: Record<string, unknown> = { page, limit: 30 };
      if (activeStatuses.length > 0) params.status = activeStatuses.join(",");

      const res = await vendorService.getOrders(params as never);
      if (res.success && res.data) {
        const newOrders = res.data.orders;
        // Play chime for new incoming orders
        if (activeTab === "incoming" && orders.length > 0 && newOrders.length > orders.length) {
          playChime();
        }
        setOrders(newOrders);
        setPagination(res.data.pagination);
      }
      setLoading(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab],
  );

  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  // Auto-refresh live tab
  useEffect(() => {
    if (activeTab !== "live") return;
    const interval = setInterval(() => loadOrders(pagination.page), 15000);
    return () => clearInterval(interval);
  }, [activeTab, loadOrders, pagination.page]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const res = await vendorService.updateOrderStatus(orderId, newStatus);
    if (res.success) {
      // Remove from current list if status changed away from current tab's filter
      setOrders((prev) =>
        activeStatuses.includes(newStatus as VendorOrderStatus)
          ? prev.map((o) => (o._id === orderId ? { ...o, status: newStatus as VendorOrderStatus } : o))
          : prev.filter((o) => o._id !== orderId),
      );
      toast({ title: "Success", description: `Order status updated` });
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Tabs + Audio toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.id === "incoming" && newOrderCount > 0 && (
                <span className="ml-1.5 min-w-[18px] h-4.5 px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full inline-flex items-center justify-center">
                  {newOrderCount > 9 ? "9+" : newOrderCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={toggleAudio}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            audioEnabled
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-gray-50 border-gray-200 text-gray-500"
          }`}
        >
          {audioEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          {audioEnabled ? "Alert On" : "Alert Off"}
        </button>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No {activeTab} orders</h3>
          <p className="text-gray-500">
            {activeTab === "live" ? "No orders currently being prepared." :
             activeTab === "incoming" ? "No new orders waiting." :
             "No completed orders yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onStatusUpdate={handleStatusUpdate}
              expanded={expandedOrders.has(order._id)}
              onToggleExpand={() => toggleExpand(order._id)}
            />
          ))}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages} · {pagination.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadOrders(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => loadOrders(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VendorOrdersPage;
