/**
 * OrdersPage – customer order list with filtering and pagination.
 */
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/useSocket";
import orderService from "@/services/orderService";
import type { Order, OrderStatus } from "@/types/order";
import { motion } from "framer-motion";
import {
    ChevronRight,
    Clock,
    Loader2,
    Package,
    ShoppingBag,
    WifiOff,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-indigo-100 text-indigo-800",
  ready: "bg-purple-100 text-purple-800",
  picked_up: "bg-cyan-100 text-cyan-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  picked_up: "Picked Up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

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
  const { toast } = useToast();
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
      toast({
        title: "Error",
        description: res.message || "Failed to load orders.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [currentFilter, currentPage, toast]);

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

  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(d));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          {connectionFailed && (
            <span
              className="flex items-center gap-1 text-xs text-gray-400"
              title="Real-time updates unavailable"
            >
              <WifiOff className="h-4 w-4" />
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">          {FILTERS.map((f) => (
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
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-10 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-1">
              No orders found
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {currentFilter
                ? "Try changing the filter."
                : "You haven't placed any orders yet."}
            </p>
            <Button asChild className="bg-orange-500 hover:bg-orange-600">
              <Link to="/">Browse Restaurants</Link>
            </Button>
          </Card>
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
                            {fmtDate(order.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}
                        >
                          {STATUS_LABEL[order.status]}
                        </span>
                        <span className="font-bold text-gray-900 text-sm">
                          ৳{order.total.toFixed(2)}
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
