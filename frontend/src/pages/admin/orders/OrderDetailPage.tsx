import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Clock,
    MapPin,
    Package,
    User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
  createdAt: string;
  updatedAt: string;
  customer: { _id: string; firstName: string; lastName: string; email: string; phone?: string };
  restaurant: { _id: string; name: string; address?: string };
  driver?: { _id: string; firstName: string; lastName: string; phone?: string };
  items: { name: string; quantity: number; price: number; totalPrice: number }[];
  deliveryAddress?: { street?: string; area?: string; district?: string };
  statusHistory?: { status: string; timestamp: string; note?: string }[];
  refund?: { amount: number; reason: string; processedAt?: string };
  dispute?: { status: string; reason: string };
}

const statusColor = (s: string) => ({
  pending: "bg-amber-50 text-amber-600",
  confirmed: "bg-blue-50 text-blue-600",
  preparing: "bg-blue-50 text-blue-700",
  ready: "bg-indigo-50 text-indigo-600",
  picked_up: "bg-purple-50 text-purple-600",
  on_the_way: "bg-purple-50 text-purple-700",
  delivered: "bg-emerald-50 text-emerald-600",
  cancelled: "bg-red-50 text-red-600",
  disputed: "bg-orange-50 text-orange-600",
}[s] ?? "bg-gray-100 text-gray-600");

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<"cancel" | "refund" | "override" | null>(null);
  const [overrideStatus, setOverrideStatus] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    adminService.getOrder(id)
      .then((res) => {
        const o = (res.data as { data: { order: Record<string, unknown> } }).data.order;
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
          createdAt: o.createdAt as string,
          updatedAt: o.updatedAt as string,
          customer: c
            ? {
                _id: c._id as string,
                firstName: c.firstName as string,
                lastName: c.lastName as string,
                email: c.email as string,
                phone: c.phoneNumber as string | undefined,
              }
            : { _id: "", firstName: "Unknown", lastName: "", email: "" },
          restaurant: r
            ? {
                _id: r._id as string,
                name: r.name as string,
                address: addr
                  ? `${addr.street}, ${addr.area}, ${addr.district}`
                  : undefined,
              }
            : { _id: "", name: "Unknown" },
          driver: d
            ? {
                _id: d._id as string,
                firstName: d.firstName as string,
                lastName: d.lastName as string,
                phone: d.phoneNumber as string | undefined,
              }
            : undefined,
          items: (o.items as { name: string; quantity: number; price: number; itemTotal: number }[]).map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            totalPrice: i.itemTotal,
          })),
          deliveryAddress: o.deliveryAddress as OrderDetail["deliveryAddress"],
          statusHistory: o.statusHistory as OrderDetail["statusHistory"],
          refund: o.refund as OrderDetail["refund"],
          dispute: o.dispute as OrderDetail["dispute"],
        });
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load order details.", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async (reason?: string) => {
    if (!id) return;
    await adminService.cancelOrder(id, { reason: reason! });
    toast({ title: "Order Cancelled" });
    setDialog(null);
    setOrder((o) => o ? { ...o, status: "cancelled" } : o);
  };

  const handleRefund = async (reason?: string) => {
    if (!id || !order) return;
    await adminService.issueRefund(id, { amount: order.total, reason: reason! });
    toast({ title: "Refund Issued" });
    setDialog(null);
  };

  const handleOverride = async (reason?: string) => {
    if (!id || !overrideStatus) return;
    await adminService.overrideOrderStatus(id, { status: overrideStatus, reason: reason! });
    toast({ title: "Status Updated" });
    setDialog(null);
    setOrder((o) => o ? { ...o, status: overrideStatus } : o);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-[3px] border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) return <p className="text-gray-500">Order not found.</p>;

  return (
    <div className="space-y-5 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{order.orderNumber}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${statusColor(order.status)}`}>
                {order.status.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {order.status !== "cancelled" && order.status !== "delivered" && (
              <button onClick={() => setDialog("cancel")}
                className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                Cancel Order
              </button>
            )}
            {order.paymentStatus === "paid" && !order.refund && (
              <button onClick={() => setDialog("refund")}
                className="px-3 py-2 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors">
                Issue Refund
              </button>
            )}
            <div className="flex items-center gap-1">
              <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none bg-white focus:border-indigo-500">
                <option value="">Override Status…</option>
                {["pending","confirmed","preparing","ready","picked_up","on_the_way","delivered","cancelled"].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g," ")}</option>
                ))}
              </select>
              {overrideStatus && (
                <button onClick={() => setDialog("override")}
                  className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors">
                  Apply
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Customer</span>
          </div>
          <p className="font-semibold text-gray-900">{order.customer.firstName} {order.customer.lastName}</p>
          <p className="text-xs text-gray-400">{order.customer.email}</p>
          {order.customer.phone && <p className="text-xs text-gray-400">{order.customer.phone}</p>}
        </div>

        {/* Restaurant */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Restaurant</span>
          </div>
          <p className="font-semibold text-gray-900">{order.restaurant.name}</p>
          {order.restaurant.address && <p className="text-xs text-gray-400">{order.restaurant.address}</p>}
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Delivery</span>
          </div>
          {order.deliveryAddress ? (
            <>
              {order.deliveryAddress.street && <p className="text-sm text-gray-700">{order.deliveryAddress.street}</p>}
              {order.deliveryAddress.area && <p className="text-xs text-gray-400">{order.deliveryAddress.area}, {order.deliveryAddress.district}</p>}
            </>
          ) : (
            <p className="text-xs text-gray-400">—</p>
          )}
          {order.driver && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">Driver</p>
              <p className="text-sm font-medium">{order.driver.firstName} {order.driver.lastName}</p>
              {order.driver.phone && <p className="text-xs text-gray-400">{order.driver.phone}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-3">Order Items</h2>
        <div className="divide-y divide-gray-50">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-400">×{item.quantity} · ৳{item.price.toLocaleString()} each</p>
              </div>
              <span className="text-sm font-semibold text-gray-900">৳{item.totalPrice.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span><span>৳{order.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Delivery Fee</span><span>৳{order.deliveryFee.toLocaleString()}</span>
          </div>
          {order.discount ? (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount</span><span>-৳{order.discount.toLocaleString()}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
            <span>Total</span><span>৳{order.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-bold text-gray-700">Status Timeline</h2>
          </div>
          <div className="relative pl-4 space-y-4">
            <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-gray-100" />
            {order.statusHistory.map((h, i) => (
              <div key={i} className="relative flex items-start gap-3">
                <div className="absolute -left-[17px] top-0.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                <div>
                  <p className="text-sm font-medium capitalize text-gray-800">{h.status.replace(/_/g," ")}</p>
                  {h.note && <p className="text-xs text-gray-400">{h.note}</p>}
                  <p className="text-xs text-gray-300">{new Date(h.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refund info */}
      {order.refund && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-sm font-bold text-amber-700">Refund Issued</p>
          <p className="text-sm text-amber-600">৳{order.refund.amount.toLocaleString()} — {order.refund.reason}</p>
          {order.refund.processedAt && <p className="text-xs text-amber-400">{new Date(order.refund.processedAt).toLocaleString()}</p>}
        </div>
      )}

      <ConfirmDialog open={dialog === "cancel"} onClose={() => setDialog(null)} onConfirm={handleCancel}
        title="Cancel this order?" description="The order will be cancelled and the customer notified."
        confirmLabel="Cancel Order" requireReason reasonPlaceholder="Reason for cancellation…" destructive />
      <ConfirmDialog open={dialog === "refund"} onClose={() => setDialog(null)} onConfirm={handleRefund}
        title={`Issue full refund of ৳${order.total.toLocaleString()}?`}
        description="The customer will receive a refund for the full order amount."
        confirmLabel="Issue Refund" requireReason reasonPlaceholder="Reason for refund…" destructive={false} />
      <ConfirmDialog open={dialog === "override"} onClose={() => setDialog(null)} onConfirm={handleOverride}
        title={`Override status to "${overrideStatus.replace(/_/g," ")}"?`}
        description="This is an admin override. Provide a reason for the audit log."
        confirmLabel="Override" requireReason reasonPlaceholder="Reason…" destructive={false} />
    </div>
  );
}
