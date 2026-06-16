import {
  AuditTimeline,
  type AuditEntry,
  ConfirmDialog,
  DetailHeader,
  EmptyState,
  FormDialog,
  SectionCard,
  StatusBadge,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DeliveryMap, LiveStageStrip, OrderChat } from "@/components/orders";
import { useSocketContext } from "@/contexts/SocketContext";
import { toast } from "@/lib/toast";
import adminService from "@/services/adminService";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { Bike, Clock, MapPin, MessageSquare, Package, RefreshCcw, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const VALID_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "picked_up",
  "delivered",
  "cancelled",
];

interface OrderItem {
  menuItemId?: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
}
interface OrderDetail {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  tipAmount?: number;
  createdAt: string;
  customer: { _id: string; firstName: string; lastName: string; email: string; phone?: string };
  restaurant: {
    _id: string;
    name: string;
    address?: string;
    coordinates?: { lat?: number; lng?: number };
  };
  driver?: { _id: string; firstName: string; lastName: string; phone?: string };
  driverId?: string;
  deliveryStage?: import("@/types/order").DeliveryStage;
  items: OrderItem[];
  deliveryAddress?: {
    street?: string;
    area?: string;
    district?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  statusHistory?: { status: string; timestamp: string; note?: string }[];
  refundLineItems?: Array<{ name: string; refundAmount: number; reason?: string }>;
}

interface DriverOption {
  _id: string;
  firstName: string;
  lastName: string;
}

const str = (v: unknown) => (v == null ? undefined : String(v));

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { joinOrderRoom, leaveOrderRoom, orderLocations, orderStages, orderEtas } =
    useSocketContext();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<"cancel" | "refund" | "override" | "reassign" | null>(null);

