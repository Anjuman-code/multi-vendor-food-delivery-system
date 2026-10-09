/**
 * OrdersPage – customer order list with filtering and pagination.
 */
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/lib/toast";
import { useSocket } from "@/hooks/useSocket";
import orderService from "@/services/orderService";
import type { Order, OrderStatus } from "@/types/order";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { motion } from "framer-motion";
import {
    ChevronRight,
    Clock,
    Package,
    ShoppingBag,
    WifiOff,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Link } from "@/components/ui/Link";

const FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

// ── Socket payload ─────────────────────────────────────────────
interface OrderStatusUpdatePayload {
  _id: string;
  orderNumber: string;
  newStatus: string;
  previousStatus: string;
  updatedAt: string;
}

const OrdersPage: React.FC = () => {
  const { socket, connectionFailed } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentFilter = searchParams.get("filter") || "";
  const currentPage = Number(searchParams.get("page") || "1");

  const [orders, setOrders] = useState<Order[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const statusParam = currentFilter || undefined;

    const res = await orderService.getOrders(currentPage, 10, statusParam);
    if (res.success && res.data) {
      setOrders(res.data.orders);
      setTotalPages(res.data.pagination.pages);
    } else {
      toast.error("Error", {
        description: res.message || "Failed to load orders.",
      });
    }
    setLoading(false);
  }, [currentFilter, currentPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Real-time: update list in-place when order status changes ────
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data: OrderStatusUpdatePayload) => {
      // Toast is shown globally by SocketContext — just update the list
      setOrders((prev) =>
        prev.map((o) =>
          o._id === data._id
            ? { ...o, status: data.newStatus as OrderStatus }
            : o,
        ),
      );
    };

    socket.on("orderStatusUpdate", handleStatusUpdate);
    return () => {
      socket.off("orderStatusUpdate", handleStatusUpdate);
    };
  }, [socket]);

  const setFilter = (val: string) => {
    const params = new URLSearchParams(searchParams);
    if (val) params.set("filter", val);
    else params.delete("filter");
    params.set("page", "1");
    setSearchParams(params);
  };

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    setSearchParams(params);
  };

  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <PageHeader
          title="My Orders"
          description="View and track your previous and active orders"
          actions={
            connectionFailed ? (
              <span
                className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200"
                title="Real-time updates unavailable"
              >
                <WifiOff className="h-3.5 w-3.5" />
                Live Sync Offline
              </span>
            ) : undefined
          }
        />

        {/* Filters */}
        <div className="flex gap-2 my-6 flex-wrap">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={currentFilter === f.value ? "default" : "outline"}
              size="sm"
              className={
                currentFilter === f.value
                  ? "bg-orange-500 hover:bg-orange-600"
                  : ""
              }
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3" role="status" aria-label="Loading orders">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="space-y-2 flex-1 min-w-0">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders found"
            description={
              currentFilter
                ? "Try changing your filter to view other orders."
                : "You haven't placed any orders yet. Browse our restaurants and find something delicious!"
            }
            action={{
              label: "Browse Restaurants",
              onClick: () => navigate("/restaurants"),
            }}
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order, idx) => (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Link to={`/orders/${order._id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {order.orderNumber}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <StatusBadge status={order.status} size="sm" />
                        <StatusBadge
                          status={order.paymentStatus === 'paid' ? 'paid' : 'unpaid'}
                          label={
                            order.paymentStatus === 'paid'
                              ? 'Paid'
                              : order.paymentMethod === 'cash_on_delivery'
                              ? 'Cash'
                              : 'Unpaid'
                          }
                          size="sm"
                        />
                        <span className="font-bold text-gray-900 text-sm">
                          {formatCurrency(order.total)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Prev
            </Button>
            <span className="flex items-center text-sm text-gray-600 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OrdersPage;
