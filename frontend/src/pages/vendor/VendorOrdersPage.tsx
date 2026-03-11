import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Clock,
  ChevronDown,
  Eye,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import vendorService from "@/services/vendorService";
import { useVendor } from "@/contexts/VendorContext";
import type {
  VendorOrder,
  VendorOrderStatus,
  VendorOrdersParams,
} from "@/types/vendor";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-indigo-100 text-indigo-700",
  ready_for_pickup: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-cyan-100 text-cyan-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready_for_pickup",
  ready_for_pickup: "out_for_delivery",
};

const VendorOrdersPage: React.FC = () => {
  const { restaurants } = useVendor();
  const { toast } = useToast();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Filters
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [filterRestaurantId, setFilterRestaurantId] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const loadOrders = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params: VendorOrdersParams = {
        page,
        limit: 20,
      };
      if (status) params.status = status;
      if (search) params.search = search;
      if (filterRestaurantId) params.restaurantId = filterRestaurantId;

      const res = await vendorService.getOrders(params);
      if (res.success && res.data) {
        setOrders(res.data.orders);
        setPagination(res.data.pagination);
      }
      setLoading(false);
    },
    [status, search, filterRestaurantId],
  );

  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const res = await vendorService.updateOrderStatus(orderId, newStatus);
    if (res.success) {
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId
            ? { ...o, status: newStatus as VendorOrderStatus }
            : o,
        ),
      );
      toast({
        title: "Success",
        description: `Order ${newStatus.replace(/_/g, " ")}`,
      });
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) =>
    `৳${amount.toLocaleString("en-BD")}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pagination.total} total orders
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="rounded-lg gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search order number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {restaurants.length > 1 && (
            <select
              value={filterRestaurantId}
              onChange={(e) => setFilterRestaurantId(e.target.value)}
              className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="">All Restaurants</option>
              {restaurants.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </motion.div>
      )}

      {/* Orders Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No orders found
          </h3>
          <p className="text-gray-500">
            {search || status
              ? "Try adjusting your filters."
              : "Orders will appear here once customers start ordering."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 font-medium">Order #</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Items</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link
                        to={`/vendor/orders/${order._id}`}
                        className="text-orange-600 hover:underline font-medium"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {order.customer?.name || "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {order.items?.length || 0}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          STATUS_COLORS[order.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/vendor/orders/${order._id}`}
                          className="p-1.5 hover:bg-gray-100 rounded-lg"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </Link>
                        {NEXT_STATUS[order.status] && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleStatusUpdate(
                                order._id,
                                NEXT_STATUS[order.status],
                              )
                            }
                            className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-md"
                          >
                            {NEXT_STATUS[order.status]
                              .replace(/_/g, " ")
                              .replace(/^\w/, (c) => c.toUpperCase())}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages}
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
