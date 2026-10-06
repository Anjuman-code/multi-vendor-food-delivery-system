import { AddressDialog } from '@/components/AddressDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { extractApiError, getErrorMessage, getFieldErrors } from '@/lib/formErrors';
import { toast } from '@/lib/toast';
import orderService from '@/services/orderService';
import type { PaymentMethod, UserAddress } from '@/services/userService';
import userService from '@/services/userService';
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import { CardPaymentForm, type CardFormData } from '@/components/payment/CardPaymentForm';
import { MobileWalletForm, type MobileWalletFormData } from '@/components/payment/MobileWalletForm';
import { UnifiedPaymentModal } from '@/components/payment/UnifiedPaymentModal';
import { PaymentBrandIcon } from '@/components/payment/PaymentBrandIcon';
import {
  validateBdPhone,
  validateLuhn,
  validateExpiryDate,
  validateCvv,
  detectCardBrand,
  type SupportedPaymentMethod,
} from '@/utils/paymentUtils';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  Navigation,
  Plus,
  Store,
  Tag,
  Truck,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type Step = 'delivery-address' | 'payment' | 'review';

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  {
    key: 'delivery-address',
    label: 'Address',
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    key: 'payment',
    label: 'Payment',
    icon: <CreditCard className="h-4 w-4" />,
  },
  { key: 'review', label: 'Review', icon: <CheckCircle className="h-4 w-4" /> },
];

