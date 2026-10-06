import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentBrandIcon } from '@/components/payment/PaymentBrandIcon';
import type { SupportedPaymentMethod } from '@/utils/paymentUtils';
import {
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export interface PaymentResultViewProps {
  status: 'success' | 'failed';
  transactionId?: string;
  amount: number;
  currency?: string;
  method?: SupportedPaymentMethod | string;
  paymentDetails?: {
    brand?: string;
    last4?: string;
    walletNumber?: string;
  };
  errorMessage?: string;
  onRetry?: () => void;
  onDone?: () => void;
  doneText?: string;
  retryText?: string;
}

export const PaymentResultView: React.FC<PaymentResultViewProps> = ({
  status,
  transactionId,
  amount,
  currency = '৳',
  method = 'bkash',
  paymentDetails,
  errorMessage,
  onRetry,
  onDone,
  doneText = 'Continue to Order',
  retryText = 'Try Again / Change Method',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyTxn = () => {
    if (!transactionId) return;
    navigator.clipboard.writeText(transactionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = status === 'success';

  return (
    <div className="space-y-6 py-2 text-center">
      {/* Status Graphic */}
      <div className="flex justify-center">
        {isSuccess ? (
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-emerald-500" />
            <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <XCircle className="h-10 w-10 stroke-[2.5]" />
          </div>
        )}
      </div>

      {/* Headings */}
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-foreground">
          {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {isSuccess
            ? 'Your transaction has been securely authorized and completed.'
            : errorMessage ||
              'We were unable to complete the payment. No money was deducted from your account.'}
        </p>
      </div>

      {/* Transaction Details Box */}
      <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 text-left space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <span className="text-xs text-muted-foreground">Amount Paid</span>
          <span className="text-base font-bold text-foreground">
            {currency}{amount.toFixed(2)}
          </span>
        </div>

        {method && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Payment Method</span>
            <div className="flex items-center gap-2">
              <PaymentBrandIcon
                brandOrMethod={paymentDetails?.brand || method}
                className="h-5 w-8 shadow-xs"
              />
              <span className="text-xs font-semibold text-foreground uppercase">
                {paymentDetails?.last4
                  ? `•••• ${paymentDetails.last4}`
                  : paymentDetails?.walletNumber
                  ? paymentDetails.walletNumber
                  : method.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        )}

        {transactionId && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Transaction ID</span>
            <button
              type="button"
              onClick={handleCopyTxn}
              className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <span>{transactionId}</span>
              {copied ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Status</span>
          <span
            className={cn(
              'inline-flex items-center gap-1 font-semibold capitalize',
              isSuccess ? 'text-emerald-600' : 'text-destructive',
            )}
          >
            {isSuccess ? 'Completed' : 'Failed'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5">
        {isSuccess ? (
          onDone && (
            <Button
              type="button"
              onClick={onDone}
              className="w-full h-11 text-sm font-semibold rounded-xl"
            >
              <span>{doneText}</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )
        ) : (
          <>
            {onRetry && (
              <Button
                type="button"
                onClick={onRetry}
                className="w-full h-11 text-sm font-semibold rounded-xl"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                <span>{retryText}</span>
              </Button>
            )}
            {onDone && (
              <Button
                type="button"
                variant="outline"
                onClick={onDone}
                className="w-full h-11 text-sm font-semibold rounded-xl"
              >
                Dismiss
              </Button>
            )}
          </>
        )}
      </div>

      {/* Security Footer */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span>Verified by Food Rush Unified Gateway Security</span>
      </div>
    </div>
  );
};

export default PaymentResultView;
