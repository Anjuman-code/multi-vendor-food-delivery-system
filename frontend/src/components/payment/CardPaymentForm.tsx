import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaymentBrandIcon } from '@/components/payment/PaymentBrandIcon';
import {
  detectCardBrand,
  validateLuhn,
  formatCardNumber,
  formatExpiryDate,
  validateExpiryDate,
  validateCvv,
  type CardBrand,
} from '@/utils/paymentUtils';
import { CheckCircle2, AlertCircle, ShieldCheck, Lock } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface CardFormData {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
  saveCard?: boolean;
}

export interface CardPaymentFormProps {
  value: CardFormData;
  onChange: (value: CardFormData) => void;
  disabled?: boolean;
  errors?: Partial<Record<keyof CardFormData, string>>;
  showSaveCard?: boolean;
}

export const CardPaymentForm: React.FC<CardPaymentFormProps> = ({
  value,
  onChange,
  disabled = false,
  errors = {},
  showSaveCard = true,
}) => {
  const brand: CardBrand = useMemo(() => {
    return detectCardBrand(value.cardNumber);
  }, [value.cardNumber]);

  const cleanNum = value.cardNumber.replace(/\s+/g, '');
  const isLuhnValid = useMemo(() => {
    return cleanNum.length >= 13 && validateLuhn(cleanNum);
  }, [cleanNum]);

  const isExpiryValid = useMemo(() => {
    return value.expiry.length === 5 && validateExpiryDate(value.expiry);
  }, [value.expiry]);

  const isCvvValid = useMemo(() => {
    return validateCvv(value.cvv, brand);
  }, [value.cvv, brand]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    onChange({ ...value, cardNumber: formatted });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    onChange({ ...value, expiry: formatted });
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, brand === 'amex' ? 4 : 3);
    onChange({ ...value, cvv: cleaned });
  };

  return (
    <div className="space-y-4">
      {/* Card Number */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="cardNumber" className="text-xs font-semibold text-foreground">
            Card Number
          </Label>
          {cleanNum.length >= 13 && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-medium transition-colors',
                isLuhnValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
              )}
            >
              {isLuhnValid ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Luhn Verified
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" /> Invalid Number
                </>
              )}
            </span>
          )}
        </div>
        <div className="relative">
          <Input
            id="cardNumber"
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            disabled={disabled}
            value={value.cardNumber}
            onChange={handleCardNumberChange}
            placeholder="1234 5678 9012 3456"
            className={cn(
              'pr-14 font-mono text-sm tracking-wide',
              errors.cardNumber && 'border-destructive focus-visible:ring-destructive',
            )}
          />
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <PaymentBrandIcon
              brandOrMethod={brand}
              className="h-6 w-9 shadow-xs"
            />
          </div>
        </div>
        {errors.cardNumber && (
          <p className="text-xs text-destructive">{errors.cardNumber}</p>
        )}
      </div>

      {/* Cardholder Name */}
      <div className="space-y-1.5">
        <Label htmlFor="cardHolder" className="text-xs font-semibold text-foreground">
          Cardholder Name
        </Label>
        <Input
          id="cardHolder"
          type="text"
          autoComplete="cc-name"
          disabled={disabled}
          value={value.cardHolder}
          onChange={(e) => onChange({ ...value, cardHolder: e.target.value.toUpperCase() })}
          placeholder="JOHN DOE"
          className={cn(
            'text-sm uppercase tracking-wide',
            errors.cardHolder && 'border-destructive focus-visible:ring-destructive',
          )}
        />
        {errors.cardHolder && (
          <p className="text-xs text-destructive">{errors.cardHolder}</p>
        )}
      </div>

      {/* Expiry & CVV */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="expiry" className="text-xs font-semibold text-foreground">
            Expiry Date
          </Label>
          <div className="relative">
            <Input
              id="expiry"
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              disabled={disabled}
              value={value.expiry}
              onChange={handleExpiryChange}
              placeholder="MM/YY"
              className={cn(
                'font-mono text-sm tracking-wide',
                errors.expiry && 'border-destructive focus-visible:ring-destructive',
              )}
            />
            {value.expiry.length === 5 && (
              <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                {isExpiryValid ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            )}
          </div>
          {errors.expiry && (
            <p className="text-xs text-destructive">{errors.expiry}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="cvv" className="text-xs font-semibold text-foreground">
              CVV / CVC
            </Label>
            <span className="text-[10px] text-muted-foreground">
              {brand === 'amex' ? '4 digits' : '3 digits'}
            </span>
          </div>
          <div className="relative">
            <Input
              id="cvv"
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              disabled={disabled}
              maxLength={brand === 'amex' ? 4 : 3}
              value={value.cvv}
              onChange={handleCvvChange}
              placeholder={brand === 'amex' ? '1234' : '123'}
              className={cn(
                'font-mono text-sm tracking-widest',
                errors.cvv && 'border-destructive focus-visible:ring-destructive',
              )}
            />
            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
              {value.cvv.length >= 3 ? (
                isCvvValid ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </div>
          {errors.cvv && (
            <p className="text-xs text-destructive">{errors.cvv}</p>
          )}
        </div>
      </div>

      {/* Save card option */}
      {showSaveCard && (
        <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={value.saveCard ?? false}
            onChange={(e) => onChange({ ...value, saveCard: e.target.checked })}
            disabled={disabled}
            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
          />
          <span>Save card securely for future 1-click orders (PCI DSS Tokenized)</span>
        </label>
      )}

      {/* Security notice */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        <span>256-bit SSL encrypted. Card details are tokenized and never stored on our servers.</span>
      </div>
    </div>
  );
};

export default CardPaymentForm;
