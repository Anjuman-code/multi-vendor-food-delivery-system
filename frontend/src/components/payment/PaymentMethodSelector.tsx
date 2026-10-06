import React from 'react';
import { PaymentBrandIcon } from '@/components/payment/PaymentBrandIcon';
import type { SupportedPaymentMethod } from '@/utils/paymentUtils';
import { cn } from '@/utils/cn';
import { Check } from 'lucide-react';

export interface PaymentMethodSelectorProps {
  selectedMethod: SupportedPaymentMethod;
  onSelectMethod: (method: SupportedPaymentMethod) => void;
  walletBalance?: number;
  amountToPay?: number;
  disabled?: boolean;
  showWallet?: boolean;
  showCod?: boolean;
  showCards?: boolean;
  showMobileWallets?: boolean;
  className?: string;
}

interface MethodOption {
  id: SupportedPaymentMethod;
  name: string;
  description: string;
  category: 'wallet' | 'mobile' | 'card' | 'cod';
  badge?: string;
  disabledReason?: string;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
  walletBalance = 0,
  amountToPay,
  disabled = false,
  showWallet = true,
  showCod = true,
  showCards = true,
  showMobileWallets = true,
  className,
}) => {
  const isWalletInsufficient =
    amountToPay !== undefined && walletBalance < amountToPay;

  const methods: MethodOption[] = [
    ...(showWallet
      ? [
          {
            id: 'wallet' as SupportedPaymentMethod,
            name: 'Food Rush Wallet',
            description: `Available: ৳${walletBalance.toFixed(2)}`,
            category: 'wallet' as const,
            badge: isWalletInsufficient ? 'Insufficient' : 'Instant Pay',
            disabledReason: isWalletInsufficient
              ? `Requires ৳${(amountToPay ?? 0).toFixed(2)}`
              : undefined,
          },
        ]
      : []),
    ...(showMobileWallets
      ? [
          {
            id: 'bkash' as SupportedPaymentMethod,
            name: 'bKash',
            description: 'Fast checkout with OTP',
            category: 'mobile' as const,
            badge: 'Popular',
          },
          {
            id: 'nagad' as SupportedPaymentMethod,
            name: 'Nagad',
            description: 'Instant mobile payment',
            category: 'mobile' as const,
          },
          {
            id: 'rocket' as SupportedPaymentMethod,
            name: 'Rocket',
            description: 'DBBL mobile banking',
            category: 'mobile' as const,
          },
          {
            id: 'upay' as SupportedPaymentMethod,
            name: 'Upay',
            description: 'UCB digital wallet',
            category: 'mobile' as const,
          },
        ]
      : []),
    ...(showCards
      ? [
          {
            id: 'card' as SupportedPaymentMethod,
            name: 'Credit or Debit Card',
            description: 'Visa, Mastercard, Amex',
            category: 'card' as const,
            badge: 'Secure 3DS',
          },
        ]
      : []),
    ...(showCod
      ? [
          {
            id: 'cash_on_delivery' as SupportedPaymentMethod,
            name: 'Cash on Delivery',
            description: 'Pay cash directly to rider on arrival',
            category: 'cod' as const,
          },
        ]
      : []),
  ];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {methods.map((method) => {
          const isSelected = selectedMethod === method.id;
          const isMethodDisabled =
            disabled || (method.id === 'wallet' && isWalletInsufficient);

          return (
            <button
              key={method.id}
              type="button"
              disabled={isMethodDisabled}
              onClick={() => onSelectMethod(method.id)}
              className={cn(
                'group relative flex items-center justify-between rounded-xl border p-3.5 text-left transition-all duration-150',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                  : 'border-border/80 bg-card hover:border-border hover:bg-muted/30',
                isMethodDisabled && 'opacity-60 cursor-not-allowed bg-muted/40',
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <PaymentBrandIcon
                  brandOrMethod={method.id}
                  className="h-7 w-11 shadow-xs"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm text-foreground truncate">
                      {method.name}
                    </span>
                    {method.badge && (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-1.5 py-0.2 text-[10px] font-semibold tracking-wide',
                          method.badge === 'Insufficient'
                            ? 'bg-destructive/10 text-destructive'
                            : isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {method.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {method.disabledReason || method.description}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background group-hover:border-primary/50',
                )}
              >
                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
