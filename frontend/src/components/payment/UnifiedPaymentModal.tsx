import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import { CardPaymentForm, type CardFormData } from '@/components/payment/CardPaymentForm';
import { MobileWalletForm, type MobileWalletFormData } from '@/components/payment/MobileWalletForm';
import { OtpVerificationView } from '@/components/payment/OtpVerificationView';
import { PaymentResultView } from '@/components/payment/PaymentResultView';
import paymentService, {
  type PaymentPurpose,
  type PaymentSessionResponse,
} from '@/services/paymentService';
import type { SupportedPaymentMethod } from '@/utils/paymentUtils';
import { validateBdPhone, validateLuhn, validateExpiryDate, validateCvv, detectCardBrand } from '@/utils/paymentUtils';
import { PaymentBrandIcon } from '@/components/payment/PaymentBrandIcon';
import userService, { type PaymentMethod } from '@/services/userService';
import { cn } from '@/utils/cn';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from '@/lib/toast';

export interface UnifiedPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency?: string;
  purpose?: PaymentPurpose;
  orderId?: string;
  title?: string;
  description?: string;
  defaultMethod?: SupportedPaymentMethod;
  savedPaymentMethodId?: string;
  showWalletOption?: boolean;
  showCodOption?: boolean;
  initialCardData?: CardFormData;
  initialWalletData?: MobileWalletFormData;
  autoInitiate?: boolean;
  onSuccess: (transactionId: string, result: any) => void;
  onCancel?: () => void;
}

type ModalStep = 'select' | 'otp' | 'result';

