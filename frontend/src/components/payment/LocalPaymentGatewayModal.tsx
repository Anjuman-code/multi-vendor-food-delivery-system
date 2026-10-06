import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import paymentService from '@/services/paymentService';
import type { Order } from '@/types/order';
import {
  CheckCircle2,
  CreditCard,
  Lock,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface LocalPaymentGatewayModalProps {
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
  const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad' | 'card'>(
    defaultMethod === 'bkash' || defaultMethod === 'nagad' || defaultMethod === 'card'
      ? defaultMethod
      : 'bkash',
  );

  // bKash / Nagad states
  const [walletStep, setWalletStep] = useState<'phone' | 'otp' | 'pin'>('phone');
  const [walletNumber, setWalletNumber] = useState('01712345678');
  const [otp, setOtp] = useState('1234');
  const [pin, setPin] = useState('12345');

  // Card states
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState('John Doe');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedTxn, setCompletedTxn] = useState<string | null>(null);

  const formatCardNumber = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 16);
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const formatExpiry = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    return cleaned;
  };

  const handleProcessPayment = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const payload = {
        orderId: order._id,
        method: selectedMethod,
        ...(selectedMethod === 'card'
          ? {
              cardNumber: cardNumber.replace(/\s+/g, ''),
              cardHolder,
              expiry,
              cvv,
            }
          : {
              walletNumber,
              otp,
              pin,
            }),
      };

      const res = await paymentService.processPayment(payload);

      if (res.success && res.data) {
        setCompletedTxn(res.data.transactionId);
        toast.success('Payment Received', {
          description: `Order #${order.orderNumber} is now paid in full.`,
        });
        onSuccess(res.data.transactionId, res.data.order);
      } else {
        setErrorMsg(res.message || 'Payment processing failed. Please verify credentials.');
      }
    } catch {
      setErrorMsg('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletNext = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (walletStep === 'phone') {
      if (!walletNumber || walletNumber.replace(/\D/g, '').length < 11) {
        setErrorMsg('Please enter a valid 11-digit mobile number');
        return;
      }
      setWalletStep('otp');
    } else if (walletStep === 'otp') {
      if (!otp || otp.length < 4) {
        setErrorMsg('Please enter a valid 4-digit OTP');
        return;
      }
      setWalletStep('pin');
    } else {
      handleProcessPayment();
    }
  };

  const resetModal = () => {
    setWalletStep('phone');
    setErrorMsg(null);
    setCompletedTxn(null);
    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!loading) {
          if (!nextOpen) resetModal();
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="max-w-md overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Secure Local Payment</DialogTitle>
          <DialogDescription>Pay for order #{order.orderNumber}</DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 p-6 text-white">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Secure Local Payment
            </span>
            <span className="font-mono">Order #{order.orderNumber}</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-sm font-medium text-neutral-300">Amount Due:</span>
            <span className="text-2xl font-bold tracking-tight text-white">
              ৳{order.total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {completedTxn ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">
                Payment Successful!
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your payment was authenticated and confirmed immediately.
              </p>
              <div className="mt-4 rounded-xl bg-muted/60 p-3 font-mono text-xs">
                <span className="text-muted-foreground">Txn ID: </span>
                <span className="font-semibold text-foreground">{completedTxn}</span>
              </div>
              <Button
                className="mt-6 w-full"
                onClick={() => {
                  resetModal();
                  onOpenChange(false);
                }}
              >
                Close & View Order
              </Button>
            </div>
          ) : (
            <div>
              {/* Method Tabs */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('bkash');
                    setWalletStep('phone');
                    setErrorMsg(null);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-semibold transition-all',
                    selectedMethod === 'bkash'
                      ? 'border-[#E2136E] bg-[#E2136E]/10 text-[#E2136E] shadow-sm'
                      : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Smartphone className="mb-1 h-5 w-5" />
                  bKash
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('nagad');
                    setWalletStep('phone');
                    setErrorMsg(null);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-semibold transition-all',
                    selectedMethod === 'nagad'
                      ? 'border-[#F7941D] bg-[#F7941D]/10 text-[#F7941D] shadow-sm'
                      : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Smartphone className="mb-1 h-5 w-5" />
                  Nagad
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('card');
                    setErrorMsg(null);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-semibold transition-all',
                    selectedMethod === 'card'
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  <CreditCard className="mb-1 h-5 w-5" />
                  Card
                </button>
              </div>

              {/* Error banner */}
              {errorMsg && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* bKash / Nagad Flow */}
              {(selectedMethod === 'bkash' || selectedMethod === 'nagad') && (
                <form onSubmit={handleWalletNext} className="mt-5 space-y-4">
                  {walletStep === 'phone' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="walletNumber" className="text-xs">
                          {selectedMethod === 'bkash' ? 'bKash' : 'Nagad'} Account Number
                        </Label>
                        <Input
                          id="walletNumber"
                          placeholder="e.g. 01712345678"
                          value={walletNumber}
                          onChange={(e) => setWalletNumber(e.target.value)}
                          disabled={loading}
                          autoFocus
                          required
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        A simulated verification OTP will be generated on the next step.
                      </p>
                      <Button
                        type="submit"
                        className="w-full"
                        style={{
                          backgroundColor:
                            selectedMethod === 'bkash' ? '#E2136E' : '#F7941D',
                          color: '#fff',
                        }}
                      >
                        Continue
                      </Button>
                    </div>
                  )}

                  {walletStep === 'otp' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="walletOtp" className="text-xs">
                          Verification Code (OTP)
                        </Label>
                        <Input
                          id="walletOtp"
                          placeholder="Enter 4-digit OTP"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          disabled={loading}
                          autoFocus
                          required
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Simulated OTP sent to <span className="font-semibold">{walletNumber}</span>. (Test code: <span className="font-mono font-bold">1234</span>)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setWalletStep('phone')}
                          disabled={loading}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1"
                          style={{
                            backgroundColor:
                              selectedMethod === 'bkash' ? '#E2136E' : '#F7941D',
                            color: '#fff',
                          }}
                        >
                          Verify OTP
                        </Button>
                      </div>
                    </div>
                  )}

                  {walletStep === 'pin' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="walletPin" className="text-xs">
                          Enter PIN
                        </Label>
                        <Input
                          id="walletPin"
                          type="password"
                          placeholder="•••••"
                          maxLength={5}
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          disabled={loading}
                          autoFocus
                          required
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Test PIN: <span className="font-mono font-bold">12345</span>. Your balance will be verified locally.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setWalletStep('otp')}
                          disabled={loading}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          disabled={loading}
                          className="flex-1"
                          style={{
                            backgroundColor:
                              selectedMethod === 'bkash' ? '#E2136E' : '#F7941D',
                            color: '#fff',
                          }}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Confirming...
                            </>
                          ) : (
                            `Pay ৳${order.total.toFixed(2)}`
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              )}

              {/* Card Flow */}
              {selectedMethod === 'card' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleProcessPayment();
                  }}
                  className="mt-5 space-y-4"
                >
                  <div className="space-y-1">
                    <Label htmlFor="cardNumber" className="text-xs">
                      Card Number
                    </Label>
                    <Input
                      id="cardNumber"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      disabled={loading}
                      maxLength={19}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="cardHolder" className="text-xs">
                      Cardholder Name
                    </Label>
                    <Input
                      id="cardHolder"
                      placeholder="John Doe"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="expiry" className="text-xs">
                        Expiry Date
                      </Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        disabled={loading}
                        maxLength={5}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cvv" className="text-xs">
                        CVV / CVC
                      </Label>
                      <Input
                        id="cvv"
                        type="password"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.slice(0, 4))}
                        disabled={loading}
                        maxLength={4}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 text-emerald-500" />
                    Local end-to-end sandbox verification. No real card charge.
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing Card...
                      </>
                    ) : (
                      `Pay ৳${order.total.toFixed(2)}`
                    )}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocalPaymentGatewayModal;
