import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import riderService, { type RiderOrder } from "@/services/riderService";
import { AnimatePresence, motion } from "framer-motion";
import {
    Clock,
    MapPin,
    Package,
    RefreshCw,
    Store,
    Truck
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const fmt = (n: number) => `৳${n.toLocaleString("en-BD")}`;
const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" });

const AvailableDeliveriesPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await riderService.getAvailableOrders();
      const d = (res as { data: { data: { orders: RiderOrder[] } } }).data;
      setOrders(d.data?.orders ?? []);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (!silent) {
        toast({ variant: "destructive", title: msg ?? "Failed to load available orders" });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchOrders();
    // Auto-refresh every 15 seconds
    intervalRef.current = setInterval(() => void fetchOrders(true), 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchOrders]);

  const handleAccept = async (orderId: string) => {
    setAccepting(orderId);
    try {
      await riderService.acceptOrder(orderId);
      toast({ title: "Order accepted!", description: "Head to the restaurant to pick up." });
      navigate("/rider/active");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({
        variant: "destructive",
        title: msg ?? "Order no longer available",
        description: "It may have been accepted by another driver.",
      });
      void fetchOrders(true);
    } finally {
      setAccepting(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Available Deliveries</h1>
          <p className="text-sm text-gray-500">
            {orders.length} order{orders.length !== 1 ? "s" : ""} waiting
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void fetchOrders(true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Empty state */}
      {orders.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700">No orders available</p>
          <p className="text-sm text-gray-400 mt-1">
            Refreshes automatically every 15 seconds
          </p>
        </motion.div>
      )}

      {/* Order cards */}
      <AnimatePresence initial={false}>
        {orders.map((order) => {
          const restaurant =
            typeof order.restaurantId === "object" ? order.restaurantId : null;
          const earnings = (order.deliveryFee ?? 0) + (order.tipAmount ?? 0);

          return (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Restaurant row */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-50">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {restaurant?.name ?? "Restaurant"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {typeof restaurant?.address === "object" && restaurant?.address
                      ? String((restaurant.address as Record<string, unknown>).area ?? "")
                      : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  <Clock className="w-3 h-3 mr-1" />
                  {fmtTime(order.createdAt)}
                </Badge>
              </div>

              {/* Delivery details */}
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    {order.deliveryAddress?.area}
                    {order.deliveryAddress?.district
                      ? `, ${order.deliveryAddress.district}`
                      : ""}
                  </span>
                </div>

                {/* Items summary */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Package className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    {(order.items ?? []).length} item
                    {(order.items ?? []).length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Earnings row */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <div>
                    <p className="text-xs text-gray-400">Delivery fee</p>
                    <p className="text-lg font-bold text-green-600">{fmt(earnings)}</p>
                    {(order.tipAmount ?? 0) > 0 && (
                      <p className="text-xs text-green-500 mt-0.5">
                        Includes {fmt(order.tipAmount!)} tip
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => void handleAccept(order._id)}
                    disabled={accepting === order._id}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {accepting === order._id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Accepting…
                      </>
                    ) : (
                      <>
                        <Truck className="w-4 h-4 mr-2" />
                        Accept
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AvailableDeliveriesPage;
