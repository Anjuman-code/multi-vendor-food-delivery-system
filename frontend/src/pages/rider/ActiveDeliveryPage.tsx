import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import riderService, { type RiderOrder } from '@/services/riderService';
import { motion } from 'framer-motion';
import {
  Banknote,
  CheckCircle,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Store,
  Truck,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const DELIVERY_STATUSES = [
  { status: 'confirmed', label: 'Order Confirmed' },
  { status: 'preparing', label: 'Being Prepared' },
  { status: 'ready', label: 'Ready for Pickup' },
  { status: 'picked_up', label: 'Picked Up — En Route' },
  { status: 'delivered', label: 'Delivered' },
] as const;

const NEXT_STATUS: Record<string, string | null> = {
  ready: 'picked_up',
  picked_up: 'delivered',
};

const NEXT_LABEL: Record<string, string> = {
  ready: 'Confirm Pickup',
  picked_up: 'Mark as Delivered',
};

const ActiveDeliveryPage: React.FC = () => {
  const { toast } = useToast();
  const [order, setOrder] = useState<RiderOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [codDialogOpen, setCodDialogOpen] = useState(false);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    try {
      const res = await riderService.getActiveDelivery();
      const d = (res as { data: { data: { order: RiderOrder | null } } }).data;
      setOrder(d.data?.order ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchActive();
  }, [fetchActive]);

  const handleStatusUpdate = async (codCollected?: boolean) => {
    if (!order) return;
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;

    // For COD orders being marked delivered, require explicit confirmation
    if (
      nextStatus === 'delivered' &&
      order.paymentMethod === 'cash_on_delivery' &&
      codCollected === undefined
    ) {
      setCodDialogOpen(true);
      return;
    }

    setUpdating(true);
    try {
      await riderService.updateDeliveryStatus(order._id, {
        status: nextStatus,
        ...(nextStatus === 'delivered' &&
        order.paymentMethod === 'cash_on_delivery'
          ? { codCollected: codCollected ?? false }
          : {}),
      });
      setOrder((o) => (o ? { ...o, status: nextStatus } : o));
      toast({
        title:
          nextStatus === 'delivered' ? 'Delivery completed!' : 'Status updated',
        description:
          nextStatus === 'delivered'
            ? "Great work! You're now available for new orders."
            : `Order status set to ${nextStatus.replace(/_/g, ' ')}.`,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast({
        variant: 'destructive',
        title: msg ?? 'Failed to update status',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <Truck className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            No Active Delivery
          </h2>
          <p className="text-gray-500 text-sm">
            You don't have an active delivery right now. Head over to available
            orders to pick one up.
          </p>
          <Button
            asChild
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Link to="/rider/available">View Available Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  const restaurant =
    typeof order.restaurantId === 'object' ? order.restaurantId : null;
  const customer =
    typeof order.customerId === 'object' ? order.customerId : null;
  const currentStatusIdx = DELIVERY_STATUSES.findIndex(
    (s) => s.status === order.status,
  );
  const nextStatus = NEXT_STATUS[order.status];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Active Delivery</h1>
          <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void fetchActive()}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Status timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Delivery Progress</h3>
        <ol className="space-y-3">
          {DELIVERY_STATUSES.map((step, idx) => {
            const isDone = idx <= currentStatusIdx;
            const isCurrent = idx === currentStatusIdx;
            return (
              <motion.li
                key={step.status}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isDone
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-300'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-current" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    isCurrent
                      ? 'font-semibold text-gray-900'
                      : isDone
                        ? 'text-gray-600'
                        : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
                {isCurrent && (
                  <Badge
                    variant="secondary"
                    className="ml-auto text-xs bg-orange-50 text-orange-600 border-0"
                  >
                    Current
                  </Badge>
                )}
              </motion.li>
            );
          })}
        </ol>
      </div>

      {/* Restaurant */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Store className="w-4 h-4 text-orange-500" />
          Restaurant
        </h3>
        <p className="font-medium text-gray-800">{restaurant?.name ?? '—'}</p>
        {typeof restaurant?.address === 'object' && restaurant?.address && (
          <p className="text-sm text-gray-500 mt-0.5">
            {String(
              (restaurant.address as Record<string, unknown>).fullAddress ?? '',
            )}
          </p>
        )}
        {typeof restaurant?.address === 'object' &&
          (restaurant?.address as Record<string, unknown>)?.phone && (
            <a
              href={`tel:${(restaurant.address as Record<string, unknown>).phone}`}
              className="inline-flex items-center gap-2 mt-2 text-sm text-orange-500 hover:text-orange-600"
            >
              <Phone className="w-4 h-4" />
              Call restaurant
            </a>
          )}
      </div>

      {/* Delivery address */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-500" />
          Deliver to
        </h3>
        <p className="text-sm text-gray-700">
          {order.deliveryAddress?.area}
          {order.deliveryAddress?.district
            ? `, ${order.deliveryAddress.district}`
            : ''}
        </p>
        {order.deliveryAddress?.fullAddress && (
          <p className="text-sm text-gray-500 mt-0.5">
            {order.deliveryAddress.fullAddress}
          </p>
        )}
        {customer && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <p className="text-sm font-medium text-gray-800">
              {customer.firstName} {customer.lastName}
            </p>
            {customer.phoneNumber && (
              <a
                href={`tel:${customer.phoneNumber}`}
                className="inline-flex items-center gap-2 mt-1 text-sm text-orange-500 hover:text-orange-600"
              >
                <Phone className="w-4 h-4" />
                {customer.phoneNumber}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-orange-500" />
          Order items
        </h3>
        <ul className="space-y-1.5">
          {order.items.map((item, i) => (
            <li
              key={i}
              className="flex items-center justify-between text-sm text-gray-700"
            >
              <span>{item.name}</span>
              <span className="text-gray-500">×{item.quantity}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action button */}
      {nextStatus && (
        <Button
          onClick={() => void handleStatusUpdate()}
          disabled={updating}
          size="lg"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold h-14"
        >
          {updating ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Updating…
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              {NEXT_LABEL[order.status]}
            </>
          )}
        </Button>
      )}

      {order.status === 'delivered' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center"
        >
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-800">Delivery Completed!</p>
          <p className="text-sm text-green-600 mt-1">
            Great work! You're now available for new orders.
          </p>
          <Button
            asChild
            className="mt-4 bg-green-500 hover:bg-green-600 text-white"
          >
            <Link to="/rider/available">Find Next Delivery</Link>
          </Button>
        </motion.div>
      )}

      {/* COD cash collection confirmation dialog */}
      <Dialog open={codDialogOpen} onOpenChange={setCodDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-amber-600" />
              Confirm Cash Collection
            </DialogTitle>
            <DialogDescription>
              This is a cash on delivery order. Did the customer pay you in
              cash?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600">
              Order total:{' '}
              <strong className="text-gray-900">
                ৳{order?.total?.toFixed(2) ?? '—'}
              </strong>
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setCodDialogOpen(false);
                void handleStatusUpdate(false);
              }}
            >
              Not Collected
            </Button>
            <Button
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              onClick={() => {
                setCodDialogOpen(false);
                void handleStatusUpdate(true);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Cash Collected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActiveDeliveryPage;
