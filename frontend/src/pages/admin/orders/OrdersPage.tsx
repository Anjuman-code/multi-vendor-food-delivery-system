import {
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  EmptyState,
  exportToCsv,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";
import adminService from "@/services/adminService";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { Download, ShoppingBag, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  customerId: { firstName: string; lastName: string; email?: string } | string;
  restaurantId: { name: string } | string;
  driverId?: { firstName: string; lastName: string } | string | null;
}

interface ApiResponse {
  data: {
    orders: Order[];
    pagination: { page: number; pages: number; total: number; limit: number };
  };
}

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "picked_up",
  "delivered",
  "cancelled",
];

const PAYMENT_STATUSES = ["pending", "paid", "refunded", "failed"];

const customerName = (o: Order) =>
  typeof o.customerId === "object" && o.customerId
    ? `${o.customerId.firstName} ${o.customerId.lastName}`.trim()
    : "—";

const restaurantName = (o: Order) =>
  typeof o.restaurantId === "object" && o.restaurantId ? o.restaurantId.name : "—";

const driverName = (o: Order) =>
  typeof o.driverId === "object" && o.driverId
    ? `${o.driverId.firstName} ${o.driverId.lastName}`.trim()
    : "—";

export default function OrdersPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hasRefund, setHasRefund] = useState(false);
  const [hasCoupon, setHasCoupon] = useState(false);

  const [selected, setSelected] = useState<Order | null>(null);
  const [dialog, setDialog] = useState<"cancel" | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrders = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page: p, limit: 20 };
        if (search) params.search = search;
        if (status !== "all") params.status = status;
        if (paymentStatus !== "all") params.paymentStatus = paymentStatus;
        if (from) params.from = from;
        if (to) params.to = to;
        if (hasRefund) params.hasRefund = true;
        if (hasCoupon) params.hasCoupon = true;
        const res = await adminService.listOrders(params);
        const d = (res.data as ApiResponse).data;
        setOrders(d.orders);
        setTotal(d.pagination.total);
        setTotalPages(d.pagination.pages);
        setPage(d.pagination.page);
      } catch {
        toast.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    },
    [search, status, paymentStatus, from, to, hasRefund, hasCoupon],
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchOrders(1), 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [fetchOrders]);

  const handleCancel = async (reason?: string) => {
    if (!selected) return;
    try {
      await adminService.cancelOrder(selected._id, { reason: reason! });
      toast.success(`Order #${selected.orderNumber} cancelled`);
      fetchOrders(page);
    } catch {
      toast.error("Failed to cancel order");
      throw new Error("failed");
    }
  };

  const exportCsv = () =>
    exportToCsv("orders", orders, [
      { key: "orderNumber", header: "Order #", value: (o) => o.orderNumber },
      { key: "status", header: "Status", value: (o) => o.status },
      { key: "paymentStatus", header: "Payment", value: (o) => o.paymentStatus },
      { key: "customer", header: "Customer", value: (o) => customerName(o) },
      { key: "restaurant", header: "Restaurant", value: (o) => restaurantName(o) },
      { key: "driver", header: "Driver", value: (o) => driverName(o) },
      { key: "total", header: "Total", value: (o) => String(o.total) },
      { key: "date", header: "Date", value: (o) => formatDateTime(o.createdAt) },
    ]);

  const columns: DataTableColumn<Order>[] = [
    {
      key: "order",
      header: "Order",
      render: (o) => (
        <span className="font-mono font-medium text-primary">#{o.orderNumber}</span>
      ),
    },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
    {
      key: "customer",
      header: "Customer",
      render: (o) => <span className="text-sm text-foreground">{customerName(o)}</span>,
    },
    {
      key: "restaurant",
      header: "Restaurant",
      render: (o) => <span className="text-sm text-foreground">{restaurantName(o)}</span>,
    },
    {
      key: "payment",
      header: "Payment",
      render: (o) => <StatusBadge status={o.paymentStatus} size="sm" />,
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
      key: "date",
      header: "Date",
      render: (o) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (o) =>
        !["cancelled", "delivered"].includes(o.status) ? (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setSelected(o);
                setDialog("cancel");
              }}
              title="Cancel order"
              aria-label="Cancel order"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        description={`${total} total orders`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!orders.length}>
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/orders/disputes">Dispute Queue</Link>
            </Button>
          </>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by order number…"
      >
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All payments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Label htmlFor="from" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[150px]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="to" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[150px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch id="hasRefund" checked={hasRefund} onCheckedChange={setHasRefund} />
          <Label htmlFor="hasRefund" className="text-sm text-muted-foreground">
            Refunded
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="hasCoupon" checked={hasCoupon} onCheckedChange={setHasCoupon} />
          <Label htmlFor="hasCoupon" className="text-sm text-muted-foreground">
            Has coupon
          </Label>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={orders}
        getRowId={(o) => o._id}
        loading={loading}
        onRowClick={(o) => navigate(`/admin/orders/${o._id}`)}
        emptyState={
          <EmptyState
            icon={ShoppingBag}
            title="No orders found"
            description="Try adjusting your search or filters."
            className="border-0"
          />
        }
        pagination={{ page, pages: totalPages, total, onPageChange: (p) => fetchOrders(p) }}
      />

      <ConfirmDialog
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        onConfirm={handleCancel}
        title={`Cancel Order #${selected?.orderNumber}?`}
        description="This cancels the order and may trigger a refund. The customer will be notified."
        confirmLabel="Cancel Order"
        requireReason
        reasonPlaceholder="Reason for cancellation…"
        destructive
      />
    </div>
  );
}
