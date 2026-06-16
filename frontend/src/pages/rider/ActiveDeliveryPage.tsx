import {
  DeliveryMap,
  DeliveryStageStepper,
  EmptyState,
  SectionCard,
  StatusBadge,
  nextStageAction,
  type LatLng,
} from "@/components/rider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { OrderChat } from "@/components/orders";
import { useRider } from "@/contexts/RiderContext";
import { useSocketContext } from "@/contexts/SocketContext";
import { toast } from "@/lib/toast";
import { useDriverLocationBroadcast } from "@/hooks/useDriverLocationBroadcast";
import { getRoute, etaMinutesFromRoute, type LatLng as RouteLatLng } from "@/lib/routing";
import orderChatService from "@/services/orderChatService";
import riderService, { type RiderOrder } from "@/services/riderService";
import { formatCurrency } from "@/utils/format";
import { motion } from "framer-motion";
import {
  Banknote,
  Camera,
  CheckCircle,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  Radio,
  Store,
  Truck,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const storePoint = (order: RiderOrder): LatLng | null => {
  const loc =
    typeof order.restaurantId === "object"
      ? order.restaurantId.location?.coordinates
      : null;
  return loc ? { lat: loc[1], lng: loc[0] } : null;
};
const customerPoint = (order: RiderOrder): LatLng | null => {
  const c = order.deliveryAddress?.coordinates;
  return c ? { lat: c.latitude, lng: c.longitude } : null;
};

const ActiveDeliveryPage: React.FC = () => {
  const { activeOrder, setActiveOrder, refresh } = useRider();
  const { joinOrderRoom, leaveOrderRoom } = useSocketContext();
  const [order, setOrder] = useState<RiderOrder | null>(activeOrder);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [route, setRoute] = useState<RouteLatLng[] | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const lastRouteAt = useRef(0);

  // Complete-delivery dialog state
  const [completeOpen, setCompleteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [codCollected, setCodCollected] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    try {
      const res = await riderService.getActiveDelivery();
      const o =
        (res as unknown as { data: { data: { order: RiderOrder | null } } })
          .data.data?.order ?? null;
      setOrder(o);
      setActiveOrder(o);
    } finally {
      setLoading(false);
    }
  }, [setActiveOrder]);

  useEffect(() => {
    void fetchActive();
  }, [fetchActive]);

  const delivered = order?.status === "delivered";
  // Broadcast GPS to the customer for the whole active leg.
  const broadcast = useDriverLocationBroadcast(
    order?._id,
    !!order && !delivered,
  );

  const stage = order?.deliveryStage;
  const beforePickup =
    !stage || stage === "heading_to_store" || stage === "at_store";

  const points = useMemo(() => {
    if (!order) return { store: null, customer: null, driver: null };
    const driver = broadcast.position
      ? { lat: broadcast.position.latitude, lng: broadcast.position.longitude }
      : null;
    return { store: storePoint(order), customer: customerPoint(order), driver };
  }, [order, broadcast.position]);

  // Join the order socket room so chat works even before/after GPS broadcast.
  const orderId = order?._id;
  useEffect(() => {
    if (!orderId) return;
    joinOrderRoom(orderId);
    return () => leaveOrderRoom(orderId);
  }, [orderId, joinOrderRoom, leaveOrderRoom]);

  // Compute the driving route + ETA for the current leg and publish the ETA
  // (throttled) so the customer/vendor/admin share the rider's own estimate.
  useEffect(() => {
    if (!order || delivered) return;
    const wp: RouteLatLng[] = [];
    if (points.driver) wp.push(points.driver);
    if (beforePickup && points.store) wp.push(points.store);
    if (points.customer) wp.push(points.customer);
    if (wp.length < 2) return;

    const now = Date.now();
    if (now - lastRouteAt.current < 15_000 && route) return;
    lastRouteAt.current = now;

    let active = true;
    getRoute(wp).then((r) => {
      if (!active || !r) return;
      setRoute(r.geometry);
      const m = etaMinutesFromRoute(r);
      if (m != null) {
        setEta(m);
        orderChatService.updateEta(order._id, m).catch(() => {});
      }
    });
    return () => {
      active = false;
    };
  }, [order, delivered, beforePickup, points.driver, points.store, points.customer]); // eslint-disable-line react-hooks/exhaustive-deps

  const action = order ? nextStageAction(stage, delivered) : null;

  const handleAdvance = async () => {
    if (!order || !action) return;
    if (action.target === "deliver") {
      setCompleteOpen(true);
      return;
    }
    setAdvancing(true);
    try {
      const res = await riderService.advanceStage(order._id, action.target);
      const updated = (
        res as unknown as { data: { data: { order: RiderOrder } } }
      ).data.data.order;
      setOrder(updated);
      setActiveOrder(updated);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? "Couldn't update step");
    } finally {
      setAdvancing(false);
    }
  };

  const onPickProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const clearProof = () => {
    setProofFile(null);
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(null);
  };

  const handleComplete = async () => {
    if (!order) return;
    const isCod = order.paymentMethod === "cash_on_delivery";
    if (isCod && codCollected === null) {
      toast.error("Confirm whether you collected the cash");
      return;
    }
    setSubmitting(true);
    try {
      let photoUrl: string | undefined;
      if (proofFile) {
        const up = await riderService.uploadDeliveryProof(order._id, proofFile);
        photoUrl = (
          up as unknown as { data: { data: { photoUrl: string } } }
        ).data.data.photoUrl;
      }
      await riderService.updateDeliveryStatus(order._id, {
        status: "delivered",
        ...(photoUrl
          ? { deliveryProof: { photoUrl, note: note || undefined } }
          : {}),
        ...(isCod ? { codCollected: codCollected === true } : {}),
      });
      setOrder((o) => (o ? { ...o, status: "delivered" } : o));
      setCompleteOpen(false);
      clearProof();
      await refresh();
      toast.success("Delivery completed", {
        description: "Nice work — you're available for new orders.",
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? "Failed to complete");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
        <div className="h-56 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <EmptyState
          icon={Truck}
          title="No active delivery"
          description="You don't have a delivery in progress. Pick one up to get going."
          action={{
            label: "Find deliveries",
            onClick: () => (window.location.href = "/rider/available"),
          }}
        />
      </div>
    );
  }

  const restaurant =
    typeof order.restaurantId === "object" ? order.restaurantId : null;
  const customer =
    typeof order.customerId === "object" ? order.customerId : null;
  const restaurantPhone =
    restaurant?.address && typeof restaurant.address === "object"
      ? (restaurant.address as Record<string, unknown>).phone
      : undefined;
  const isCod = order.paymentMethod === "cash_on_delivery";

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground">Active delivery</h1>
          <p className="text-sm text-muted-foreground">
            Order #{order.orderNumber}
          </p>
        </div>
        <StatusBadge status={delivered ? "delivered" : "picked_up"} />
      </div>

      {/* Live map */}
      <DeliveryMap
        className="h-60"
        store={points.store}
        customer={points.customer}
        driver={points.driver}
        route={route}
        driverHeading={broadcast.position?.heading ?? null}
        eta={delivered ? null : eta}
        navigateTo={beforePickup ? points.store : points.customer}
      />

      {/* GPS broadcast indicator */}
      {!delivered && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
            broadcast.error
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <Radio className={`h-3.5 w-3.5 ${broadcast.error ? "" : "animate-pulse"}`} />
          {broadcast.error ?? "Sharing your live location with the customer."}
        </div>
      )}

      {/* Progress + action */}
      <SectionCard title="Delivery progress">
        <DeliveryStageStepper current={stage} delivered={delivered} />
        {!delivered && action && (
          <Button
            onClick={() => void handleAdvance()}
            disabled={advancing}
            size="lg"
            className="mt-2 h-12 w-full text-base font-semibold"
          >
            {advancing ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-5 w-5" />
            )}
            {action.label}
          </Button>
        )}
      </SectionCard>

      {delivered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center"
        >
          <CheckCircle className="mx-auto mb-2 h-10 w-10 text-emerald-500" />
          <p className="font-semibold text-emerald-800">Delivery completed!</p>
          <p className="mt-1 text-sm text-emerald-600">
            You're now available for new orders.
          </p>
          <Button asChild className="mt-4">
            <Link to="/rider/available">Find next delivery</Link>
          </Button>
        </motion.div>
      )}

      {/* Pickup */}
      <SectionCard
        title="Pickup"
        icon={<Store className="h-4 w-4 text-brand-500" />}
      >
        <p className="font-medium text-foreground">{restaurant?.name ?? "—"}</p>
        {restaurant?.address && typeof restaurant.address === "object" && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {String(
              (restaurant.address as Record<string, unknown>).fullAddress ??
                (restaurant.address as Record<string, unknown>).area ??
                "",
            )}
          </p>
        )}
        {typeof restaurantPhone === "string" && (
          <a
            href={`tel:${restaurantPhone}`}
            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-brand-600"
          >
            <Phone className="h-4 w-4" /> Call restaurant
          </a>
        )}
      </SectionCard>

      {/* Drop-off */}
      <SectionCard
        title="Drop-off"
        icon={<MapPin className="h-4 w-4 text-emerald-600" />}
      >
        <p className="text-sm text-foreground">
          {[order.deliveryAddress?.street, order.deliveryAddress?.area, order.deliveryAddress?.district]
            .filter(Boolean)
            .join(", ")}
        </p>
        {customer && (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <p className="text-sm font-medium text-foreground">
              {customer.firstName} {customer.lastName}
            </p>
            {customer.phoneNumber && (
              <a
                href={`tel:${customer.phoneNumber}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-600"
              >
                <Phone className="h-4 w-4" /> Call
              </a>
            )}
          </div>
        )}
      </SectionCard>

      {/* Chat with customer */}
      {!delivered && (
        <SectionCard title="Chat with customer">
          <OrderChat
            orderId={order._id}
            channel="customer_driver"
            peerLabel={
              customer ? `${customer.firstName} ${customer.lastName}`.trim() : 'Customer'
            }
            className="border-0"
          />
        </SectionCard>
      )}

      {/* Order summary */}
      <SectionCard
        title="Order"
        icon={<Package className="h-4 w-4 text-muted-foreground" />}
      >
        <ul className="space-y-1.5">
          {order.items.map((item, i) => (
            <li
              key={i}
              className="flex items-center justify-between text-sm text-foreground"
            >
              <span>{item.name}</span>
              <span className="text-muted-foreground">×{item.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">
            {isCod ? "Collect cash" : "Prepaid"}
          </span>
          <span className="font-semibold text-foreground">
            {formatCurrency(order.total)}
          </span>
        </div>
      </SectionCard>

      {/* Complete-delivery dialog */}
      <Dialog open={completeOpen} onOpenChange={(o) => !submitting && setCompleteOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete delivery</DialogTitle>
            <DialogDescription>
              Add proof of delivery{isCod ? " and confirm cash collection" : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Proof photo */}
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">
                Photo{" "}
                <span className="font-normal text-muted-foreground">
                  (recommended)
                </span>
              </p>
              {proofPreview ? (
                <div className="relative">
                  <img
                    src={proofPreview}
                    alt="Delivery proof"
                    className="h-40 w-full rounded-lg border border-border object-cover"
                  />
                  <button
                    onClick={clearProof}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-brand-300 hover:text-brand-600"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-sm">Take / upload photo</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPickProof}
              />
            </div>

            {/* Note */}
            <Textarea
              rows={2}
              placeholder="Note (e.g. left at door)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {/* COD */}
            {isCod && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <Banknote className="h-4 w-4" />
                  Collect {formatCurrency(order.total)} in cash
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={codCollected === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCodCollected(true)}
                  >
                    Cash collected
                  </Button>
                  <Button
                    type="button"
                    variant={codCollected === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCodCollected(false)}
                  >
                    Not collected
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => void handleComplete()}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="mr-2 h-4 w-4" />
              )}
              Complete delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActiveDeliveryPage;
