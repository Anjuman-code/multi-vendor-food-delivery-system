import { Button } from "@/components/ui/button";
import {
  DataTable,
  PageHeader,
  SegmentedTabs,
  StatusBadge,
  VendorEmptyState,
  type DataTableColumn,
} from "@/components/vendor";
import { useSocketContext } from "@/contexts/SocketContext";
import { toast } from "@/lib/toast";
import vendorService from "@/services/vendorService";
import type { VendorOrder, VendorOrderStatus } from "@/types/vendor";
import { formatCurrency } from "@/utils/format";
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

const UPCOMING_STATUSES: VendorOrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "picked_up",
];

const TABS: { id: TabId; label: string; statuses: VendorOrderStatus[] }[] = [
  { id: "live", label: "Live", statuses: UPCOMING_STATUSES },
  { id: "incoming", label: "Incoming", statuses: ["pending"] },
  { id: "history", label: "History", statuses: ["delivered", "cancelled"] },
];

const LIVE_STATUSES: VendorOrderStatus[] = UPCOMING_STATUSES;

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
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs ${
        isUrgent ? "text-red-600" : "text-muted-foreground"
      }`}
    >
      <Timer className="h-3 w-3" />
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
};

const customerNameOf = (order: VendorOrder): string =>
  typeof order.customerId === "object"
    ? `${order.customerId.firstName} ${order.customerId.lastName}`.trim()
    : order.customer?.name || "—";

// ── Order Card (live / incoming) ─────────────────────────────────

const OrderCard: React.FC<{
  order: VendorOrder;
  onStatusUpdate: (orderId: string, status: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}> = ({ order, onStatusUpdate, expanded, onToggleExpand }) => {
  const customerName = customerNameOf(order);
  const action = NEXT_ACTION[order.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-brand-300"
    >
      {/* Summary row */}
      <div
        className="flex cursor-pointer items-center gap-4 px-5 py-4"
        onClick={onToggleExpand}
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Link
              to={`/vendor/orders/${order._id}`}
              className="text-sm font-semibold text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {order.orderNumber}
            </Link>
            <StatusBadge status={order.status} size="sm" />
            {LIVE_STATUSES.includes(order.status) && (
              <ElapsedTimer createdAt={order.createdAt} />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {customerName} · {order.items?.length || 0} item
            {(order.items?.length || 0) !== 1 ? "s" : ""} ·{" "}
            {formatCurrency(order.total)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action && (
            <Button
              size="sm"
              variant="brand"
              onClick={(e) => {
                e.stopPropagation();
                onStatusUpdate(order._id, action.status);
              }}
              className="h-8"
            >
              {order.status === "pending" ? (
                <Package className="mr-1 h-3.5 w-3.5" />
              ) : (
                <Clock className="mr-1 h-3.5 w-3.5" />
              )}
              {action.label}
            </Button>
          )}
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
            <div className="space-y-2 border-t border-border bg-muted/40 px-5 py-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-foreground">
                      {item.quantity}x {item.name}
                    </span>
                    {item.variants && item.variants.length > 0 && (
                      <span className="ml-1 text-muted-foreground">
                        ({item.variants.map((v) => v.name).join(", ")})
                      </span>
                    )}
                    {item.specialInstructions && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.specialInstructions}
                      </p>
                    )}
                  </div>
                  <span className="ml-4 text-muted-foreground">
                    {formatCurrency(item.itemTotal)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2 text-sm font-medium text-foreground">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
              {order.specialInstructions && (
                <p className="mt-1 text-xs text-muted-foreground">
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
  const { newOrderCount } = useSocketContext();
  const { audioEnabled, toggle: toggleAudio, playChime } = useAudioNotification();
  const [activeTab, setActiveTab] = useState<TabId>("live");
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    pages: 0,
  });

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
        if (
          activeTab === "incoming" &&
          orders.length > 0 &&
          newOrders.length > orders.length
        ) {
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
          ? prev.map((o) =>
              o._id === orderId
                ? { ...o, status: newStatus as VendorOrderStatus }
                : o,
            )
          : prev.filter((o) => o._id !== orderId),
      );
      toast.success("Success", { description: `Order status updated` });
    } else {
      toast.error("Error", { description: res.message });
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

  const historyColumns: DataTableColumn<VendorOrder>[] = [
    {
      key: "orderNumber",
      header: "Order",
      render: (o) => (
        <Link
          to={`/vendor/orders/${o._id}`}
          className="font-semibold text-primary hover:underline"
        >
          {o.orderNumber}
        </Link>
      ),
    },
    { key: "customer", header: "Customer", render: (o) => customerNameOf(o) },
    {
      key: "items",
      header: "Items",
      align: "right",
      render: (o) => o.items?.length || 0,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (o) => (
        <span className="font-semibold text-foreground">{formatCurrency(o.total)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (o) => <StatusBadge status={o.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Confirm, prepare and track orders in real time."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAudio}
            className={
              audioEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""
            }
            aria-pressed={audioEnabled}
          >
            {audioEnabled ? (
              <Bell className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <BellOff className="mr-1.5 h-3.5 w-3.5" />
            )}
            {audioEnabled ? "Alerts on" : "Alerts off"}
          </Button>
        }
      />

      <SegmentedTabs<TabId>
        value={activeTab}
        onChange={setActiveTab}
        options={TABS.map((t) => ({
          value: t.id,
          label: t.label,
          count:
            t.id === "incoming" && newOrderCount > 0 ? newOrderCount : undefined,
        }))}
      />

      {/* History tab → table; live/incoming → card stream */}
      {activeTab === "history" ? (
        <DataTable
          columns={historyColumns}
          data={orders}
          getRowId={(o) => o._id}
          loading={loading}
          pagination={{
            page: pagination.page,
            pages: pagination.pages,
            total: pagination.total,
            onPageChange: (p) => loadOrders(p),
          }}
          emptyState={
            <VendorEmptyState
              icon={ClipboardList}
              title="No completed orders yet"
              description="Delivered and cancelled orders will appear here."
              className="border-0"
            />
          }
        />
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <VendorEmptyState
          icon={ClipboardList}
          title={`No ${activeTab} orders`}
          description={
            activeTab === "live"
              ? "No upcoming orders right now."
              : "No new orders waiting."
          }
        />
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

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
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