  // Override
  const [overrideStatus, setOverrideStatus] = useState("");
  // Refund
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  // Reassign
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [driverId, setDriverId] = useState("");
  const [reassignReason, setReassignReason] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminService.getOrder(id);
      const payload = (res.data as { data: { order: Record<string, unknown>; auditHistory: AuditEntry[] } }).data;
      const o = payload.order;
      const c = o.customerId as Record<string, unknown> | undefined;
      const r = o.restaurantId as Record<string, unknown> | undefined;
      const d = o.driverId as Record<string, unknown> | undefined;
      const addr = r?.address as Record<string, unknown> | undefined;
      setOrder({
        _id: o._id as string,
        orderNumber: o.orderNumber as string,
        status: o.status as string,
        paymentStatus: o.paymentStatus as string,
        paymentMethod: o.paymentMethod as string,
        total: o.total as number,
        subtotal: o.subtotal as number,
        deliveryFee: o.deliveryFee as number,
        discount: o.discount as number | undefined,
        tipAmount: o.tipAmount as number | undefined,
        createdAt: o.createdAt as string,
        customer: c
          ? {
              _id: c._id as string,
              firstName: c.firstName as string,
              lastName: c.lastName as string,
              email: c.email as string,
              phone: str(c.phoneNumber),
            }
          : { _id: "", firstName: "Unknown", lastName: "", email: "" },
        restaurant: r
          ? {
              _id: r._id as string,
              name: r.name as string,
              address: addr ? `${addr.street}, ${addr.area}, ${addr.district}` : undefined,
              coordinates: addr?.coordinates as
                | { lat?: number; lng?: number }
                | undefined,
            }
          : { _id: "", name: "Unknown" },
        driver: d
          ? {
              _id: d._id as string,
              firstName: d.firstName as string,
              lastName: d.lastName as string,
              phone: str(d.phoneNumber),
            }
          : undefined,
        driverId: d ? (d._id as string) : str(o.driverId),
        deliveryStage: o.deliveryStage as OrderDetail["deliveryStage"],
        items: (o.items as Array<Record<string, unknown>>).map((i) => ({
          menuItemId: str(i.menuItemId),
          name: i.name as string,
          quantity: i.quantity as number,
          price: i.price as number,
          totalPrice: (i.itemTotal ?? i.totalPrice) as number,
        })),
        deliveryAddress: o.deliveryAddress as OrderDetail["deliveryAddress"],
        statusHistory: o.statusHistory as OrderDetail["statusHistory"],
        refundLineItems: o.refundLineItems as OrderDetail["refundLineItems"],
      });
      setAudit(payload.auditHistory ?? []);
    } catch {
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Join the order room so the live map reflects rider movement + stage/ETA.
  useEffect(() => {
    if (!id) return;
    joinOrderRoom(id);
    return () => leaveOrderRoom(id);
  }, [id, joinOrderRoom, leaveOrderRoom]);

  // Keep the refund amount in sync with the selected line items.
  useEffect(() => {
    if (!order || selectedItems.size === 0) return;
    const sum = [...selectedItems].reduce((acc, idx) => acc + (order.items[idx]?.totalPrice ?? 0), 0);
    setRefundAmount(String(sum));
  }, [selectedItems, order]);

  const refundedTotal = order?.refundLineItems?.reduce((s, li) => s + li.refundAmount, 0) ?? 0;

  const handleCancel = async (reason?: string) => {
    if (!id) return;
    await adminService.cancelOrder(id, { reason: reason! });
    toast.success("Order cancelled");
    await load();
  };

  const handleOverride = async (reason?: string) => {
    if (!id || !overrideStatus) return;
    await adminService.overrideOrderStatus(id, { status: overrideStatus, reason: reason! });
    toast.success("Status updated");
    setOverrideStatus("");
    await load();
  };

  const submitRefund = async () => {
    if (!id || !order) return;
    const amount = parseFloat(refundAmount);
    if (Number.isNaN(amount) || amount <= 0 || amount > order.total) {
      toast.error(`Enter an amount between ৳1 and ${formatCurrency(order.total)}`);
      return;
    }
    if (refundReason.trim().length < 5) {
      toast.error("Provide a refund reason (5+ chars)");
      return;
    }
    const lineItems = [...selectedItems].map((idx) => {
      const it = order.items[idx];
      return { menuItemId: it.menuItemId ?? "", name: it.name, quantity: it.quantity, amount: it.totalPrice };
    });
    setBusy(true);
    try {
      await adminService.issueRefund(id, {
        amount,
        reason: refundReason.trim(),
        lineItems: lineItems.length ? lineItems : undefined,
      });
      toast.success(`Refund of ${formatCurrency(amount)} issued`);
      setDialog(null);
      setRefundAmount("");
      setRefundReason("");
      setSelectedItems(new Set());
      await load();
    } catch {
      toast.error("Refund failed");
    } finally {
      setBusy(false);
    }
  };

  const openReassign = async () => {
    setDialog("reassign");
    try {
      const res = await adminService.listDrivers({ limit: 100, isActive: true });
      setDrivers((res.data as { data: { drivers: DriverOption[] } }).data.drivers);
    } catch {
      setDrivers([]);
    }
  };

  const submitReassign = async () => {
    if (!id || !driverId || reassignReason.trim().length < 5) {
      toast.error("Pick a driver and give a reason");
      return;
    }
    setBusy(true);
    try {
      await adminService.reassignDriver(id, { driverId, reason: reassignReason.trim() });
      toast.success("Driver reassigned");
      setDialog(null);
      setDriverId("");
      setReassignReason("");
      await load();
    } catch {
      toast.error("Reassign failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!order) {
    return <EmptyState icon={Package} title="Order not found" />;
  }

  const canCancel = order.status !== "cancelled" && order.status !== "delivered";
  const canRefund = order.paymentStatus === "paid" && refundedTotal < order.total;

  return (
    <div className="max-w-5xl space-y-5">
      <DetailHeader
        backTo="/admin/orders"
        backLabel="Orders"
        title={`#${order.orderNumber}`}
        icon={Package}
        subtitle={formatDateTime(order.createdAt)}
        badges={
          <>
            <StatusBadge status={order.status} />
            <StatusBadge status={order.paymentStatus} size="sm" />
          </>
        }
        actions={
          <>
            {canCancel && (
              <Button variant="outline" size="sm" onClick={() => setDialog("cancel")}>
                Cancel Order
              </Button>
            )}
            {canRefund && (
              <Button variant="outline" size="sm" onClick={() => setDialog("refund")}>
                Issue Refund
              </Button>
            )}
            {order.driver && canCancel && (
              <Button variant="outline" size="sm" onClick={openReassign}>
                <RefreshCcw className="mr-1.5 h-4 w-4" /> Reassign
              </Button>
            )}
            <div className="flex items-center gap-1.5">
              <Select value={overrideStatus} onValueChange={setOverrideStatus}>
                <SelectTrigger className="h-9 w-[170px]">
                  <SelectValue placeholder="Override status…" />
                </SelectTrigger>
                <SelectContent>
                  {VALID_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {overrideStatus && (
                <Button variant="brand" size="sm" onClick={() => setDialog("override")}>
                  Apply
                </Button>
              )}
            </div>
          </>
        }
      />

      {refundedTotal > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">{formatCurrency(refundedTotal)} refunded</span>
          {refundedTotal >= order.total ? " (full)" : " (partial)"} on this order.
        </div>
      )}

      {/* Live tracking (read-only) for in-flight orders */}
      {["confirmed", "preparing", "ready", "picked_up"].includes(order.status) && (
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Live tracking
            </span>
          }
        >
          {(orderStages[order._id] ?? order.deliveryStage) && (
            <div className="mb-4">
              <LiveStageStrip stage={orderStages[order._id] ?? order.deliveryStage} />
            </div>
          )}
          <DeliveryMap
            className="h-64"
            store={
              order.restaurant.coordinates?.lat != null &&
              order.restaurant.coordinates?.lng != null
                ? {
                    lat: order.restaurant.coordinates.lat,
                    lng: order.restaurant.coordinates.lng,
                  }
                : null
            }
            customer={
              order.deliveryAddress?.coordinates
                ? {
                    lat: order.deliveryAddress.coordinates.latitude,
                    lng: order.deliveryAddress.coordinates.longitude,
                  }
                : null
            }
            driver={
              orderLocations[order._id]
                ? {
                    lat: orderLocations[order._id].latitude,
                    lng: orderLocations[order._id].longitude,
                  }
                : null
            }
            driverHeading={orderLocations[order._id]?.heading ?? null}
            eta={orderEtas[order._id] ?? null}
          />
        </SectionCard>
      )}

      {/* Conversation oversight (read-only) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Customer ↔ Rider
            </span>
          }
        >
          <OrderChat
            orderId={order._id}
            channel="customer_driver"
            peerLabel="Customer ↔ Rider"
            readOnly
            className="border-0"
          />
        </SectionCard>
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Customer ↔ Restaurant
            </span>
          }
        >
          <OrderChat
            orderId={order._id}
            channel="customer_vendor"
            peerLabel="Customer ↔ Restaurant"
            readOnly
            className="border-0"
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SectionCard title={<span className="flex items-center gap-2"><User className="h-4 w-4" /> Customer</span>}>
          <p className="font-semibold text-foreground">
            {order.customer.firstName} {order.customer.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{order.customer.email}</p>
          {order.customer.phone && <p className="text-xs text-muted-foreground">{order.customer.phone}</p>}
        </SectionCard>

        <SectionCard title={<span className="flex items-center gap-2"><Package className="h-4 w-4" /> Restaurant</span>}>
          <p className="font-semibold text-foreground">{order.restaurant.name}</p>
          {order.restaurant.address && <p className="text-xs text-muted-foreground">{order.restaurant.address}</p>}
        </SectionCard>

        <SectionCard title={<span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Delivery</span>}>
          {order.deliveryAddress ? (
            <>
              {order.deliveryAddress.street && <p className="text-sm text-foreground">{order.deliveryAddress.street}</p>}
              {order.deliveryAddress.area && (
                <p className="text-xs text-muted-foreground">
                  {order.deliveryAddress.area}, {order.deliveryAddress.district}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
          {order.driver && (
            <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
              <Bike className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {order.driver.firstName} {order.driver.lastName}
                </p>
                {order.driver.phone && <p className="text-xs text-muted-foreground">{order.driver.phone}</p>}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Order Items" flush>
        <div className="divide-y divide-border">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  ×{item.quantity} · {formatCurrency(item.price)} each
                </p>
              </div>
              <span className="text-sm font-semibold text-foreground">{formatCurrency(item.totalPrice)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1 border-t border-border px-5 py-4">
          <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
          <Row label="Delivery Fee" value={formatCurrency(order.deliveryFee)} />
          {order.tipAmount ? <Row label="Tip" value={formatCurrency(order.tipAmount)} /> : null}
          {order.discount ? <Row label="Discount" value={`−${formatCurrency(order.discount)}`} accent /> : null}
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={<span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Status Timeline</span>}>
          {order.statusHistory?.length ? (
            <ol className="relative space-y-4 pl-5">
              <span className="absolute bottom-1 left-[5px] top-1 w-px bg-border" />
              {order.statusHistory.map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-brand-500" />
                  <p className="text-sm font-medium capitalize text-foreground">{h.status.replace(/_/g, " ")}</p>
                  {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                  <p className="text-xs text-muted-foreground/70">{formatDateTime(h.timestamp)}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No status history.</p>
          )}
        </SectionCard>

        <SectionCard title="Admin Activity" description="Refunds, overrides and reassignments on this order.">
          <AuditTimeline entries={audit} emptyLabel="No admin actions on this order." />
        </SectionCard>
      </div>

      {/* Cancel */}
      <ConfirmDialog open={dialog === "cancel"} onClose={() => setDialog(null)} onConfirm={handleCancel}
        title="Cancel this order?" description="The order will be cancelled and the customer notified."
        confirmLabel="Cancel Order" requireReason destructive />

      {/* Override */}
      <ConfirmDialog open={dialog === "override"} onClose={() => setDialog(null)} onConfirm={handleOverride}
        title={`Override status to "${overrideStatus.replace(/_/g, " ")}"?`}
        description="Admin override — provide a reason for the audit log."
        confirmLabel="Override" requireReason destructive={false} />

      {/* Refund */}
      <FormDialog
        open={dialog === "refund"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Issue Refund"
        description={`Up to ${formatCurrency(order.total - refundedTotal)} can be refunded.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
            <Button variant="brand" onClick={submitRefund} disabled={busy}>
              {busy ? "Processing…" : "Issue Refund"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Refund specific items (optional)</Label>
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
              {order.items.map((it, i) => (
                <label key={i} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                  <Checkbox
                    checked={selectedItems.has(i)}
                    onCheckedChange={(c) => {
                      setSelectedItems((prev) => {
                        const next = new Set(prev);
                        if (c) next.add(i);
                        else next.delete(i);
                        return next;
                      });
                    }}
                  />
                  <span className="flex-1 text-sm text-foreground">
                    {it.name} <span className="text-muted-foreground">×{it.quantity}</span>
                  </span>
                  <span className="text-sm font-medium">{formatCurrency(it.totalPrice)}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="refund-amt">Refund amount</Label>
            <Input
              id="refund-amt"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder={String(order.total)}
            />
            <button
              type="button"
              onClick={() => { setSelectedItems(new Set()); setRefundAmount(String(order.total - refundedTotal)); }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Refund full remaining ({formatCurrency(order.total - refundedTotal)})
            </button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="refund-reason">Reason</Label>
            <Textarea
              id="refund-reason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Reason for refund…"
              rows={2}
            />
          </div>
        </div>
      </FormDialog>

      {/* Reassign driver */}
      <FormDialog
        open={dialog === "reassign"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Reassign Driver"
        description="Assign this delivery to a different driver."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
            <Button variant="brand" onClick={submitReassign} disabled={busy}>
              {busy ? "Saving…" : "Reassign"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d._id} value={d._id}>
                    {d.firstName} {d.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reassign-reason">Reason</Label>
            <Textarea
              id="reassign-reason"
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder="Reason for reassignment…"
              rows={2}
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}

const Row: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className={`flex justify-between text-sm ${accent ? "text-emerald-600" : "text-muted-foreground"}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);
