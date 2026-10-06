import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentBrandIcon } from '@/components/payment/PaymentBrandIcon';
import type { SupportedPaymentMethod } from '@/utils/paymentUtils';
import {
  KeyRound,
  RotateCw,
  Clock,
  AlertCircle,
  Terminal,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export interface OtpVerificationViewProps {
  method: SupportedPaymentMethod;
  recipientIdentifier?: string; // masked phone or card last 4
  amount: number;
  currency?: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  devOtpCode?: string;
  devOtpNotice?: string;
  loading?: boolean;
  error?: string | null;
  initialCooldown?: number;
}

export const OtpVerificationView: React.FC<OtpVerificationViewProps> = ({
  method,
  recipientIdentifier,
  amount,
  currency = '৳',
  onVerify,
  onResend,
  devOtpCode,
  devOtpNotice,
  loading = false,
  error = null,
  initialCooldown = 60,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [canResend, setCanResend] = useState(initialCooldown <= 0);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      setCanResend(false);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCanResend(true);
    }
  }, [cooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const nextOtp = [...otp];
      nextOtp[index] = '';
      setOtp(nextOtp);
      return;
    }

    // Support pasting full code
    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, 6).split('');
      const nextOtp = [...otp];
      digits.forEach((d, idx) => {
        if (index + idx < 6) nextOtp[index + idx] = d;
      });
      setOtp(nextOtp);
      const targetFocus = Math.min(5, index + digits.length);
      inputRefs.current[targetFocus]?.focus();
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = cleaned[0];
    setOtp(nextOtp);

    // Auto advance
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullOtp = otp.join('');
  const isComplete = fullOtp.length === 6;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isComplete || loading || submitting) return;

    setSubmitting(true);
    try {
      await onVerify(fullOtp);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendClick = async () => {
    if (!canResend || loading) return;
    setOtp(['', '', '', '', '', '']);
    await onResend();
    setCooldown(60);
    setCanResend(false);
    inputRefs.current[0]?.focus();
  };

  const fillDevCode = () => {
    if (!devOtpCode) return;
    const digits = devOtpCode.split('').slice(0, 6);
    const nextOtp = [...otp];
    digits.forEach((d, idx) => {
      nextOtp[idx] = d;
    });
    setOtp(nextOtp);
    inputRefs.current[5]?.focus();
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1.5">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-1">
          <KeyRound className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">
          Two-Factor Authentication
        </h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          We sent a 6-digit verification code for{' '}
          <span className="font-semibold text-foreground">
            {currency}{amount.toFixed(2)}
          </span>
          {recipientIdentifier ? ` to ${recipientIdentifier}` : ''}.
        </p>
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <PaymentBrandIcon brandOrMethod={method} className="h-4 w-6 inline-block" />
          <span className="text-[11px] font-medium text-foreground capitalize">
            {method.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Dev-only OTP Helper Banner */}
      {devOtpCode && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-medium">
              <Terminal className="h-3.5 w-3.5 shrink-0" />
              <span>Dev Testing Code:</span>
              <span className="font-mono font-bold tracking-widest bg-amber-500/20 px-1.5 py-0.5 rounded text-sm text-foreground">
                {devOtpCode}
              </span>
            </div>
            <button
              type="button"
              onClick={fillDevCode}
              className="text-[11px] font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
            >
              Auto-fill
            </button>
          </div>
          {devOtpNotice && (
            <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1">
              {devOtpNotice}
            </p>
          )}
        </div>
      )}

      {/* 6 Digit Inputs */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-center gap-2 sm:gap-3">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={loading || submitting}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={cn(
                'h-12 w-11 sm:h-14 sm:w-12 text-center font-mono text-xl font-bold rounded-xl border bg-background text-foreground shadow-xs transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden',
                digit && 'border-primary bg-primary/5',
                error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
              )}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={!isComplete || loading || submitting}
          className="w-full h-11 text-sm font-semibold rounded-xl"
        >
          {loading || submitting ? (
            <span className="inline-flex items-center gap-2">
              <RotateCw className="h-4 w-4 animate-spin" /> Verifying OTP...
            </span>
          ) : (
            `Verify & Complete Payment (${currency}${amount.toFixed(2)})`
          )}
        </Button>
      </form>

      {/* Resend Actions & Cooldown */}
      <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>Expires in 3:00 mins</span>
        </div>

        <div>
          {canResend ? (
            <button
              type="button"
              disabled={loading}
              onClick={handleResendClick}
              className="text-primary font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className="h-3 w-3" /> Resend OTP
            </button>
          ) : (
            <span>Resend code in {cooldown}s</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationView;
