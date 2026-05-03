/**
 * OrderDetailsPage – single order view with status timeline, items, and actions.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  Clock,
  Package,
  Loader2,
  XCircle,
  RefreshCw,
  CheckCircle2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import orderService from "@/services/orderService";
import { foodFallbackSVG } from "@/utils/fallbackImages";
import type { Order, OrderStatus, StatusHistoryEntry } from "@/types/order";

const STATUS_STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "picked_up",
  "delivered",
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for Pickup",
  picked_up: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));

const buildReceiptFileName = (orderNumber: string): string => {
  const safeOrderNumber = orderNumber.replace(/[^a-zA-Z0-9-_]+/g, "_");
  return `receipt-${safeOrderNumber}.pdf`;
};

const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem: addToCart } = useCart();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await orderService.getOrderById(id);
    if (res.success && res.data) {
      setOrder(res.data.order);
    } else {
      toast({
        title: "Error",
        description: res.message || "Order not found.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [id, toast]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    const res = await orderService.cancelOrder(order._id);
    setCancelling(false);
    if (res.success && res.data) {
      setOrder(res.data.order);
      toast({ title: "Order cancelled" });
    } else {
      toast({
        title: "Cannot cancel",
        description: res.message || "Failed to cancel.",
        variant: "destructive",
      });
    }
  };

  const handleReorder = async () => {
    if (!order) return;
    setReordering(true);
    const res = await orderService.reorder(order._id);
    setReordering(false);
    if (res.success && res.data) {
      const reorderItems = res.data.items;
      const restId =
        typeof order.restaurantId === "string"
          ? order.restaurantId
          : order.restaurantId._id;
      const restName =
        typeof order.restaurantId === "string" ? "" : order.restaurantId.name;
      const unavailableItems = reorderItems.filter((item) => !item.isAvailable);

      if (unavailableItems.length === reorderItems.length) {
        toast({
          title: "Reorder unavailable",
          description:
            unavailableItems[0]?.unavailableReason ||
            "All items from this order are currently unavailable.",
          variant: "destructive",
        });
        return;
      }

      if (unavailableItems.length > 0) {
        toast({
          title: "Some items were skipped",
          description: `${unavailableItems.length} item(s) are unavailable and were not added to cart.`,
          variant: "destructive",
        });
      }

      for (const item of reorderItems) {
        if (!item.isAvailable) {
          continue;
        }

        addToCart(restId, restName, {
          itemKey: `${item.menuItemId}::r`,
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          image: item.image || "",
          quantity: item.quantity,
          variants: item.variants || [],
          addons: item.addons || [],
        });
      }

      toast({
        title: "Items added to cart",
        description: "You can review and checkout from your cart.",
      });
      navigate("/cart");
    } else {
      toast({
        title: "Reorder failed",
        description: res.message || "Could not reorder.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadReceipt = useCallback(async () => {
    if (!receiptRef.current || !order) return;

    try {
      toast({
        title: "Preparing receipt",
        description: "Generating your PDF receipt. Please wait...",
      });

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const imageHeight = (canvas.height * usableWidth) / canvas.width;

      let remainingHeight = imageHeight;
      let position = margin;

      pdf.addImage(
        imgData,
        "PNG",
        margin,
        position,
        usableWidth,
        imageHeight,
        undefined,
        "FAST",
      );

      remainingHeight -= usableHeight;

      while (remainingHeight > 0) {
        pdf.addPage();
        position = remainingHeight - imageHeight + margin;
        pdf.addImage(
          imgData,
          "PNG",
          margin,
          position,
          usableWidth,
          imageHeight,
          undefined,
          "FAST",
        );
        remainingHeight -= usableHeight;
      }

      pdf.save(buildReceiptFileName(order.orderNumber));
    } catch {
      toast({
        title: "Download failed",
        description: "Could not generate the receipt PDF.",
        variant: "destructive",
      });
    }
  }, [order, toast]);

  const canCancel =
    order && (order.status === "pending" || order.status === "confirmed");

  const restaurantId =
    order && typeof order.restaurantId !== "string"
      ? order.restaurantId._id
      : order?.restaurantId;

  const currentStepIdx = order
    ? order.status === "cancelled"
      ? -1
      : STATUS_STEPS.indexOf(order.status)
    : -1;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">
          Order not found
        </h2>
        <Button variant="outline" onClick={() => navigate("/orders")}>
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/orders")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          All Orders
        </Button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {order.orderNumber}
            </h1>
            <p className="text-sm text-gray-500">
              Placed on {fmtDate(order.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                disabled={cancelling}
                onClick={handleCancel}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {cancelling ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-1 h-4 w-4" />
                )}
                Cancel
              </Button>
            )}
            {order.status === "delivered" && (
              <Button
                variant="outline"
                size="sm"
                disabled={reordering}
                onClick={handleReorder}
              >
                {reordering ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-4 w-4" />
                )}
                Reorder
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadReceipt}
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              <Download className="mr-1 h-4 w-4" />
              Download Receipt
            </Button>
          </div>
        </div>
        <div ref={receiptRef} className="space-y-6">
          {order.status !== "cancelled" ? (
            <Card className="p-5">
              <h3 className="text-sm font-medium text-gray-500 mb-4">
                Order Progress
              </h3>
              <div className="flex items-center gap-1">
                {STATUS_STEPS.map((s, idx) => (
                  <div
                    key={s}
                    className="flex items-center flex-1 last:flex-initial"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx <= currentStepIdx
                            ? "bg-orange-500 text-white"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {idx <= currentStepIdx ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 text-center hidden sm:block">
                        {STATUS_LABEL[s]}
                      </span>
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-1 ${
                          idx < currentStepIdx ? "bg-orange-400" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-5 border-red-200 bg-red-50">
              <p className="text-red-700 font-semibold flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Order Cancelled
              </p>
              {order.cancelReason && (
                <p className="text-sm text-red-600 mt-1">
                  Reason: {order.cancelReason}
                </p>
              )}
            </Card>
          )}

          <Card className="p-5">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Items</h3>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image || foodFallbackSVG}
                        alt={item.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                    <div>
                      <p className="text-gray-800 font-medium">
                        {item.quantity}× {item.name}
                      </p>
                      {item.variants && item.variants.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {item.variants.map((v) => v.name).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="font-medium text-gray-900">
                    ৳{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t mt-4 pt-3 text-sm space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>৳{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>৳{order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>৳{order.deliveryFee.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-৳{order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t">
                <span>Total</span>
                <span>৳{order.total.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <p className="text-xs font-medium text-gray-400 uppercase mb-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Delivery Address
              </p>
              <p className="text-sm text-gray-800">
                {order.deliveryAddress.street}
                {order.deliveryAddress.apartment &&
                  `, ${order.deliveryAddress.apartment}`}
              </p>
              <p className="text-sm text-gray-600">
                {order.deliveryAddress.city}, {order.deliveryAddress.state}{" "}
                {order.deliveryAddress.zipCode}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-gray-400 uppercase mb-2 flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Payment
              </p>
              <p className="text-sm text-gray-800">{order.paymentMethod}</p>
              <p className="text-sm text-gray-600 capitalize">
                Status: {order.paymentStatus}
              </p>
            </Card>
          </div>

          {order.statusHistory && order.statusHistory.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Status History
              </h3>
              <div className="space-y-2">
                {order.statusHistory.map(
                  (entry: StatusHistoryEntry, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <span className="text-gray-400 text-xs w-28 flex-shrink-0">
                        {fmtDate(entry.timestamp)}
                      </span>
                      <span className="font-medium text-gray-700 capitalize">
                        {entry.status.replace("_", " ")}
                      </span>
                      {entry.note && (
                        <span className="text-gray-500 text-xs">
                          – {entry.note}
                        </span>
                      )}
                    </div>
                  ),
                )}
              </div>
            </Card>
          )}

          {order.specialInstructions && (
            <Card className="p-4">
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">
                Special Instructions
              </p>
              <p className="text-sm text-gray-700">
                {order.specialInstructions}
              </p>
            </Card>
          )}
        </div>

        {/* Review CTA */}
        {order.status === "delivered" && (
          <div className="mt-6 text-center">
            <Link to={`/restaurants/${restaurantId || ""}`}>
              <Button className="bg-orange-500 hover:bg-orange-600">
                Leave a Review
              </Button>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OrderDetailsPage;
