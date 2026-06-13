/**
 * OrderDetailsPage – single order view with status timeline, items,
 * restaurant review, and driver rating.
 */
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/contexts/CartContext';
import { useSocketContext } from '@/contexts/SocketContext';
import { useToast } from '@/hooks/use-toast';
import orderService from '@/services/orderService';
import reviewService from '@/services/reviewService';
import riderService from '@/services/riderService';
import type { Order, OrderStatus, StatusHistoryEntry } from '@/types/order';
import { foodFallbackSVG } from '@/utils/fallbackImages';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  ArrowLeft,
  Banknote,
  Bike,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  HelpCircle,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Star,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const STATUS_STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked_up',
  'delivered',
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  picked_up: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(d));

const buildReceiptFileName = (orderNumber: string): string => {
  const safeOrderNumber = orderNumber.replace(/[^a-zA-Z0-9-_]+/g, '_');
  return `receipt-${safeOrderNumber}.pdf`;
};

const StarRating = ({
  value,
  onChange,
  hoverValue,
  onHover,
  size = 'md',
  disabled = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  hoverValue?: number;
  onHover?: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}) => {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = (hoverValue || value) >= star;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onMouseEnter={() => onHover?.(star)}
            onMouseLeave={() => onHover?.(0)}
            onClick={() => onChange?.(star)}
            className={`p-0.5 focus:outline-none transition-transform ${
              !disabled ? 'hover:scale-110' : ''
            } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <Star
              className={`${sizeClasses[size]} transition-colors ${
                active
                  ? 'text-orange-400 fill-orange-400'
                  : 'text-gray-200 fill-gray-200'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem: addToCart } = useCart();
  const { socket, watchOrderLocation, driverLocation } = useSocketContext();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);

  // Restaurant review state
  const [existingReview, setExistingReview] = useState<Order['_id'] | null>(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Driver rating state
  const [existingDriverRating, setExistingDriverRating] =
    useState<Order['_id'] | null>(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await orderService.getOrderById(id);
    if (res.success && res.data) {
      setOrder(res.data.order);
      if (res.data.review) {
        setExistingReview(res.data.review as unknown as Order['_id']);
        setReviewStars(res.data.review.rating);
        setReviewComment(res.data.review.comment);
        setReviewTitle(res.data.review.title || '');
        setReviewSubmitted(true);
      }
      if (res.data.driverRating) {
        setExistingDriverRating(res.data.driverRating as unknown as Order['_id']);
        setRatingStars(res.data.driverRating.rating);
        setRatingComment(res.data.driverRating.comment || '');
        setRatingSubmitted(true);
      }
    } else {
      toast({
        title: 'Error',
        description: res.message || 'Order not found.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  }, [id, toast]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Live order status updates via socket
  useEffect(() => {
    if (!socket || !id) return;
    const handler = (data: { _id: string; newStatus: OrderStatus }) => {
      if (data._id === id || data._id === order?._id) {
        setOrder((prev) => (prev ? { ...prev, status: data.newStatus } : prev));
        if (data.newStatus === 'picked_up' && order?._id) {
          watchOrderLocation(order._id);
        }
      }
    };
    socket.on('orderStatusUpdate', handler);
    return () => {
      socket.off('orderStatusUpdate', handler);
    };
  }, [socket, id, order?._id, watchOrderLocation]);

  // Watch driver location when order is picked_up
  useEffect(() => {
    if (order?.status === 'picked_up' && order?._id) {
      watchOrderLocation(order._id);
    }
  }, [order?.status, order?._id, watchOrderLocation]);

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    const res = await orderService.cancelOrder(order._id);
    setCancelling(false);
    if (res.success && res.data) {
      setOrder(res.data.order);
      toast({ title: 'Order cancelled' });
    } else {
      toast({
        title: 'Cannot cancel',
        description: res.message || 'Failed to cancel.',
        variant: 'destructive',
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
        typeof order.restaurantId === 'string'
          ? order.restaurantId
          : order.restaurantId._id;
      const restName =
        typeof order.restaurantId === 'string' ? '' : order.restaurantId.name;
      const unavailableItems = reorderItems.filter((item) => !item.isAvailable);

      if (unavailableItems.length === reorderItems.length) {
        toast({
          title: 'Reorder unavailable',
          description:
            unavailableItems[0]?.unavailableReason ||
            'All items from this order are currently unavailable.',
          variant: 'destructive',
        });
        return;
      }

      if (unavailableItems.length > 0) {
        toast({
          title: 'Some items were skipped',
          description: `${unavailableItems.length} item(s) are unavailable and were not added to cart.`,
          variant: 'destructive',
        });
      }

      for (const item of reorderItems) {
        if (!item.isAvailable) continue;

        await addToCart(restId, restName, {
          itemKey: `${item.menuItemId}::r`,
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          image: item.image || '',
          quantity: item.quantity,
          variants: item.variants || [],
          addons: item.addons || [],
        });
      }

      toast({
        title: 'Items added to cart',
        description: 'You can review and checkout from your cart.',
      });
      navigate('/cart');
    } else {
      toast({
        title: 'Reorder failed',
        description: res.message || 'Could not reorder.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadReceipt = useCallback(async () => {
    if (!receiptRef.current || !order) return;

    try {
      toast({
        title: 'Preparing receipt',
        description: 'Generating your PDF receipt. Please wait...',
      });

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
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
        'PNG',
        margin,
        position,
        usableWidth,
        imageHeight,
        undefined,
        'FAST',
      );

      remainingHeight -= usableHeight;

      while (remainingHeight > 0) {
        pdf.addPage();
        position = remainingHeight - imageHeight + margin;
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          position,
          usableWidth,
          imageHeight,
          undefined,
          'FAST',
        );
        remainingHeight -= usableHeight;
      }

      pdf.save(buildReceiptFileName(order.orderNumber));
    } catch {
      toast({
        title: 'Download failed',
        description: 'Could not generate the receipt PDF.',
        variant: 'destructive',
      });
    }
  }, [order, toast]);

  const handleReviewSubmit = async () => {
    if (!order || reviewStars === 0) return;
    setReviewSubmitting(true);
    const res = await reviewService.createReview({
      orderId: order._id,
      rating: reviewStars,
      title: reviewTitle.trim() || undefined,
      comment: reviewComment.trim(),
    });
    setReviewSubmitting(false);
    if (res.success) {
      setReviewSubmitted(true);
      toast({
        title: 'Review submitted',
        description: 'Thank you for reviewing your meal!',
      });
    } else {
      toast({
        title: 'Failed to submit review',
        description: res.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRatingSubmit = async () => {
    if (!order || ratingStars === 0) return;
    setRatingSubmitting(true);
    const res = await riderService.submitRating({
      orderId: order._id,
      rating: ratingStars,
      comment: ratingComment.trim() || undefined,
    });
    setRatingSubmitting(false);
    if (res.success) {
      setRatingSubmitted(true);
      toast({
        title: 'Rating submitted',
        description: 'Thank you for your feedback!',
      });
    } else {
      toast({
        title: 'Failed to submit rating',
        description: res.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const canCancel =
    order && (order.status === 'pending' || order.status === 'confirmed');

  const restaurantName =
    order && typeof order.restaurantId !== 'string'
      ? order.restaurantId.name
      : '';

  const currentStepIdx = order
    ? order.status === 'cancelled'
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
        <Button variant="outline" onClick={() => navigate('/orders')}>
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
          onClick={() => navigate('/orders')}
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
            {order.status === 'delivered' && (
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/support/new?type=order_issue&orderId=${order._id}`)}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <HelpCircle className="mr-1 h-4 w-4" />
              Need Help?
            </Button>
          </div>
        </div>
        <div ref={receiptRef} className="space-y-6">
          {order.status !== 'cancelled' ? (
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
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-400'
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
                          idx < currentStepIdx ? 'bg-orange-400' : 'bg-gray-200'
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
                          {item.variants.map((v) => v.name).join(', ')}
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
                {order.deliveryAddress.area}, {order.deliveryAddress.district}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-gray-400 uppercase mb-2 flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Payment
              </p>
              {order.paymentMethod === 'cash_on_delivery' ? (
                <p className="text-sm text-gray-800 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-orange-500" />
                  Cash on Delivery
                </p>
              ) : (
                <p className="text-sm text-gray-800 capitalize">
                  {order.paymentMethod}
                </p>
              )}
              <p className="text-sm text-gray-600 capitalize">
                Status:{' '}
                {order.paymentMethod === 'cash_on_delivery' &&
                order.paymentStatus === 'pending'
                  ? 'Pay on delivery'
                  : order.paymentStatus}
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
                        {entry.status.replace('_', ' ')}
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

        {/* Driver location card (only when picked_up) */}
        {order.status === 'picked_up' && (
          <Card className="p-4 border-orange-200 bg-orange-50/60">
            <p className="text-sm font-medium text-orange-800 flex items-center gap-2 mb-1">
              <Bike className="h-4 w-4" /> Your order is on the way!
            </p>
            {driverLocation && driverLocation.orderId === order._id ? (
              <p className="text-xs text-orange-700">
                Driver location updated ·{' '}
                {new Date(driverLocation.timestamp).toLocaleTimeString()}
                {driverLocation.speed != null &&
                  ` · ${Math.round(driverLocation.speed)} km/h`}
              </p>
            ) : (
              <p className="text-xs text-orange-600">
                Waiting for driver location…
              </p>
            )}
          </Card>
        )}

        {/* COD cash reminder when rider is on the way */}
        {order.status === 'picked_up' &&
          order.paymentMethod === 'cash_on_delivery' && (
            <Card className="p-4 border-amber-200 bg-amber-50/60 flex items-start gap-3">
              <Banknote className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Cash payment reminder
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Please have <strong>৳{order.total.toFixed(2)}</strong> in cash
                  ready for your rider.
                </p>
              </div>
            </Card>
          )}

        {/* ── Restaurant Review Section ── */}
        {order.status === 'delivered' && (reviewSubmitted || existingReview) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-5 border-emerald-100 bg-emerald-50/40">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />{' '}
                Your restaurant review
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {restaurantName}
                </span>
                <StarRating
                  value={reviewStars}
                  size="sm"
                  disabled
                />
              </div>
              {reviewTitle && (
                <p className="text-sm font-medium text-gray-800 mb-1">
                  {reviewTitle}
                </p>
              )}
              <p className="text-sm text-gray-600 italic">
                &ldquo;{reviewComment}&rdquo;
              </p>
            </Card>
          </motion.div>
        )}

        {order.status === 'delivered' && !reviewSubmitted && !existingReview && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-5 border-orange-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-orange-400" />{' '}
                Rate your meal
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                How was your experience at{' '}
                <span className="font-medium">{restaurantName}</span>?
              </p>

              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-1.5">
                  Overall rating
                </p>
                <StarRating
                  value={reviewStars}
                  onChange={setReviewStars}
                  hoverValue={reviewHover}
                  onHover={setReviewHover}
                  size="lg"
                />
                {reviewStars > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {reviewStars === 1
                      ? 'Poor'
                      : reviewStars === 2
                        ? 'Fair'
                        : reviewStars === 3
                          ? 'Good'
                          : reviewStars === 4
                            ? 'Very Good'
                            : 'Excellent'}
                  </p>
                )}
              </div>

              <div className="mb-3">
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Review title (optional)
                </label>
                <input
                  type="text"
                  placeholder="Summarize your experience"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors"
                />
              </div>

              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Your review <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Tell us about your experience — what did you like or how can we improve?"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="text-sm resize-none min-h-[80px]"
                  rows={3}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {reviewComment.length}/1000
                </p>
              </div>

              <Button
                size="sm"
                disabled={reviewStars === 0 || !reviewComment.trim() || reviewSubmitting}
                onClick={handleReviewSubmit}
                className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto"
              >
                {reviewSubmitting && (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                )}
                Submit Review
              </Button>
            </Card>
          </motion.div>
        )}

        {/* ── Driver Rating Section ── */}
        {order.status === 'delivered' && (ratingSubmitted || existingDriverRating) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-5 border-emerald-100 bg-emerald-50/40">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />{' '}
                Your rider rating
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <StarRating
                  value={ratingStars}
                  size="sm"
                  disabled
                />
              </div>
              {ratingComment && (
                <p className="text-sm text-gray-600 italic">
                  &ldquo;{ratingComment}&rdquo;
                </p>
              )}
            </Card>
          </motion.div>
        )}

        {order.status === 'delivered' && !ratingSubmitted && !existingDriverRating && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-5 border-orange-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Bike className="h-4 w-4 text-orange-400" /> Rate your delivery
                rider
              </h3>
              <div className="mb-3">
                <StarRating
                  value={ratingStars}
                  onChange={setRatingStars}
                  hoverValue={ratingHover}
                  onHover={setRatingHover}
                  size="lg"
                />
              </div>
              <Textarea
                placeholder="Leave a comment (optional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                className="mb-3 text-sm resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={ratingStars === 0 || ratingSubmitting}
                  onClick={handleRatingSubmit}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {ratingSubmitting && (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  )}
                  Submit Rating
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRatingSubmitted(true)}
                >
                  Skip
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default OrderDetailsPage;
