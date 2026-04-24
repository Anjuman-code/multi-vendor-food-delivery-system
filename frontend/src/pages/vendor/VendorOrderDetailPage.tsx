import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Phone,
  User,
  Loader2,
  Package,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import vendorService from "@/services/vendorService";
import type { VendorOrder } from "@/types/vendor";
import { useToast } from "@/hooks/use-toast";

const STATUS_FLOW = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "picked_up",
  "delivered",
];

const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "picked_up",
  picked_up: "delivered",
};

const VendorOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const res = await vendorService.getOrder(id);
      if (res.success && res.data) {
        setOrder(res.data.order);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return;
    setUpdating(true);
    const res = await vendorService.updateOrderStatus(id, newStatus);
    if (res.success && res.data) {
      setOrder(res.data.order);
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
    setUpdating(false);
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setUpdating(true);
    const res = await vendorService.updateOrderStatus(id, "cancelled");
    if (res.success && res.data) {
      setOrder(res.data.order);
      toast({ title: "Order cancelled" });
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setUpdating(false);
  };

  const formatCurrency = (amount: number) =>
    `৳${amount.toLocaleString("en-BD")}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12 text-gray-500">Order not found.</div>
    );
  }

  const customerName =
    typeof order.customerId === "object"
      ? `${order.customerId.firstName} ${order.customerId.lastName}`.trim()
      : order.customer?.name || "—";

  const customerPhone =
    typeof order.customerId === "object"
      ? order.customerId.phoneNumber
      : order.customer?.phone;

  const currentIdx = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Order #{order.orderNumber}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            <Clock className="w-3.5 h-3.5 inline mr-1" />
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          {NEXT_STATUS[order.status] && (
            <Button
              onClick={() => handleStatusUpdate(NEXT_STATUS[order.status])}
              disabled={updating}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg"
            >
              {updating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Mark as{" "}
              {NEXT_STATUS[order.status]
                .replace(/_/g, " ")
                .replace(/^\w/, (c) => c.toUpperCase())}
            </Button>
          )}
          {order.status !== "cancelled" && order.status !== "delivered" && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updating}
              className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg"
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 className="text-sm font-medium text-gray-500 mb-4">
          Order Progress
        </h3>
        {order.status === "cancelled" ? (
          <div className="flex items-center gap-2 text-red-600">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="font-medium">Order Cancelled</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {STATUS_FLOW.map((s, idx) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx <= currentIdx
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-xs mt-1 capitalize whitespace-nowrap ${
                      idx <= currentIdx ? "text-orange-600" : "text-gray-400"
                    }`}
                  >
                    {s.replace(/_/g, " ")}
                  </span>
                </div>
                {idx < STATUS_FLOW.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      idx < currentIdx ? "bg-orange-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <Package className="w-5 h-5 inline mr-2" />
            Order Items
          </h3>
          <div className="divide-y divide-gray-100">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 py-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-lg font-bold text-gray-400">
                  {item.quantity}x
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {item.menuItem?.name || item.name || "Item"}
                  </p>
                  {item.specialInstructions && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Note: {item.specialInstructions}
                    </p>
                  )}
                </div>
                <p className="font-medium text-gray-900">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal || order.total)}</span>
            </div>
            {order.deliveryFee != null && (
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
            )}
            {order.discount != null && order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 text-base pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </motion.div>

        {/* Customer Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Customer
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">
                  {customerName || "—"}
                </span>
              </div>
              {customerPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{customerPhone}</span>
                </div>
              )}
            </div>
          </div>

          {order.deliveryAddress && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delivery Address
              </h3>
              <div className="flex items-start gap-3 text-sm text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p>{order.deliveryAddress.street}</p>
                  <p>
                    {order.deliveryAddress.city}
                    {order.deliveryAddress.state
                      ? `, ${order.deliveryAddress.state}`
                      : ""}
                  </p>
                  {order.deliveryAddress.instructions && (
                    <p className="text-gray-500 mt-1">
                      Note: {order.deliveryAddress.instructions}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {order.paymentMethod && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Payment
              </h3>
              <p className="text-sm text-gray-700 capitalize">
                {order.paymentMethod.replace(/_/g, " ")}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VendorOrderDetailPage;
