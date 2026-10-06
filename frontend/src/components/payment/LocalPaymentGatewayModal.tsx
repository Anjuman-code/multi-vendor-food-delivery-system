import React from 'react';
import { UnifiedPaymentModal } from '@/components/payment/UnifiedPaymentModal';
import type { Order } from '@/types/order';
import type { SupportedPaymentMethod } from '@/utils/paymentUtils';

export interface LocalPaymentGatewayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  defaultMethod?: 'bkash' | 'nagad' | 'card';
  onSuccess: (transactionId: string, order: Order) => void;
}

export const LocalPaymentGatewayModal: React.FC<LocalPaymentGatewayModalProps> = ({
  open,
  onOpenChange,
  order,
  defaultMethod = 'bkash',
  onSuccess,
}) => {
  return (
    <UnifiedPaymentModal
      open={open}
      onOpenChange={onOpenChange}
      amount={order?.total ?? 0}
      orderId={order?._id}
      purpose="order_payment"
      defaultMethod={defaultMethod as SupportedPaymentMethod}
      title={`Pay for Order #${order?.orderNumber || ''}`}
      description="Choose your preferred payment method to complete this order."
      showWalletOption={false}
      showCodOption={false} // Retrying already-placed order payment
      onSuccess={(txnId, result) => {
        const updatedOrder = result?.order || {
          ...order,
          paymentStatus: 'paid',
        };
        onSuccess(txnId, updatedOrder as Order);
      }}
    />
  );
};

export default LocalPaymentGatewayModal;
