import { Button } from '@/components/ui/button';
import {
  PageHeader,
  SectionCard,
  StatusBadge,
  VendorEmptyState,
} from '@/components/vendor';
import { useConfirm } from '@/contexts/ConfirmContext';
import { toast } from '@/lib/toast';
import vendorService from '@/services/vendorService';
import type { VendorOrder } from '@/types/vendor';
import { cn } from '@/utils/cn';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Loader2,
  MapPin,
  Package,
  Phone,
  User,
  Wallet,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const STATUS_FLOW = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked_up',
  'delivered',
];

const NEXT_STATUS: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'picked_up',
  picked_up: 'delivered',
};

const VendorOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
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
      toast.success('Success', {
        description: `Order ${newStatus.replace(/_/g, ' ')}`,
      });
    } else {
      toast.error('Error', {
        description: res.message,
      });
    }
    setUpdating(false);
  };

  const handleCancel = async () => {
    if (!id) return;
    const ok = await confirm({
      title: 'Cancel order',
      description: 'Are you sure you want to cancel this order?',
      confirmLabel: 'Cancel order',
    });
    if (!ok) return;
    setUpdating(true);
    const res = await vendorService.updateOrderStatus(id, 'cancelled');
    if (res.success && res.data) {
      setOrder(res.data.order);
      toast.success('Order cancelled');
    } else {
      toast.error('Error', {
        description: res.message,
      });
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <VendorEmptyState
        icon={Package}
        variant="error"
        title="Order not found"
        description="We couldn't find this order. It may have been removed or the link is invalid."
        action={{ label: 'Back to orders', onClick: () => navigate(-1) }}
      />
    );
  }

  const customerName =
    typeof order.customerId === 'object'
      ? `${order.customerId.firstName} ${order.customerId.lastName}`.trim()
      : order.customer?.name || '—';

  const customerPhone =
    typeof order.customerId === 'object'
      ? order.customerId.phoneNumber
      : order.customer?.phone;

  const currentIdx = STATUS_FLOW.indexOf(order.status);

  const nextLabel = NEXT_STATUS[order.status]
    ? NEXT_STATUS[order.status]
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase())
    : '';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="-ml-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            Order #{order.orderNumber}
          </span>
        }
        subtitle={
          <>
            <StatusBadge status={order.status} size="sm" />
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDateTime(order.createdAt)}
            </span>
          </>
        }
        actions={
          <>
            {NEXT_STATUS[order.status] && (
              <Button
                variant="brand"
                onClick={() => handleStatusUpdate(NEXT_STATUS[order.status])}
                disabled={updating}
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Mark as {nextLabel}
              </Button>
            )}
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updating}
                className="text-destructive hover:bg-destructive/10"
              >
                Cancel Order
              </Button>
            )}
          </>
        }
      />

      {/* Status Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <SectionCard title="Order Progress">
          {order.status === 'cancelled' ? (
            <div className="flex items-center gap-2 text-destructive">
              <div className="h-3 w-3 rounded-full bg-destructive" />
              <span className="font-medium">Order Cancelled</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {STATUS_FLOW.map((s, idx) => (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                        idx <= currentIdx
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={cn(
                        'mt-1 whitespace-nowrap text-xs capitalize',
                        idx <= currentIdx
                          ? 'text-primary'
                          : 'text-muted-foreground',
                      )}
                    >
                      {s.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {idx < STATUS_FLOW.length - 1 && (
                    <div
                      className={cn(
                        'h-0.5 flex-1',
                        idx < currentIdx ? 'bg-primary' : 'bg-border',
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </SectionCard>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2"
        >
          <SectionCard
            title="Order Items"
            icon={<Package className="h-5 w-5" />}
          >
            <div className="divide-y divide-border">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 py-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-lg font-bold text-muted-foreground">
                    {item.quantity}x
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {item.menuItem?.name || item.name || 'Item'}
                    </p>
                    {item.specialInstructions && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Note: {item.specialInstructions}
                      </p>
                    )}
                  </div>
                  <p className="font-medium text-foreground">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal || order.total)}</span>
              </div>
              {order.deliveryFee != null && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Fee</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              {order.discount != null && order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </SectionCard>
        </motion.div>

        {/* Customer Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <SectionCard title="Customer" icon={<User className="h-5 w-5" />}>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{customerName || '—'}</span>
              </div>
              {customerPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{customerPhone}</span>
                </div>
              )}
            </div>
          </SectionCard>

          {order.deliveryAddress && (
            <SectionCard
              title="Delivery Address"
              icon={<MapPin className="h-5 w-5" />}
            >
              <div className="flex items-start gap-3 text-sm text-foreground">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p>{order.deliveryAddress.street}</p>
                  <p>
                    {order.deliveryAddress.area},{' '}
                    {order.deliveryAddress.district}
                  </p>
                  {order.deliveryAddress.instructions && (
                    <p className="mt-1 text-muted-foreground">
                      Note: {order.deliveryAddress.instructions}
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {order.paymentMethod && (
            <SectionCard
              title="Payment"
              icon={<Wallet className="h-5 w-5" />}
            >
              {order.paymentMethod === 'cash_on_delivery' ? (
                <StatusBadge label="Cash on Delivery" tone="warning" />
              ) : (
                <p className="text-sm capitalize text-foreground">
                  {order.paymentMethod.replace(/_/g, ' ')}
                </p>
              )}
            </SectionCard>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VendorOrderDetailPage;