export const UnifiedPaymentModal: React.FC<UnifiedPaymentModalProps> = ({
  open,
  onOpenChange,
  amount,
  currency = '৳',
  purpose = 'order_payment',
  orderId,
  title,
  description,
  defaultMethod = 'bkash',
  savedPaymentMethodId,
  showWalletOption = false,
  showCodOption = true,
  initialCardData,
  initialWalletData,
  autoInitiate = false,
  onSuccess,
  onCancel,
}) => {
  const [step, setStep] = useState<ModalStep>('select');
  const [method, setMethod] = useState<SupportedPaymentMethod>(defaultMethod);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Saved payment methods state
  const [savedMethods, setSavedMethods] = useState<PaymentMethod[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(savedPaymentMethodId || null);
  const [mode, setMode] = useState<'saved' | 'new'>(savedPaymentMethodId ? 'saved' : 'new');

  // Forms
  const [cardData, setCardData] = useState<CardFormData>(
    initialCardData || {
      cardNumber: '',
      cardHolder: '',
      expiry: '',
      cvv: '',
      saveCard: false,
    }
  );
  const [walletData, setWalletData] = useState<MobileWalletFormData>(
    initialWalletData || {
      walletNumber: '',
      pin: '',
    }
  );

  // Validation errors
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardFormData, string>>>({});
  const [walletErrors, setWalletErrors] = useState<Partial<Record<keyof MobileWalletFormData, string>>>({});

  // Active Session state
  const [session, setSession] = useState<PaymentSessionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<'success' | 'failed'>('success');
  const [resultMessage, setResultMessage] = useState<string | undefined>();
  const [completedTxnId, setCompletedTxnId] = useState<string | undefined>();
  const autoInitiatedRef = React.useRef(false);

  // Handle open / auto-initiate
  useEffect(() => {
    if (open) {
      if (defaultMethod) setMethod(defaultMethod);
      if (initialCardData) setCardData(initialCardData);
      if (initialWalletData) setWalletData(initialWalletData);
      setOtpError(null);
      setCompletedTxnId(undefined);

      // Fetch saved payment methods automatically
      userService.getPaymentMethods().then((res) => {
        if (res.success && res.data?.paymentMethods && res.data.paymentMethods.length > 0) {
          setSavedMethods(res.data.paymentMethods);
          if (savedPaymentMethodId) {
            setSelectedSavedId(savedPaymentMethodId);
            setMode('saved');
          } else if (!autoInitiate) {
            const def = res.data.paymentMethods.find((p) => p.isDefault) || res.data.paymentMethods[0];
            setSelectedSavedId(def._id);
            setMode('saved');
          }
        }
      }).catch(() => {});

      if (showWalletOption) {
        paymentService.getCustomerWallet().then((res) => {
          if (res.success && res.data) {
            setWalletBalance(res.data.walletBalance);
          }
        });
      }

      if (autoInitiate && !autoInitiatedRef.current) {
        autoInitiatedRef.current = true;
        const targetMethod = defaultMethod;
        const targetCard = initialCardData || cardData;
        const targetWallet = initialWalletData || walletData;

        setLoading(true);
        paymentService
          .initiateSession({
            orderId,
            purpose,
            amount,
            method: savedPaymentMethodId ? undefined : targetMethod,
            savedPaymentMethodId: savedPaymentMethodId || undefined,
            cardDetails: !savedPaymentMethodId && targetMethod === 'card' ? targetCard : undefined,
            walletDetails:
              !savedPaymentMethodId &&
              (targetMethod === 'bkash' ||
                targetMethod === 'nagad' ||
                targetMethod === 'rocket' ||
                targetMethod === 'upay')
                ? targetWallet
                : undefined,
          })
          .then((res) => {
            if (!res.success || !res.data) {
              toast.error(res.message || 'Payment initiation failed');
              setResultStatus('failed');
              setResultMessage(res.message || 'Payment initiation failed');
              setStep('result');
              return;
            }

            const sess = res.data;
            setSession(sess);

            if (sess.requiresOtp) {
              setStep('otp');
            } else {
              setCompletedTxnId(sess.transactionId);
              setResultStatus('success');
              setStep('result');
              onSuccess(sess.transactionId || `TXN-${Date.now()}`, sess);
            }
          })
          .catch((err: any) => {
            toast.error(err.message || 'Network error occurred');
            setResultStatus('failed');
            setResultMessage(err.message);
            setStep('result');
          })
          .finally(() => {
            setLoading(false);
          });
      } else if (!autoInitiate) {
        setStep('select');
      }
    } else {
      autoInitiatedRef.current = false;
      setSession(null);
      setStep('select');
    }
  }, [open, autoInitiate, defaultMethod, savedPaymentMethodId, initialCardData, initialWalletData, orderId, purpose, amount, showWalletOption, onSuccess]);

  // Validation before submission
  const validateForm = (): boolean => {
    if (method === 'card') {
      const errors: Partial<Record<keyof CardFormData, string>> = {};
      const cleanNum = cardData.cardNumber.replace(/\s+/g, '');
      const brand = detectCardBrand(cardData.cardNumber);

      if (!cleanNum || cleanNum.length < 13 || !validateLuhn(cleanNum)) {
        errors.cardNumber = 'Valid card number is required (Luhn check failed)';
      }
      if (!cardData.cardHolder || cardData.cardHolder.trim().length < 3) {
        errors.cardHolder = 'Cardholder name is required';
      }
      if (!cardData.expiry || !validateExpiryDate(cardData.expiry)) {
        errors.expiry = 'Valid MM/YY expiry in the future is required';
      }
      if (!cardData.cvv || !validateCvv(cardData.cvv, brand)) {
        errors.cvv = brand === 'amex' ? '4-digit CVV required' : '3-digit CVV required';
      }
      setCardErrors(errors);
      return Object.keys(errors).length === 0;
    }

    if (method === 'bkash' || method === 'nagad' || method === 'rocket' || method === 'upay') {
      const errors: Partial<Record<keyof MobileWalletFormData, string>> = {};
      if (!walletData.walletNumber || !validateBdPhone(walletData.walletNumber)) {
        errors.walletNumber = 'Valid Bangladeshi number required (013-019)';
      }
      if (!walletData.pin || walletData.pin.length < 4) {
        errors.pin = '4-5 digit PIN required';
      }
      setWalletErrors(errors);
      return Object.keys(errors).length === 0;
    }

    if (method === 'wallet' && walletBalance < amount) {
      toast.error('Insufficient wallet balance');
      return false;
    }

    return true;
  };

  const handleInitiatePayment = async () => {
    if (mode === 'new' && !validateForm()) return;

    setLoading(true);
    setOtpError(null);

    try {
      const activeSaved = mode === 'saved' && selectedSavedId
        ? savedMethods.find((s) => s._id === selectedSavedId)
        : null;

      const res = await paymentService.initiateSession({
        orderId,
        purpose,
        amount,
        method: activeSaved ? undefined : method,
        savedPaymentMethodId: activeSaved ? activeSaved._id : undefined,
        cardDetails: !activeSaved && method === 'card' ? cardData : undefined,
        walletDetails:
          !activeSaved &&
          (method === 'bkash' || method === 'nagad' || method === 'rocket' || method === 'upay')
            ? walletData
            : undefined,
      });

      if (!res.success || !res.data) {
        toast.error(res.message || 'Payment initiation failed');
        setResultStatus('failed');
        setResultMessage(res.message || 'Payment initiation failed');
        setStep('result');
        return;
      }

      const sess = res.data;
      setSession(sess);

      if (sess.requiresOtp) {
        // Move to OTP verification step
        setStep('otp');
      } else {
        // Direct completion (e.g. COD or In-App Wallet)
        setCompletedTxnId(sess.transactionId);
        setResultStatus('success');
        setStep('result');
        onSuccess(sess.transactionId || `TXN-${Date.now()}`, sess);
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error occurred');
      setResultStatus('failed');
      setResultMessage(err.message);
      setStep('result');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otpCode: string) => {
    if (!session) return;
    setOtpError(null);

    try {
      const res = await paymentService.verifyOtp(session.sessionId, otpCode);
      if (!res.success || !res.data) {
        setOtpError(res.message || 'Incorrect verification code. Please try again.');
        return;
      }

      setCompletedTxnId(res.data.transactionId);
      setResultStatus('success');
      setStep('result');
      toast.success('Payment completed successfully!');
      onSuccess(res.data.transactionId || session.sessionId, res.data);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to verify OTP');
    }
  };

  const handleResendOtp = async () => {
    if (!session) return;
    try {
      const res = await paymentService.resendOtp(session.sessionId);
      if (res.success && res.data) {
        toast.success('New OTP sent to your phone');
        if (res.data.devOtpCode) {
          setSession((prev) => (prev ? { ...prev, devOtpCode: res.data?.devOtpCode } : null));
        }
      } else {
        toast.error(res.message || 'Failed to resend OTP');
      }
    } catch {
      toast.error('Failed to resend verification code');
    }
  };

  const modalTitle =
    title ||
    (purpose === 'wallet_topup'
      ? 'Add In-App Balance'
      : purpose === 'cod_remittance'
      ? 'Remit Physical COD Cash'
      : 'Complete Payment');

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel?.();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-border bg-card">
        {/* Header Bar */}
        <div className="border-b border-border/80 bg-muted/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step === 'otp' && (
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mr-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {modalTitle}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {description || `Total Amount: ${currency}${amount.toFixed(2)}`}
                </DialogDescription>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-muted-foreground block">
                Total Due
              </span>
              <span className="text-lg font-extrabold text-foreground">
                {currency}{amount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {step === 'select' && (
            <div className="space-y-5">
              {/* Saved Payment Methods Section */}
              {savedMethods.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Saved Payment Methods
                    </Label>
                    <button
                      type="button"
                      onClick={() => setMode(mode === 'saved' ? 'new' : 'saved')}
                      className="text-xs text-orange-600 font-medium hover:underline"
                    >
                      {mode === 'saved' ? '+ Use new payment method' : '← Use saved method'}
                    </button>
                  </div>

                  {mode === 'saved' && (
                    <div className="space-y-2">
                      {savedMethods.map((pm) => (
                        <div
                          key={pm._id}
                          onClick={() => setSelectedSavedId(pm._id)}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all',
                            selectedSavedId === pm._id
                              ? 'border-orange-500 bg-orange-50/60 ring-1 ring-orange-500'
                              : 'border-border/70 hover:border-gray-300',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <PaymentBrandIcon
                              brandOrMethod={pm.provider || pm.type}
                              className="h-6 w-9"
                            />
                            <div>
                              <p className="text-xs font-semibold text-gray-900 capitalize">
                                {pm.provider} {pm.type === 'wallet' ? 'Wallet' : 'Card'}
                                {pm.isDefault && (
                                  <span className="ml-1.5 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                                    Default
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-gray-500 font-mono">
                                •••• {pm.last4}
                                {pm.expiryMonth && pm.expiryYear
                                  ? ` · Exp ${String(pm.expiryMonth).padStart(2, '0')}/${pm.expiryYear}`
                                  : ''}
                              </p>
                            </div>
                          </div>
                          <div
                            className={cn(
                              'h-4 w-4 rounded-full border flex items-center justify-center',
                              selectedSavedId === pm._id
                                ? 'border-orange-500 bg-orange-500 text-white'
                                : 'border-gray-300',
                            )}
                          >
                            {selectedSavedId === pm._id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      ))}
                      <p className="text-[11px] text-gray-500 flex items-center gap-1 pt-1">
                        🔒 An OTP will be sent to your phone/console to verify this transaction.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* New Payment Method Selector & Details */}
              {(mode === 'new' || savedMethods.length === 0) && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-2 block">
                      Select Payment Method
                    </Label>
                    <PaymentMethodSelector
                      selectedMethod={method}
                      onSelectMethod={(m) => {
                        setMethod(m);
                        setCardErrors({});
                        setWalletErrors({});
                      }}
                      walletBalance={walletBalance}
                      amountToPay={amount}
                      showWallet={showWalletOption && purpose !== 'wallet_topup'}
                      showCod={showCodOption && purpose === 'order_payment'}
                      showCards={true}
                      showMobileWallets={true}
                    />
                  </div>

                  {/* Dynamic Sub-forms */}
                  {method === 'card' && (
                    <div className="pt-2 border-t border-border/60">
                      <CardPaymentForm
                        value={cardData}
                        onChange={setCardData}
                        errors={cardErrors}
                        disabled={loading}
                      />
                    </div>
                  )}

                  {(method === 'bkash' || method === 'nagad' || method === 'rocket' || method === 'upay') && (
                    <div className="pt-2 border-t border-border/60">
                      <MobileWalletForm
                        method={method}
                        value={walletData}
                        onChange={setWalletData}
                        errors={walletErrors}
                        disabled={loading}
                      />
                    </div>
                  )}

                  {method === 'wallet' && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground space-y-1.5">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Current Wallet Balance</span>
                        <span>{currency}{walletBalance.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>After Payment Balance</span>
                        <span>{currency}{(walletBalance - amount).toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground pt-1">
                        Funds will be deducted instantly.
                      </p>
                    </div>
                  )}

                  {method === 'cash_on_delivery' && (
                    <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">Cash on Delivery Selected</p>
                      <p>
                        Please prepare the exact cash amount of{' '}
                        <span className="font-bold text-foreground">
                          {currency}{amount.toFixed(2)}
                        </span>{' '}
                        for our delivery partner upon arrival.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <Button
                type="button"
                disabled={loading}
                onClick={handleInitiatePayment}
                className="w-full h-11 text-sm font-semibold rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing Payment…
                  </>
                ) : (
                  <>
                    Proceed to Pay {currency}{amount.toFixed(2)}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {step === 'otp' && (
            <OtpVerificationView
              method={method}
              amount={amount}
              currency={currency}
              recipientIdentifier={
                session?.paymentDetails?.walletNumber ||
                (session?.paymentDetails?.last4 ? `Card ending in ${session.paymentDetails.last4}` : undefined)
              }
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              devOtpCode={session?.devOtpCode}
              devOtpNotice={session?.devOtpNotice}
              error={otpError}
            />
          )}

          {step === 'result' && (
            <PaymentResultView
              status={resultStatus}
              transactionId={completedTxnId || session?.transactionId}
              amount={amount}
              currency={currency}
              method={method}
              paymentDetails={session?.paymentDetails}
              errorMessage={resultMessage}
              onRetry={() => {
                setStep('select');
                setOtpError(null);
              }}
              onDone={() => {
                onOpenChange(false);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedPaymentModal;
