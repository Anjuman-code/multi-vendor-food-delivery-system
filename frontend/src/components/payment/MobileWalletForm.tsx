import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaymentBrandIcon } from '@/components/payment/PaymentBrandIcon';
import { validateBdPhone, type SupportedPaymentMethod } from '@/utils/paymentUtils';
import { CheckCircle2, AlertCircle, Smartphone, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface MobileWalletFormData {
  walletNumber: string;
  pin: string;
}

export interface MobileWalletFormProps {
  method: SupportedPaymentMethod;
  value: MobileWalletFormData;
  onChange: (value: MobileWalletFormData) => void;
  disabled?: boolean;
  errors?: Partial<Record<keyof MobileWalletFormData, string>>;
}

export const MobileWalletForm: React.FC<MobileWalletFormProps> = ({
  method,
  value,
  onChange,
  disabled = false,
  errors = {},
}) => {
  const isPhoneValid = useMemo(() => {
    return validateBdPhone(value.walletNumber);
  }, [value.walletNumber]);

  const providerName = useMemo(() => {
    switch (method) {
      case 'bkash':
        return 'bKash';
      case 'nagad':
        return 'Nagad';
      case 'rocket':
        return 'Rocket';
      case 'upay':
        return 'Upay';
      default:
        return 'Mobile Wallet';
    }
  }, [method]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d+]/g, '').slice(0, 14);
    onChange({ ...value, walletNumber: raw });
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 5);
    onChange({ ...value, pin: cleaned });
  };

  return (
    <div className="space-y-4">
      {/* Provider badge banner */}
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <PaymentBrandIcon brandOrMethod={method} className="h-8 w-12 shadow-xs" />
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            {providerName} Checkout
          </h4>
          <p className="text-xs text-muted-foreground">
            Enter your registered {providerName} mobile number to receive a verification OTP.
          </p>
        </div>
      </div>

      {/* Wallet Number */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="walletNumber" className="text-xs font-semibold text-foreground">
            {providerName} Account Number
          </Label>
          {value.walletNumber.length >= 11 && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-medium',
                isPhoneValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
              )}
            >
              {isPhoneValid ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Valid BD Number
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" /> Invalid Number (013-019)
                </>
              )}
            </span>
          )}
        </div>
        <div className="relative">
          <Input
            id="walletNumber"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            disabled={disabled}
            value={value.walletNumber}
            onChange={handlePhoneChange}
            placeholder="017XXXXXXXX"
            className={cn(
              'pr-10 font-mono text-sm tracking-wide',
              errors.walletNumber && 'border-destructive focus-visible:ring-destructive',
            )}
          />
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
            <Smartphone className="h-4 w-4" />
          </div>
        </div>
        {errors.walletNumber && (
          <p className="text-xs text-destructive">{errors.walletNumber}</p>
        )}
      </div>

      {/* Wallet PIN */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="pin" className="text-xs font-semibold text-foreground">
            {providerName} PIN
          </Label>
          <span className="text-[10px] text-muted-foreground">
            4-5 digit secure PIN
          </span>
        </div>
        <div className="relative">
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            maxLength={5}
            value={value.pin}
            onChange={handlePinChange}
            placeholder="•••••"
            className={cn(
              'pr-10 font-mono text-sm tracking-widest',
              errors.pin && 'border-destructive focus-visible:ring-destructive',
            )}
          />
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
            <Lock className="h-4 w-4" />
          </div>
        </div>
        {errors.pin && (
          <p className="text-xs text-destructive">{errors.pin}</p>
        )}
      </div>

      {/* Security notice */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        <span>Your PIN is encrypted directly with {providerName} and is never stored.</span>
      </div>
    </div>
  );
};

export default MobileWalletForm;
