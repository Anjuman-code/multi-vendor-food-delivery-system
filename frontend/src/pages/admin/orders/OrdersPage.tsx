import { AdminTable, Column } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  customerId: { firstName: string; lastName: string } | string;
  restaurantId: { name: string } | string;
  driverId?: { firstName: string; lastName: string } | string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-600",
  confirmed: "bg-blue-50 text-blue-600",
  preparing: "bg-indigo-50 text-indigo-600",
  ready_for_pickup: "bg-violet-50 text-violet-600",
  picked_up: "bg-purple-50 text-purple-600",
  on_the_way: "bg-sky-50 text-sky-600",
  delivered: "bg-emerald-50 text-emerald-600",
  cancelled: "bg-red-50 text-red-600",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${statusColors[status] ?? "bg-gray-100 text-gray-600"}`}>
    {status.replace(/_/g, " ")}
  </span>
);

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [dialog, setDialog] = useState<"cancel" | null>(null);
  const { toast } = useToast();
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch = useCallback(async (p = 1, q = search, status = filterStatus) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, limit: 20 };
      if (q) params.search = q;
      if (status) params.status = status;
      const res = await adminService.listOrders(params);
      const d = (res.data as { data: { orders: Order[]; pagination: { total: number; pages: number; page: number; limit: number } } }).data;
      setOrders(d.orders);
      setTotal(d.pagination.total);
      setTotalPages(d.pagination.pages);
      setPage(d.pagination.page);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetch(1), 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search, filterStatus, fetch]);

  const handleCancel = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.cancelOrder(selected._id, { reason: reason! });
      toast({ title: "Cancelled", description: `Order #${selected.orderNumber} cancelled.` });
      fetch(page);
    } catch {
      toast({ title: "Error", description: "Failed to cancel order.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const customerName = (o: Order) =>
    typeof o.customerId === "object" && o.customerId
      ? `${o.customerId.firstName} ${o.customerId.lastName}`
      : "—";

  const restaurantName = (o: Order) =>
    typeof o.restaurantId === "object" && o.restaurantId ? o.restaurantId.name : "—";

  const columns: Column<Order>[] = [
    {
      key: "order",
      header: "Order",
      render: (o) => (
        <Link to={`/admin/orders/${o._id}`} className="font-mono font-medium text-indigo-600 hover:text-indigo-800">
          #{o.orderNumber}
        </Link>
      ),
    },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
    {
      key: "customer",
      header: "Customer",
      render: (o) => <span className="text-gray-700 text-sm">{customerName(o)}</span>,
    },
    {
      key: "restaurant",
      header: "Restaurant",
      render: (o) => <span className="text-gray-700 text-sm">{restaurantName(o)}</span>,
    },
    {
      key: "total",
      header: "Total",
      render: (o) => <span className="font-medium text-gray-900">৳{o.total.toLocaleString()}</span>,
    },
    {
      key: "payment",
      header: "Payment",
      render: (o) => (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
          o.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-600" :
          o.paymentStatus === "refunded" ? "bg-blue-50 text-blue-600" :
          "bg-gray-100 text-gray-500"
        }`}>{o.paymentStatus}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (o) => <span className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString()}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (o) => (
        !["cancelled", "delivered"].includes(o.status) ? (
          <button
            onClick={(e) => { e.preventDefault(); setSelected(o); setDialog("cancel"); }}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">{total} total orders</p>
        </div>
        <Link to="/admin/orders/disputes"
          className="px-4 py-2 text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors">
          Dispute Queue
        </Link>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white">
          <option value="">All statuses</option>
          {Object.keys(statusColors).map((s) => (
            <option key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      <AdminTable columns={columns} data={orders} loading={loading} page={page} totalPages={totalPages}
        onPageChange={(p) => fetch(p)} total={total} limit={20} emptyMessage="No orders found." />

      <ConfirmDialog open={dialog === "cancel"} onClose={() => setDialog(null)} onConfirm={handleCancel}
        title={`Cancel Order #${selected?.orderNumber}?`}
        description="This action will cancel the order and may trigger a refund."
        confirmLabel="Cancel Order" requireReason reasonPlaceholder="Reason for cancellation…" destructive />
    </div>
  );
}
