import { EmptyState, PageHeader } from "@/components/rider";
import { Button } from "@/components/ui/button";
import { useRider } from "@/contexts/RiderContext";
import { useToast } from "@/hooks/use-toast";
import riderService, { type RiderOrder } from "@/services/riderService";
import { formatCurrency } from "@/utils/format";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  MapPin,
  Navigation,
  Package,
  RefreshCw,
  Store,
  Truck,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" });

/** Haversine distance in km between two [lat,lng] points. */
const distanceKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const tripDistance = (order: RiderOrder): number | null => {
  const r =
    typeof order.restaurantId === "object"
      ? order.restaurantId.location?.coordinates
      : null;
  const c = order.deliveryAddress?.coordinates;
  if (!r || !c) return null;
  // restaurant location is GeoJSON [lng, lat]; delivery is {latitude, longitude}
  return distanceKm(
    { lat: r[1], lng: r[0] },
    { lat: c.latitude, lng: c.longitude },
  );
};

const AvailableDeliveriesPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, activeOrder, refresh } = useRider();
  const [orders, setOrders] = useState<RiderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await riderService.getAvailableOrders();
        setOrders(
          (res as unknown as { data: { data: { orders: RiderOrder[] } } }).data
            .data?.orders ?? [],
        );
      } catch (err: unknown) {
        if (!silent) {
          const msg = (err as { response?: { data?: { message?: string } } })
            ?.response?.data?.message;
          toast({
            variant: "destructive",
            title: msg ?? "Failed to load available orders",
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void fetchOrders();
    intervalRef.current = setInterval(() => void fetchOrders(true), 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchOrders]);

  const handleAccept = async (orderId: string) => {
    setAccepting(orderId);
    try {
      await riderService.acceptOrder(orderId);
      await refresh();
      toast({
        title: "Order accepted",
        description: "Head to the restaurant to pick it up.",
      });
      navigate("/rider/active");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast({
        variant: "destructive",
        title: msg ?? "Order no longer available",
        description: "It may have been taken by another rider.",
      });
      void fetchOrders(true);
    } finally {
      setAccepting(null);
    }
  };

  const refreshBtn = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void fetchOrders(true)}
      disabled={refreshing}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4 sm:p-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Available deliveries"
        subtitle={`${orders.length} order${orders.length !== 1 ? "s" : ""} ready for pickup`}
        actions={refreshBtn}
      />

      {/* Guards */}
      {activeOrder ? (
        <EmptyState
          icon={Truck}
          title="You're on a delivery"
          description="Finish your current delivery before picking up another order."
          action={{
            label: "Go to active delivery",
            onClick: () => navigate("/rider/active"),
          }}
        />
      ) : profile && !profile.isAvailable ? (
        <EmptyState
          icon={Package}
          title="You're offline"
          description="Go online from the top bar to start accepting deliveries."
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders right now"
          description="New deliveries appear here automatically. We refresh every 15 seconds."
        />
      ) : (
        <AnimatePresence initial={false}>
          {orders.map((order) => {
            const restaurant =
              typeof order.restaurantId === "object"
                ? order.restaurantId
                : null;
            const payout = (order.deliveryFee ?? 0) + (order.tipAmount ?? 0);
            const dist = tripDistance(order);
            const isCod = order.paymentMethod === "cash_on_delivery";

            return (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              >
                {/* Restaurant + payout header */}
                <div className="flex items-center gap-3 border-b border-border p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-600">
                    <Store className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">
                      {restaurant?.name ?? "Restaurant"}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Ready at {fmtTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">
                      {formatCurrency(payout)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">payout</p>
                  </div>
                </div>

                {/* Trip details */}
                <div className="space-y-2.5 p-4">
                  <div className="flex items-start gap-2 text-sm text-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      {order.deliveryAddress?.area}
                      {order.deliveryAddress?.district
                        ? `, ${order.deliveryAddress.district}`
                        : ""}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      {(order.items ?? []).length} item
                      {(order.items ?? []).length !== 1 ? "s" : ""}
                    </span>
                    {dist != null && (
                      <span className="inline-flex items-center gap-1">
                        <Navigation className="h-3.5 w-3.5" />
                        {dist.toFixed(1)} km trip
                      </span>
                    )}
                    {isCod && (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-600">
                        Collect {formatCurrency(order.total)} cash
                      </span>
                    )}
                    {(order.tipAmount ?? 0) > 0 && (
                      <span className="font-medium text-emerald-600">
                        +{formatCurrency(order.tipAmount!)} tip
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => void handleAccept(order._id)}
                    disabled={
                      accepting === order._id ||
                      (profile && !profile.isAvailable) ||
                      !!activeOrder
                    }
                    className="mt-1 w-full"
                  >
                    {accepting === order._id ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Accepting…
                      </>
                    ) : (
                      <>
                        <Truck className="mr-2 h-4 w-4" />
                        Accept delivery
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
};

export default AvailableDeliveriesPage;