const VALID_STEPS: Step[] = ['delivery-address', 'payment', 'review'];
const COD_PAYMENT_ID = '__cod__';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const {
    items,
    subtotal,
    tax,
    deliveryFee,
    total,
    promoCode,
    setPromoCode,
    clearCart,
    itemsByRestaurant,
  } = useCart();

  const rawStep = searchParams.get('step') as Step | null;
  const step: Step =
    rawStep && VALID_STEPS.includes(rawStep) ? rawStep : 'delivery-address';

  const setStep = useCallback(
    (s: Step) => {
      setSearchParams({ step: s }, { replace: false });
    },
    [setSearchParams],
  );

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(COD_PAYMENT_ID);
  const [activePaymentMethod, setActivePaymentMethod] = useState<SupportedPaymentMethod>('cash_on_delivery');
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  // Inline message shown when a "Continue" requirement isn't met.
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  // Server error(s) from the place-order call, surfaced inline on the review step.
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderFieldErrors, setOrderFieldErrors] = useState<string[]>([]);

  // Detailed payment form state
  const [cardData, setCardData] = useState<CardFormData>({
    cardNumber: '',
    cardHolder: '',
    expiry: '',
    cvv: '',
    saveCard: true,
  });
  const [walletData, setWalletData] = useState<MobileWalletFormData>({
    walletNumber: '',
    pin: '',
  });
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardFormData, string>>>({});
  const [walletErrors, setWalletErrors] = useState<Partial<Record<keyof MobileWalletFormData, string>>>({});

  // Payment gateway modal state for online payments
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [isAuthenticated, items.length, navigate]);

  const loadAddresses = useCallback(async () => {
    const profileRes = await userService.getProfile();
    if (profileRes.success && profileRes.data) {
      const addrs = profileRes.data.user.addresses;
      setAddresses(addrs);
      setSelectedAddress((prev) => {
        if (prev) return prev;
        const latest = addrs[addrs.length - 1];
        return latest ? latest._id : null;
      });
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      setLoading(true);
      const [profileRes, pmRes] = await Promise.all([
        userService.getProfile(),
        userService.getPaymentMethods(),
      ]);
      if (profileRes.success && profileRes.data) {
        setAddresses(profileRes.data.user.addresses);
        const defaultAddr = profileRes.data.user.addresses.find(
          (a) => a.isDefault,
        );
        if (defaultAddr) setSelectedAddress(defaultAddr._id);
      }
      if (pmRes.success && pmRes.data) {
        setPaymentMethods(pmRes.data.paymentMethods);
        const defaultPm = pmRes.data.paymentMethods.find((p) => p.isDefault);
        if (defaultPm) setSelectedPayment(defaultPm._id);
      }
      setLoading(false);
    };
    loadData();
  }, [isAuthenticated]);

  const selectedAddr = addresses.find((a) => a._id === selectedAddress);
  const isCOD =
    selectedPayment === COD_PAYMENT_ID ||
    activePaymentMethod === 'cash_on_delivery';
  const selectedPm = !isCOD && selectedPayment !== null
    ? paymentMethods.find((p) => p._id === selectedPayment)
    : null;

  const isPaymentValid = useMemo(() => {
    if (isCOD) return true;
    if (selectedPm) return true;
    if (activePaymentMethod === 'card') {
      const cleanNum = cardData.cardNumber.replace(/\s+/g, '');
      const brand = detectCardBrand(cardData.cardNumber);
      return Boolean(
        cleanNum.length >= 13 &&
        validateLuhn(cleanNum) &&
        cardData.cardHolder.trim().length >= 3 &&
        cardData.expiry.length === 5 &&
        validateExpiryDate(cardData.expiry) &&
        validateCvv(cardData.cvv, brand)
      );
    }
    if (
      activePaymentMethod === 'bkash' ||
      activePaymentMethod === 'nagad' ||
      activePaymentMethod === 'rocket' ||
      activePaymentMethod === 'upay'
    ) {
      return validateBdPhone(walletData.walletNumber);
    }
    return false;
  }, [isCOD, selectedPm, activePaymentMethod, cardData, walletData]);

  const maxAllowedStep: Step = useMemo(() => {
    if (!selectedAddress) return 'delivery-address';
    if (!isPaymentValid) return 'payment';
    return 'review';
  }, [selectedAddress, isPaymentValid]);

  // The earliest step the user still needs to complete (== maxAllowedStep here,
  // since each step gates the next), used as the redirect target.
  const requestedIndex = VALID_STEPS.indexOf(step);
  const maxAllowedIndex = VALID_STEPS.indexOf(maxAllowedStep);
  const stepExceedsAllowed = requestedIndex > maxAllowedIndex;

  // Hard guard: runs on EVERY render (incl. direct URL access / reload). If the
  // URL asks for a step the selections don't permit, snap back to the earliest
  // incomplete step (replacing history) and explain what's missing.
  useEffect(() => {
    if (!isAuthenticated || loading) return;
    if (stepExceedsAllowed) {
      setSearchParams({ step: maxAllowedStep }, { replace: true });
      toast.info(
        maxAllowedStep === 'delivery-address'
          ? 'Please select a delivery address to continue.'
          : 'Please enter your payment details to continue.',
      );
    }
  }, [
    isAuthenticated,
    loading,
    stepExceedsAllowed,
    maxAllowedStep,
    setSearchParams,
  ]);

  // While the guard's redirect is pending, render the step the state allows so
  // we never momentarily show a step the user hasn't earned.
  const effectiveStep: Step = stepExceedsAllowed ? maxAllowedStep : step;

  const finalTotal = Math.round((total + tipAmount) * 100) / 100;

  const stepIndex = STEPS.findIndex((s) => s.key === effectiveStep);

  const goNext = () => {
    if (effectiveStep === 'delivery-address') {
      if (!selectedAddress) {
        const msg = 'Please select a delivery address to continue.';
        setAdvanceError(msg);
        toast.error('Select Address', { description: msg });
        return;
      }
      setAdvanceError(null);
      setStep('payment');
    } else if (effectiveStep === 'payment') {
      if (isCOD || selectedPm) {
        setAdvanceError(null);
        setStep('review');
        return;
      }

      if (activePaymentMethod === 'card') {
        const cleanNum = cardData.cardNumber.replace(/\s+/g, '');
        const brand = detectCardBrand(cardData.cardNumber);
        const errs: Partial<Record<keyof CardFormData, string>> = {};

        if (!cleanNum || cleanNum.length < 13 || !validateLuhn(cleanNum)) {
          errs.cardNumber = 'Valid card number is required (Luhn check failed)';
        }
        if (!cardData.cardHolder || cardData.cardHolder.trim().length < 3) {
          errs.cardHolder = 'Cardholder name is required (at least 3 characters)';
        }
        if (!cardData.expiry || !validateExpiryDate(cardData.expiry)) {
          errs.expiry = 'Valid MM/YY future expiry is required';
        }
        if (!cardData.cvv || !validateCvv(cardData.cvv, brand)) {
          errs.cvv = brand === 'amex' ? '4-digit CVV required' : '3-digit CVV required';
        }

        if (Object.keys(errs).length > 0) {
          setCardErrors(errs);
          const firstErr = Object.values(errs)[0];
          setAdvanceError(firstErr);
          toast.error('Card Details Incomplete', { description: firstErr });
          return;
        }

        setCardErrors({});
        setAdvanceError(null);
        setStep('review');
        return;
      }

      if (
        activePaymentMethod === 'bkash' ||
        activePaymentMethod === 'nagad' ||
        activePaymentMethod === 'rocket' ||
        activePaymentMethod === 'upay'
      ) {
        const errs: Partial<Record<keyof MobileWalletFormData, string>> = {};
        if (!walletData.walletNumber || !validateBdPhone(walletData.walletNumber)) {
          errs.walletNumber = 'Valid Bangladeshi mobile number (013-019) required';
        }

        if (Object.keys(errs).length > 0) {
          setWalletErrors(errs);
          const firstErr = Object.values(errs)[0];
          setAdvanceError(firstErr);
          toast.error('Mobile Number Required', { description: firstErr });
          return;
        }

        setWalletErrors({});
        setAdvanceError(null);
        setStep('review');
        return;
      }

      const msg = 'Please select a payment method to continue.';
      setAdvanceError(msg);
      toast.error('Select Payment', { description: msg });
    }
  };

  const goBack = () => {
    setAdvanceError(null);
    if (effectiveStep === 'payment') setStep('delivery-address');
    else if (effectiveStep === 'review') setStep('payment');
  };

  const placeOrder = useCallback(async () => {
    if (!selectedAddr) return;
    if (!isCOD && !selectedPm && !isPaymentValid) return;

    let paymentMethodValue: string = 'cash_on_delivery';
    if (selectedPm) {
      paymentMethodValue = `${selectedPm.type} - ${selectedPm.provider} ****${selectedPm.last4}`;
    } else if (activePaymentMethod === 'card') {
      const cleanNum = cardData.cardNumber.replace(/\s+/g, '');
      const brand = detectCardBrand(cardData.cardNumber).toUpperCase();
      paymentMethodValue = `card - ${brand} ****${cleanNum.slice(-4)}`;
    } else if (activePaymentMethod) {
      paymentMethodValue = `${activePaymentMethod} - ${walletData.walletNumber}`;
    }

    setOrderError(null);
    setOrderFieldErrors([]);
    setPlacing(true);
    let res;
    try {
      res = await orderService.createOrderFromCart({
        deliveryAddress: {
          street: selectedAddr.street,
          apartment: selectedAddr.apartment,
          area: selectedAddr.area,
          district: selectedAddr.district,
          coordinates: selectedAddr.coordinates,
        },
        paymentMethod: paymentMethodValue,
        couponCode: promoCode || undefined,
        tipAmount: tipAmount > 0 ? tipAmount : undefined,
      });
    } catch (err) {
      setPlacing(false);
      const fieldErrors = getFieldErrors(extractApiError(err)).map(
        (e) => e.message,
      );
      setOrderFieldErrors(fieldErrors);
      setOrderError(getErrorMessage(err));
      toast.error('Order Failed', {
        description:
          fieldErrors.length > 0
            ? fieldErrors.join('\n')
            : getErrorMessage(err),
      });
      return;
    }
    setPlacing(false);

    if (res.success && res.data) {
      const firstOrder = res.data.orders[0];
      const orderCount = res.data.orders.length;

      if (isCOD) {
        clearCart();
        if (orderCount > 1) {
          toast.success('Orders Placed!', {
            description: `${orderCount} orders confirmed across ${orderCount} restaurants.`,
          });
        } else {
          toast.success('Order Placed!', {
            description: `Order ${firstOrder.orderNumber} confirmed.`,
          });
        }
        navigate(`/orders/${firstOrder._id}`);
      } else {
        // Online Payment: Launch Unified Payment Gateway Modal with autoInitiate (triggers OTP)
        setCreatedOrder(firstOrder);
        setPaymentModalOpen(true);
      }
    } else {
      const fieldErrors = getFieldErrors(extractApiError(res)).map(
        (e) => e.message,
      );
      setOrderFieldErrors(fieldErrors);
      setOrderError(getErrorMessage(res));
      toast.error('Order Failed', {
        description:
          fieldErrors.length > 0
            ? fieldErrors.join('\n')
            : getErrorMessage(res),
      });
    }
  }, [
    selectedAddr,
    isCOD,
    selectedPm,
    isPaymentValid,
    activePaymentMethod,
    cardData,
    walletData,
    promoCode,
    tipAmount,
    clearCart,
    navigate,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const isMultiRestaurant = itemsByRestaurant.length > 1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout</h1>
        {isMultiRestaurant ? (
          <p className="text-sm text-gray-500 mb-6">
            Ordering from{' '}
            <span className="font-medium text-orange-600">
              {itemsByRestaurant.length} restaurants
            </span>
          </p>
        ) : itemsByRestaurant.length === 1 ? (
          <p className="text-sm text-gray-500 mb-6">
            Ordering from{' '}
            <span className="font-medium text-orange-600">
              {itemsByRestaurant[0].restaurantName}
            </span>
          </p>
        ) : null}

        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.key}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  idx <= stepIndex
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${
                    idx < stepIndex ? 'bg-orange-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {effectiveStep === 'delivery-address' && (
              <motion.div
                key="delivery-address"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">
                    Select Delivery Address
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={() => setAddressDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add new
                  </Button>
                </div>
                {addresses.length === 0 ? (
                  <Card className="p-6 text-center">
                    <Navigation className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 mb-1 font-medium">
                      No addresses saved
                    </p>
                    <p className="text-sm text-gray-400 mb-4">
                      Add an address to continue, or use your current location.
                    </p>
                    <Button
                      className="bg-orange-500 hover:bg-orange-600"
                      onClick={() => setAddressDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Address
                    </Button>
                  </Card>
                ) : (
                  addresses.map((addr) => (
                    <Card
                      key={addr._id}
                      className={`p-4 cursor-pointer border-2 transition-colors ${
                        selectedAddress === addr._id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-transparent hover:border-gray-200'
                      }`}
                      onClick={() => {
                        setSelectedAddress(addr._id);
                        setAdvanceError(null);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-orange-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium capitalize">
                            {addr.type}
                            {addr.isDefault && (
                              <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            {addr.street}
                            {addr.apartment && `, ${addr.apartment}`},{' '}
                            {addr.area}, {addr.district}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}

                <AddressDialog
                  open={addressDialogOpen}
                  onOpenChange={setAddressDialogOpen}
                  address={null}
                  onSuccess={async () => {
                    setAddressDialogOpen(false);
                    await loadAddresses();
                  }}
                />
              </motion.div>
            )}

            {effectiveStep === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-lg font-semibold mb-1">
                    Select Payment Method
                  </h2>
                  <p className="text-xs text-gray-500 mb-3">
                    Choose from mobile wallets, cards, or pay cash on arrival.
                  </p>
                  <PaymentMethodSelector
                    selectedMethod={selectedPm ? (selectedPm.provider as SupportedPaymentMethod) || 'card' : activePaymentMethod}
                    onSelectMethod={(m) => {
                      setActivePaymentMethod(m);
                      if (m === 'cash_on_delivery') {
                        setSelectedPayment(COD_PAYMENT_ID);
                      } else {
                        setSelectedPayment(null);
                      }
                      setAdvanceError(null);
                    }}
                    showWallet={false}
                    showCod={true}
                    showCards={true}
                    showMobileWallets={true}
                  />
                </div>

                {/* Inline Detail Forms for New Method Selection */}
                {!selectedPm && activePaymentMethod === 'card' && (
                  <Card className="p-4 border border-orange-100 bg-white shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          Card Details
                        </h3>
                        <p className="text-xs text-gray-500">
                          Enter your card details for secure 3D-Secure processing
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
                        <Lock className="h-3 w-3" /> 256-bit Encrypted
                      </div>
                    </div>
                    <CardPaymentForm
                      value={cardData}
                      onChange={(val) => {
                        setCardData(val);
                        setCardErrors({});
                        setAdvanceError(null);
                      }}
                      errors={cardErrors}
                      showSaveCard={true}
                    />
                  </Card>
                )}

                {!selectedPm &&
                  (activePaymentMethod === 'bkash' ||
                    activePaymentMethod === 'nagad' ||
                    activePaymentMethod === 'rocket' ||
                    activePaymentMethod === 'upay') && (
                    <Card className="p-4 border border-orange-100 bg-white shadow-xs space-y-3">
                      <MobileWalletForm
                        method={activePaymentMethod}
                        value={walletData}
                        onChange={(val) => {
                          setWalletData(val);
                          setWalletErrors({});
                          setAdvanceError(null);
                        }}
                        errors={walletErrors}
                      />
                    </Card>
                  )}

                {activePaymentMethod === 'cash_on_delivery' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-amber-950">
                      <Banknote className="h-4 w-4 text-amber-600" />
                      Cash on Delivery Selected
                    </div>
                    <p>
                      Please keep <strong>৳{finalTotal.toFixed(2)}</strong> in cash ready for our delivery partner upon arrival.
                    </p>
                  </div>
                )}

                {/* Saved Payment Methods (if user has any saved) */}
                {paymentMethods.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Or use a saved method
                      </p>
                      <a
                        href="/profile?tab=payment"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 font-medium"
                      >
                        <Plus className="h-3 w-3" />
                        Manage saved
                      </a>
                    </div>
                    <div className="space-y-2">
                      {paymentMethods.map((pm) => (
                        <Card
                          key={pm._id}
                          className={`p-3.5 cursor-pointer border-2 transition-colors ${
                            selectedPayment === pm._id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-transparent hover:border-gray-200'
                          }`}
                          onClick={() => {
                            setSelectedPayment(pm._id);
                            setActivePaymentMethod(
                              (pm.provider as SupportedPaymentMethod) || 'card',
                            );
                            setAdvanceError(null);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <PaymentBrandIcon
                              brandOrMethod={pm.provider || pm.type}
                              className="h-6 w-9"
                            />
                            <div>
                              <p className="font-medium capitalize text-sm">
                                {pm.type} – {pm.provider}
                                {pm.isDefault && (
                                  <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                                    Default
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600">
                                ****{pm.last4}
                                {pm.expiryMonth && pm.expiryYear
                                  ? ` · Exp ${String(pm.expiryMonth).padStart(2, '0')}/${pm.expiryYear}`
                                  : ''}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Tag className="h-4 w-4" /> Promo Code
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      value={promoCode}
                      onChange={(e) =>
                        setPromoCode(e.target.value.toUpperCase())
                      }
                      placeholder="Enter code"
                      className="flex-1"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {effectiveStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold mb-3">Review Order</h2>

                {selectedAddr && (
                  <Card className="p-4">
                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">
                      Deliver To
                    </p>
                    <p className="text-sm text-gray-800">
                      {selectedAddr.street}
                      {selectedAddr.apartment &&
                        `, ${selectedAddr.apartment}`}, {selectedAddr.area},{' '}
                      {selectedAddr.district}
                    </p>
                  </Card>
                )}

                {/* Selected payment summary with authentic brand logos */}
                <Card className="p-4">
                  <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                    Payment Method
                  </p>
                  {isCOD ? (
                    <div className="flex items-center gap-3">
                      <PaymentBrandIcon brandOrMethod="cash_on_delivery" className="h-6 w-9" />
                      <div>
                        <p className="text-sm text-gray-900 font-semibold">
                          Cash on Delivery
                        </p>
                        <p className="text-xs text-gray-500">
                          Pay ৳{finalTotal.toFixed(2)} in cash to the rider on arrival
                        </p>
                      </div>
                    </div>
                  ) : selectedPm ? (
                    <div className="flex items-center gap-3">
                      <PaymentBrandIcon
                        brandOrMethod={selectedPm.provider || selectedPm.type}
                        className="h-6 w-9"
                      />
                      <div>
                        <p className="text-sm text-gray-900 font-semibold capitalize">
                          {selectedPm.type} · {selectedPm.provider}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          •••• {selectedPm.last4}
                          {selectedPm.expiryMonth && selectedPm.expiryYear
                            ? ` · Exp ${String(selectedPm.expiryMonth).padStart(2, '0')}/${selectedPm.expiryYear}`
                            : ''}
                        </p>
                      </div>
                    </div>
                  ) : activePaymentMethod === 'card' ? (
                    <div className="flex items-center gap-3">
                      <PaymentBrandIcon
                        brandOrMethod={detectCardBrand(cardData.cardNumber)}
                        className="h-6 w-9"
                      />
                      <div>
                        <p className="text-sm text-gray-900 font-semibold">
                          {cardData.cardHolder || 'Credit / Debit Card'}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          •••• •••• •••• {cardData.cardNumber.replace(/\s+/g, '').slice(-4)}
                          {cardData.expiry ? ` · Exp ${cardData.expiry}` : ''}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <PaymentBrandIcon
                        brandOrMethod={activePaymentMethod}
                        className="h-6 w-9"
                      />
                      <div>
                        <p className="text-sm text-gray-900 font-semibold capitalize">
                          {activePaymentMethod} Account
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {walletData.walletNumber}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Items grouped by restaurant */}
                {itemsByRestaurant.map((group) => (
                  <Card key={group.restaurantId} className="p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                      <Store className="h-4 w-4 text-orange-500" />
                      <p className="font-semibold text-sm text-gray-800">
                        {group.restaurantName}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div
                          key={item.itemKey || item.menuItemId}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-700">
                            {item.quantity}× {item.name}
                          </span>
                          <span className="font-medium">
                            ৳
                            {(
                              (item.price +
                                item.variants.reduce((s, v) => s + v.price, 0) +
                                item.addons.reduce((s, a) => s + a.price, 0)) *
                              item.quantity
                            ).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-100 text-xs text-gray-500 flex justify-between">
                      <span>Delivery fee</span>
                      <span>৳{group.deliveryFee.toFixed(2)}</span>
                    </div>
                  </Card>
                ))}

                {/* Multi-restaurant disclaimers */}
                {isMultiRestaurant && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <Truck className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800">
                        <strong>Multiple delivery fees:</strong> Each restaurant
                        has its own delivery fee (৳50 each). You will pay{' '}
                        <strong>৳{deliveryFee.toFixed(2)}</strong> in delivery
                        fees total.
                      </p>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800">
                        <strong>Different ETAs:</strong> Each restaurant has its
                        own preparation time. Items may arrive at different
                        times.
                      </p>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800">
                        <strong>Food quality:</strong> Food picked up first may
                        get cold while waiting for other restaurants. We
                        recommend ordering from restaurants with similar prep
                        times.
                      </p>
                    </div>
                    <label className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={disclaimerAccepted}
                        onChange={(e) =>
                          setDisclaimerAccepted(e.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-orange-900">
                        I understand that ordering from multiple restaurants may
                        result in separate delivery fees, different arrival
                        times, and that the first-picked-up food may not be at
                        optimal temperature.
                      </span>
                    </label>
                  </div>
                )}

                {isCOD && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <Banknote className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                      Please have <strong>৳{total.toFixed(2)}</strong> in cash
                      ready for your rider{isMultiRestaurant ? 's' : ''}.
                    </p>
                  </div>
                )}

                {promoCode && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Coupon applied:{' '}
                    <span className="font-medium">{promoCode}</span>
                  </p>
                )}

                {orderError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium">{orderError}</p>
                      {orderFieldErrors.length > 0 && (
                        <ul className="mt-1 list-disc list-inside space-y-0.5">
                          {orderFieldErrors.map((msg, i) => (
                            <li key={i}>{msg}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {advanceError && effectiveStep !== 'review' && (
              <p className="mt-4 text-sm text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {advanceError}
              </p>
            )}

            <div className="flex justify-between mt-6">
              <Button
                variant="ghost"
                onClick={
                  effectiveStep === 'delivery-address'
                    ? () => navigate('/cart')
                    : goBack
                }
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {effectiveStep === 'delivery-address' ? 'Back to Cart' : 'Back'}
              </Button>
              {effectiveStep !== 'review' ? (
                <Button
                  className="bg-orange-500 hover:bg-orange-600 font-semibold"
                  onClick={goNext}
                  disabled={
                    effectiveStep === 'delivery-address'
                      ? !selectedAddress
                      : !isPaymentValid
                  }
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="bg-orange-500 hover:bg-orange-600 font-semibold"
                  onClick={placeOrder}
                  disabled={placing || (isMultiRestaurant && !disclaimerAccepted)}
                >
                  {placing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isCOD ? 'Placing Order…' : 'Preparing Payment…'}
                    </>
                  ) : (
                    <>
                      {isCOD ? 'Place Order' : 'Place Order & Pay'}{' '}
                      {isMultiRestaurant ? 's' : ''} · ৳{finalTotal.toFixed(2)}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-5 sticky top-24">
              <h3 className="font-bold text-lg text-gray-900 mb-4">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>৳{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (5%)</span>
                  <span>৳{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span>
                    ৳{deliveryFee.toFixed(2)}
                    {isMultiRestaurant && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({itemsByRestaurant.length}×)
                      </span>
                    )}
                  </span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Rider Tip</span>
                    <span>৳{tipAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>৳{finalTotal.toFixed(2)}</span>
                </div>

                {/* Rider Tip Selection */}
                <div className="pt-3 border-t mt-3 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
                    <span>Add Rider Tip</span>
                    <span className="text-orange-600 font-bold">
                      {tipAmount > 0 ? `৳${tipAmount.toFixed(2)}` : 'Optional'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 20, 50, 100].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipAmount(t)}
                        className={`py-1 rounded-md text-xs font-semibold border transition-all ${
                          tipAmount === t
                            ? 'border-orange-500 bg-orange-50 text-orange-600 font-bold'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {t === 0 ? 'None' : `৳${t}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>

      {createdOrder && (
        <UnifiedPaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          orderId={createdOrder._id}
          amount={finalTotal}
          purpose="order_payment"
          defaultMethod={activePaymentMethod}
          initialCardData={activePaymentMethod === 'card' ? cardData : undefined}
          initialWalletData={
            activePaymentMethod === 'bkash' ||
            activePaymentMethod === 'nagad' ||
            activePaymentMethod === 'rocket' ||
            activePaymentMethod === 'upay'
              ? walletData
              : undefined
          }
          autoInitiate={true}
          showWalletOption={false}
          showCodOption={false}
          title={`Verify Payment for Order #${createdOrder.orderNumber || ''}`}
          description="Verification OTP has been sent to your phone/console."
          onSuccess={() => {
            clearCart();
            toast.success('Payment Verified!', {
              description: `Order ${createdOrder.orderNumber} confirmed and paid.`,
            });
            navigate(`/orders/${createdOrder._id}`);
          }}
          onCancel={() => {
            clearCart();
            toast.info('Order placed with payment pending', {
              description: 'You can complete payment anytime from order details.',
            });
            navigate(`/orders/${createdOrder._id}?pay=retry`);
          }}
        />
      )}
    </div>
  );
};

export default CheckoutPage;
