import React from 'react';
import visaSvg from '@/assets/payment-methods/visa.svg';
import mastercardSvg from '@/assets/payment-methods/mastercard.svg';
import amexSvg from '@/assets/payment-methods/amex.svg';
import bkashSvg from '@/assets/payment-methods/bkash.svg';
import nagadSvg from '@/assets/payment-methods/nagad.svg';
import rocketSvg from '@/assets/payment-methods/rocket.svg';
import upaySvg from '@/assets/payment-methods/upay.svg';
import cashSvg from '@/assets/payment-methods/cash.svg';
import walletSvg from '@/assets/payment-methods/wallet.svg';
import { CreditCard } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface PaymentBrandIconProps {
  brandOrMethod?: string;
  brand?: string;
  method?: string;
  className?: string;
  alt?: string;
}

export const PaymentBrandIcon: React.FC<PaymentBrandIconProps> = ({
  brandOrMethod,
  brand,
  method,
  className,
  alt,
}) => {
  const target = brandOrMethod || brand || method || '';
  const norm = target.toLowerCase().trim().replace(/[\s-_]/g, '');

  let src: string | null = null;
  let label = target;

  if (norm.includes('visa')) {
    src = visaSvg;
    label = 'Visa';
  } else if (norm.includes('mastercard') || norm.includes('master')) {
    src = mastercardSvg;
    label = 'Mastercard';
  } else if (norm.includes('amex') || norm.includes('americanexpress')) {
    src = amexSvg;
    label = 'American Express';
  } else if (norm.includes('bkash')) {
    src = bkashSvg;
    label = 'bKash';
  } else if (norm.includes('nagad')) {
    src = nagadSvg;
    label = 'Nagad';
  } else if (norm.includes('rocket')) {
    src = rocketSvg;
    label = 'Rocket';
  } else if (norm.includes('upay')) {
    src = upaySvg;
    label = 'Upay';
  } else if (norm.includes('cash') || norm.includes('cod')) {
    src = cashSvg;
    label = 'Cash on Delivery';
  } else if (norm.includes('wallet') || norm.includes('balance')) {
    src = walletSvg;
    label = 'Food Rush Wallet';
  }

  if (src) {
    return (
      <img
        src={src}
        alt={alt || label}
        className={cn('h-6 w-9 shrink-0 rounded object-contain shadow-xs border border-black/5 bg-white', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex h-6 w-9 shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground',
        className,
      )}
    >
      <CreditCard className="h-4 w-4" />
    </div>
  );
};

export default PaymentBrandIcon;
