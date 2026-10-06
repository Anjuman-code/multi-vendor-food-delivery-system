import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaymentBrandIcon } from '@/components/payment/PaymentBrandIcon';
import paymentService, { type PayoutItem } from '@/services/paymentService';
import { ArrowDownRight, Loader2, Building, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toast } from '@/lib/toast';

export interface WithdrawalRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'vendor' | 'driver';
  availableBalance: number;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    accountHolderName?: string;
    mobileMoneyNumber?: string;
    mobileMoneyProvider?: string;
  };
  onSuccess: (payout: PayoutItem, newBalance: number) => void;
}

export const WithdrawalRequestModal: React.FC<WithdrawalRequestModalProps> = ({
  open,
  onOpenChange,
  role,
  availableBalance,
  bankDetails,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'mobile_money' | 'bank_transfer'>(
    bankDetails?.mobileMoneyNumber ? 'mobile_money' : 'bank_transfer',
  );
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numAmount = parseFloat(amount) || 0;
  const isDriver = role === 'driver';
  const minAmount = 100;

  const setPreset = (percentage: number) => {
    const val = Math.floor(availableBalance * (percentage / 100));
    setAmount(val > 0 ? val.toString() : '');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount < minAmount) {
      setError(`Minimum withdrawal amount is ৳${minAmount}`);
      return;
    }
    if (numAmount > availableBalance) {
      setError(`Withdrawal amount cannot exceed your available balance of ৳${availableBalance.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amount: numAmount,
        method,
        notes: notes.trim() || undefined,
      };

      const res = isDriver
        ? await paymentService.requestDriverPayout(payload)
        : await paymentService.requestVendorPayout(payload);

      if (res.success && res.data) {
        toast.success(
          isDriver
            ? 'Cashout request submitted for review!'
            : 'Vendor withdrawal request submitted!',
        );
        onSuccess(res.data.payout, res.data.availableBalance);
        onOpenChange(false);
      } else {
        setError(res.message || 'Failed to submit withdrawal request');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden rounded-2xl border-border bg-card">
        {/* Header */}
        <div className="border-b border-border/80 bg-muted/20 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ArrowDownRight className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {isDriver ? 'Request Rider Cashout' : 'Request Vendor Withdrawal'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Transfer your earnings to your registered account
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Available balance card */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">
                Available for Withdrawal
              </span>
              <span className="text-2xl font-black text-foreground">
                ৳{availableBalance.toFixed(2)}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreset(100)}
              className="text-xs h-7 px-2.5 border-primary/30 text-primary hover:bg-primary/10"
            >
              Withdraw Max
            </Button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs font-semibold text-foreground">
              Withdrawal Amount (BDT)
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-bold text-muted-foreground">
                ৳
              </span>
              <Input
                id="amount"
                type="number"
                min={minAmount}
                max={availableBalance}
                step="1"
                disabled={loading}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="500"
                className="pl-8 text-base font-semibold"
              />
            </div>

            {/* Quick Percentage Presets */}
            <div className="flex gap-2 pt-1">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPreset(pct)}
                  className="flex-1 rounded-lg border border-border/70 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Destination Method Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Payout Destination
            </Label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMethod('mobile_money')}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all',
                  method === 'mobile_money'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/30',
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/40 p-0.5">
                  <PaymentBrandIcon
                    brandOrMethod={bankDetails?.mobileMoneyProvider || 'bkash'}
                    className="h-5 w-7"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-foreground block truncate">
                    Mobile Money
                  </span>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {bankDetails?.mobileMoneyNumber || 'bKash / Nagad'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod('bank_transfer')}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all',
                  method === 'bank_transfer'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/30',
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <Building className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-foreground block truncate">
                    Bank Transfer
                  </span>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {bankDetails?.bankName || 'Direct deposit'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold text-foreground">
              Notes / Reference (Optional)
            </Label>
            <Input
              id="notes"
              type="text"
              disabled={loading}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Weekly settlement cashout"
              className="text-xs"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || numAmount < minAmount || numAmount > availableBalance}
              className="flex-1 h-11 text-xs font-semibold rounded-xl"
            >
              {loading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                </span>
              ) : (
                `Confirm Withdrawal (৳${numAmount.toFixed(0)})`
              )}
            </Button>
          </div>

          {/* Notice */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Mobile transfers process within 1-2 hours; bank transfers within 1-2 business days.</span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawalRequestModal;
