import { AddressDialog } from '@/components/AddressDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useBlockingLoader } from '@/contexts/LoadingContext';
import { extractApiError, getErrorMessage, getFieldErrors } from '@/lib/formErrors';
import { toast } from '@/lib/toast';
import orderService from '@/services/orderService';
import type { PaymentMethod, UserAddress } from '@/services/userService';
import userService from '@/services/userService';
import deliveryService, {
  type DeliveryQuoteResult,
} from '@/services/deliveryService';
import LocationPicker, {
  type LocationPickerValue,
} from '@/components/location/LocationPicker';
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const { run: runBlocking } = useBlockingLoader();
  const {
    items,
    subtotal,
    tax,
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
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [activePaymentMethod, setActivePaymentMethod] = useState<SupportedPaymentMethod>('bkash');
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

  // Dynamic delivery fee & routing state
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuoteResult | null>(null);
  const [isQuoting, setIsQuoting] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteChangedAlert, setQuoteChangedAlert] = useState<{ oldFee: number; newFee: number } | null>(null);
  const [pinningAddress, setPinningAddress] = useState<UserAddress | null>(null);
  const [pinAddressModalOpen, setPinAddressModalOpen] = useState(false);
  const [tempCoords, setTempCoords] = useState<LocationPickerValue | null>(null);
  const [isSavingCoords, setIsSavingCoords] = useState(false);

  // Payment gateway modal state for online payments
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const isOrderSubmitted = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (items.length === 0 && !isOrderSubmitted.current && !createdOrder && !paymentModalOpen) {
      navigate('/cart');
    }
  }, [isAuthenticated, items.length, navigate, createdOrder, paymentModalOpen]);

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
      if (pmRes.success && pmRes.data && pmRes.data.paymentMethods && pmRes.data.paymentMethods.length > 0) {
        setPaymentMethods(pmRes.data.paymentMethods);
        const defaultPm = pmRes.data.paymentMethods.find((p) => p.isDefault) || pmRes.data.paymentMethods[0];
        if (defaultPm) {
          setSelectedPayment(defaultPm._id);
          setActivePaymentMethod(
            (defaultPm.provider.toLowerCase() as SupportedPaymentMethod) || 'card',
          );
        }
      }
      setLoading(false);
    };
    loadData();
  }, [isAuthenticated]);

  const selectedAddr = addresses.find((a) => a._id === selectedAddress);
  const addressHasCoordinates = Boolean(
    selectedAddr?.coordinates &&
    typeof selectedAddr.coordinates.latitude === 'number' &&
    typeof selectedAddr.coordinates.longitude === 'number' &&
    Number.isFinite(selectedAddr.coordinates.latitude) &&
    Number.isFinite(selectedAddr.coordinates.longitude) &&
    (selectedAddr.coordinates.latitude !== 0 || selectedAddr.coordinates.longitude !== 0),
  );

  // Re-quote delivery dynamically when address or items change
  useEffect(() => {
    if (!selectedAddr || !addressHasCoordinates || itemsByRestaurant.length === 0) {
      setDeliveryQuote(null);
      return;
    }

    let isMounted = true;
    const fetchQuote = async () => {
      setIsQuoting(true);
      setQuoteError(null);
      try {
        const res = await deliveryService.quoteDelivery(
          {
            latitude: selectedAddr.coordinates.latitude,
            longitude: selectedAddr.coordinates.longitude,
          },
          itemsByRestaurant.map((g) => ({
            restaurantId: g.restaurantId,
            itemsSubtotal: g.subtotal,
          })),
        );
        if (isMounted) {
          if (res.success && res.data) {
            setDeliveryQuote(res.data);
            const undeliverable = res.data.quotes.find((q) => !q.deliverable);
            if (undeliverable) {
              setQuoteError(
                undeliverable.reason === 'OUT_OF_RANGE'
                  ? `Restaurant "${undeliverable.restaurantName}" is too far for delivery (${undeliverable.distanceKm.toFixed(1)} km). Max allowed is 15 km.`
                  : `Restaurant "${undeliverable.restaurantName}" cannot deliver to this address (${undeliverable.reason || 'unavailable'}).`,
              );
            }
          } else {
            setQuoteError(res.message || 'Unable to calculate delivery distance.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setQuoteError(err?.message || 'Unable to calculate delivery distance.');
        }
      } finally {
        if (isMounted) setIsQuoting(false);
      }
    };

    fetchQuote();
    return () => {
      isMounted = false;
    };
  }, [selectedAddr, addressHasCoordinates, itemsByRestaurant]);

  const handleSavePinnedCoordinates = async () => {
    if (!pinningAddress || !tempCoords) return;
    setIsSavingCoords(true);
    try {
      const res = await userService.updateAddress(pinningAddress._id, {
        type: pinningAddress.type,
        street: tempCoords.street || pinningAddress.street,
        apartment: pinningAddress.apartment,
        district: tempCoords.district || pinningAddress.district,
        area: tempCoords.area || pinningAddress.area,
        coordinates: {
          latitude: tempCoords.latitude,
          longitude: tempCoords.longitude,
        },
        isDefault: pinningAddress.isDefault,
      });
      if (res.success) {
        toast.success("Location pinned", {
          description: "Delivery address coordinates updated successfully.",
        });
        setPinAddressModalOpen(false);
        setPinningAddress(null);
        setTempCoords(null);
        await loadAddresses();
      } else {
        toast.error("Failed to update location", {
          description: res.message,
        });
      }
    } catch {
      toast.error("Failed to update location");
    } finally {
      setIsSavingCoords(false);
    }
  };

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
    if (!selectedAddress || !addressHasCoordinates || !!quoteError) return 'delivery-address';
    if (!isPaymentValid) return 'payment';
    return 'review';
  }, [selectedAddress, addressHasCoordinates, quoteError, isPaymentValid]);

  // The earliest step the user still needs to complete (== maxAllowedStep here,
  // since each step gates the next), used as the redirect target.
  const requestedIndex = VALID_STEPS.indexOf(step);
  const maxAllowedIndex = VALID_STEPS.indexOf(maxAllowedStep);
  const stepExceedsAllowed = requestedIndex > maxAllowedIndex;

  // Hard guard: runs on EVERY render (incl. direct URL access / reload).
  useEffect(() => {
    if (!isAuthenticated || loading) return;
    if (stepExceedsAllowed) {
      setSearchParams({ step: maxAllowedStep }, { replace: true });
      toast.info(
        maxAllowedStep === 'delivery-address'
          ? (!addressHasCoordinates
              ? 'Please pin your address on the map to continue.'
              : quoteError || 'Please select a delivery address to continue.')
          : 'Please enter your payment details to continue.',
      );
    }
  }, [
    isAuthenticated,
    loading,
    stepExceedsAllowed,
    maxAllowedStep,
    addressHasCoordinates,
    quoteError,
    setSearchParams,
  ]);

  // While the guard's redirect is pending, render the step the state allows so
  // we never momentarily show a step the user hasn't earned.
  const effectiveStep: Step = stepExceedsAllowed ? maxAllowedStep : step;

  const effectiveDeliveryFee = deliveryQuote ? deliveryQuote.totals.deliveryFeeCharged : 0;
  const deliveryFeeOriginal = deliveryQuote ? deliveryQuote.totals.deliveryFeeOriginal : 0;
  const deliveryFeeDiscount = deliveryQuote ? deliveryQuote.totals.deliveryFeeDiscount : 0;
  const finalTotal = Math.round((subtotal + tax + effectiveDeliveryFee + tipAmount) * 100) / 100;

  const stepIndex = STEPS.findIndex((s) => s.key === effectiveStep);

  const goNext = () => {
    if (effectiveStep === 'delivery-address') {
      if (!selectedAddress) {
        const msg = 'Please select a delivery address to continue.';
        setAdvanceError(msg);
        toast.error('Select Address', { description: msg });
        return;
      }
      if (!addressHasCoordinates) {
        const msg = 'Please pin this address on the map to calculate real delivery distance and fees.';
        setAdvanceError(msg);
        toast.error('Pin Location', { description: msg });
        return;
      }
      if (quoteError) {
        setAdvanceError(quoteError);
        toast.error('Delivery Unavailable', { description: quoteError });
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
    setQuoteChangedAlert(null);
    setPlacing(true);
    isOrderSubmitted.current = true;
    let res;
    try {
      res = await runBlocking(
        () =>
          orderService.createOrderFromCart({
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
            quoteSignature: deliveryQuote?.quoteId,
            expectedChargedFee: deliveryQuote?.totals.deliveryFeeCharged,
          }),
        {
          message: 'Placing your order…',
          slowMessage: 'Connecting with the kitchen… please do not close or refresh.',
          allowCancel: false,
        },
      );
    } catch (err: any) {
      isOrderSubmitted.current = false;
      setPlacing(false);
      const code = err?.response?.data?.code || (err as any)?.code;
      const freshQuote = err?.response?.data?.quote || (err as any)?.quote;
      if (code === 'DELIVERY_QUOTE_CHANGED' && freshQuote) {
        setDeliveryQuote(freshQuote);
        setQuoteChangedAlert({
          oldFee: deliveryQuote?.totals.deliveryFeeCharged ?? 0,
          newFee: freshQuote.totals.deliveryFeeCharged,
        });
        toast.warning('Delivery Fee Updated', {
          description: `Delivery fee has changed to ৳${freshQuote.totals.deliveryFeeCharged}. Please review the updated fee and click Place Order to confirm.`,
        });
        return;
      }
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
      isOrderSubmitted.current = false;
      const code = (res as any)?.code;
      const freshQuote = (res as any)?.quote;
      if (code === 'DELIVERY_QUOTE_CHANGED' && freshQuote) {
        setDeliveryQuote(freshQuote);
        setQuoteChangedAlert({
          oldFee: deliveryQuote?.totals.deliveryFeeCharged ?? 0,
          newFee: freshQuote.totals.deliveryFeeCharged,
        });
        toast.warning('Delivery Fee Updated', {
          description: `Delivery fee has changed to ৳${freshQuote.totals.deliveryFeeCharged}. Please review the updated fee and click Place Order to confirm.`,
        });
        return;
      }
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
    runBlocking,
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
                  addresses.map((addr) => {
                    const hasCoords = Boolean(
                      addr.coordinates &&
                      typeof addr.coordinates.latitude === 'number' &&
                      typeof addr.coordinates.longitude === 'number' &&
                      Number.isFinite(addr.coordinates.latitude) &&
                      Number.isFinite(addr.coordinates.longitude) &&
                      (addr.coordinates.latitude !== 0 || addr.coordinates.longitude !== 0),
                    );
                    const isSelected = selectedAddress === addr._id;

                    return (
                      <Card
                        key={addr._id}
                        className={`p-4 cursor-pointer border-2 transition-colors ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-transparent hover:border-gray-200'
                        }`}
                        onClick={() => {
                          setSelectedAddress(addr._id);
                          setAdvanceError(null);
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium capitalize flex items-center gap-1.5">
                                {addr.type}
                                {addr.isDefault && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-normal">
                                    Default
                                  </span>
                                )}
                                {!hasCoords && (
                                  <span className="text-[11px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-normal">
                                    No GPS Pin
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

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-100/50 h-8 px-2 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPinningAddress(addr);
                              setTempCoords(null);
                              setPinAddressModalOpen(true);
                            }}
                          >
                            <MapPin className="w-3.5 h-3.5 mr-1" />
                            {hasCoords ? "Edit Pin" : "Pin Location"}
                          </Button>
                        </div>

                        {isSelected && !hasCoords && (
                          <div className="mt-3 p-2.5 bg-amber-100/70 border border-amber-300 rounded-md text-xs text-amber-900 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                              Exact location required to calculate road distance and fee.
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-amber-700 hover:bg-amber-800 text-white text-xs h-7 px-2.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPinningAddress(addr);
                                setTempCoords(null);
                                setPinAddressModalOpen(true);
                              }}
                            >
                              Pin on Map
                            </Button>
                          </div>
                        )}

                        {isSelected && hasCoords && quoteError && (
                          <div className="mt-3 p-2.5 bg-red-100 border border-red-300 rounded-md text-xs text-red-900 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{quoteError}</span>
                          </div>
                        )}
                      </Card>
                    );
                  })
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

                {/* Dialog to Pin Location on Map for Existing Address */}
                <Dialog open={pinAddressModalOpen} onOpenChange={setPinAddressModalOpen}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                        <MapPin className="w-5 h-5 text-primary" />
                        Pin Delivery Location
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        Drag the pin or click on the map to mark the exact location for{" "}
                        <strong className="text-foreground">
                          {pinningAddress?.street}, {pinningAddress?.area}
                        </strong>
                        . This calculates accurate road distance with OpenStreetMap.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                      <LocationPicker
                        value={
                          tempCoords || (pinningAddress?.coordinates?.latitude ? {
                            latitude: pinningAddress.coordinates.latitude,
                            longitude: pinningAddress.coordinates.longitude,
                          } : undefined)
                        }
                        onChange={(val) => setTempCoords(val)}
                        mapHeight="260px"
                      />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSavingCoords}
                        onClick={() => {
                          setPinAddressModalOpen(false);
                          setPinningAddress(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSavingCoords || !tempCoords}
                        onClick={handleSavePinnedCoordinates}
                      >
                        {isSavingCoords && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Pinned Location
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </motion.div>
            )}

            {effectiveStep === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                {paymentMethods.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Saved Payment Methods
                        </h2>
                        <a
                          href="/profile?tab=payment"
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 font-medium"
                        >
                          <Plus className="h-3 w-3" />
                          Manage in profile
                        </a>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Choose one of your saved methods or add a new one. Each transaction is protected by OTP verification.
                      </p>

                      <div className="space-y-2">
                        {paymentMethods.map((pm) => {
                          const isSelected = selectedPayment === pm._id;
                          return (
                            <Card
                              key={pm._id}
                              className={`p-3.5 cursor-pointer border-2 transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-50/70 shadow-xs'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                              onClick={() => {
                                setSelectedPayment(pm._id);
                                setActivePaymentMethod(
                                  (pm.provider.toLowerCase() as SupportedPaymentMethod) || 'card',
                                );
                                setAdvanceError(null);
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                    isSelected
                                      ? 'border-orange-600 bg-orange-600'
                                      : 'border-gray-400'
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                  )}
                                </div>
                                <PaymentBrandIcon
                                  brandOrMethod={pm.provider || pm.type}
                                  className="h-6 w-9"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold capitalize text-sm text-gray-900">
                                      {pm.provider}
                                    </span>
                                    {pm.isDefault && (
                                      <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 font-mono">
                                    •••• {pm.last4}
                                    {pm.expiryMonth && pm.expiryYear
                                      ? ` · Exp ${String(pm.expiryMonth).padStart(2, '0')}/${pm.expiryYear}`
                                      : ''}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Lock className="h-2.5 w-2.5" /> OTP Protected
                              </span>
                            </Card>
                          );
                        })}

                        {/* Option to select another method */}
                        <Card
                          className={`p-3.5 cursor-pointer border-2 transition-all flex items-center gap-3 ${
                            selectedPayment === null || selectedPayment === COD_PAYMENT_ID
                              ? 'border-orange-500 bg-orange-50/50'
                              : 'border-dashed border-gray-300 hover:border-gray-400 bg-gray-50/60'
                          }`}
                          onClick={() => {
                            if (selectedPayment !== null && selectedPayment !== COD_PAYMENT_ID) {
                              setSelectedPayment(null);
                              setActivePaymentMethod('card');
                              setAdvanceError(null);
                            }
                          }}
                        >
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              selectedPayment === null || selectedPayment === COD_PAYMENT_ID
                                ? 'border-orange-600 bg-orange-600'
                                : 'border-gray-400'
                            }`}
                          >
                            {(selectedPayment === null || selectedPayment === COD_PAYMENT_ID) && (
                              <div className="h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium text-gray-900">
                              Use another method (Card, Mobile Wallet, or Cash on Delivery)
                            </span>
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* New Method Selector & Forms */}
                    {(selectedPayment === null || selectedPayment === COD_PAYMENT_ID) && (
                      <div className="pt-3 border-t border-gray-100 space-y-3">
                        <PaymentMethodSelector
                          selectedMethod={activePaymentMethod}
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

                        {activePaymentMethod === 'card' && (
                          <Card className="p-4 border border-orange-100 bg-white shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900">
                                  Card Details
                                </h3>
                                <p className="text-xs text-gray-500">
                                  Enter card details. Will be securely saved for future checkouts.
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

                        {(activePaymentMethod === 'bkash' ||
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
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h2 className="text-lg font-semibold mb-1">
                      Select Payment Method
                    </h2>
                    <p className="text-xs text-gray-500 mb-3">
                      Choose from mobile wallets, cards, or pay cash on arrival.
                    </p>
                    <PaymentMethodSelector
                      selectedMethod={activePaymentMethod}
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

                    {/* Inline Detail Forms for New Method Selection */}
                    {activePaymentMethod === 'card' && (
                      <Card className="p-4 border border-orange-100 bg-white shadow-xs space-y-3 mt-3">
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

                    {(activePaymentMethod === 'bkash' ||
                      activePaymentMethod === 'nagad' ||
                      activePaymentMethod === 'rocket' ||
                      activePaymentMethod === 'upay') && (
                      <Card className="p-4 border border-orange-100 bg-white shadow-xs space-y-3 mt-3">
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
                      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 space-y-1 mt-3">
                        <div className="flex items-center gap-2 font-semibold text-amber-950">
                          <Banknote className="h-4 w-4 text-amber-600" />
                          Cash on Delivery Selected
                        </div>
                        <p>
                          Please keep <strong>৳{finalTotal.toFixed(2)}</strong> in cash ready for our delivery partner upon arrival.
                        </p>
                      </div>
                    )}
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
                {itemsByRestaurant.map((group) => {
                  const quoteMatch = deliveryQuote?.quotes.find((q) => q.restaurantId === group.restaurantId);
                  return (
                    <Card key={group.restaurantId} className="p-4">
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-orange-500" />
                          <p className="font-semibold text-sm text-gray-800">
                            {group.restaurantName}
                          </p>
                        </div>
                        {quoteMatch && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{quoteMatch.distanceKm.toFixed(1)} km</span>
                            <span>•</span>
                            <span>~{quoteMatch.durationMin} min</span>
                            {quoteMatch.isEstimate && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded">
                                est.
                              </span>
                            )}
                          </div>
                        )}
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
                      <div className="mt-2 pt-2 border-t border-dashed border-gray-100 text-xs text-gray-500 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span>Delivery fee</span>
                          {quoteMatch?.campaign && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                              {quoteMatch.campaign.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                          {quoteMatch && quoteMatch.feeDiscount > 0 && (
                            <span className="line-through text-gray-400">
                              ৳{quoteMatch.feeOriginal.toFixed(2)}
                            </span>
                          )}
                          <span className={quoteMatch && quoteMatch.feeCharged === 0 ? "text-emerald-600 font-semibold" : "text-gray-800"}>
                            {quoteMatch
                              ? quoteMatch.feeCharged === 0
                                ? 'FREE'
                                : `৳${quoteMatch.feeCharged.toFixed(2)}`
                              : `৳${group.deliveryFee.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {/* Multi-restaurant disclaimers */}
                {isMultiRestaurant && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <Truck className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800">
                        <strong>Multiple delivery fees:</strong> Each restaurant
                        has its own delivery fee based on road distance. You will pay{' '}
                        <strong>৳{effectiveDeliveryFee.toFixed(2)}</strong> in delivery
                        fees total across {itemsByRestaurant.length} orders.
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

                {quoteChangedAlert && (
                  <div className="flex items-start gap-2 p-3.5 rounded-lg bg-amber-50 border border-amber-300">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-900">
                      <p className="font-semibold">Delivery Fee Updated</p>
                      <p className="mt-0.5">
                        The delivery fee updated from ৳{quoteChangedAlert.oldFee.toFixed(2)} to <strong>৳{quoteChangedAlert.newFee.toFixed(2)}</strong> due to fresh road routing calculation. Please review your total and click Place Order to confirm.
                      </p>
                    </div>
                  </div>
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
                  <span className="flex items-center gap-1.5">
                    Delivery
                    {isQuoting && <Loader2 className="h-3 w-3 animate-spin text-orange-500" />}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    {deliveryFeeDiscount > 0 && (
                      <span className="line-through text-xs text-gray-400">
                        ৳{deliveryFeeOriginal.toFixed(2)}
                      </span>
                    )}
                    <span className={effectiveDeliveryFee === 0 && deliveryQuote ? "text-emerald-600 font-semibold" : "text-gray-900"}>
                      {effectiveDeliveryFee === 0 && deliveryQuote ? 'FREE' : `৳${effectiveDeliveryFee.toFixed(2)}`}
                    </span>
                    {isMultiRestaurant && (
                      <span className="text-xs text-gray-400">
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
          onOpenChange={(isOpen) => {
            setPaymentModalOpen(isOpen);
            if (!isOpen) {
              clearCart();
              navigate(`/orders/${createdOrder._id}?pay=retry`);
            }
          }}
          orderId={createdOrder._id}
          amount={finalTotal}
          purpose="order_payment"
          defaultMethod={selectedPm ? ((selectedPm.provider.toLowerCase() as SupportedPaymentMethod) || 'card') : activePaymentMethod}
          savedPaymentMethodId={selectedPm ? selectedPm._id : undefined}
          initialCardData={!selectedPm && activePaymentMethod === 'card' ? cardData : undefined}
          initialWalletData={
            !selectedPm &&
            (activePaymentMethod === 'bkash' ||
              activePaymentMethod === 'nagad' ||
              activePaymentMethod === 'rocket' ||
              activePaymentMethod === 'upay')
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
