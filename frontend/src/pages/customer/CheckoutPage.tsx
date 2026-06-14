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
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  // Inline message shown when a "Continue" requirement isn't met.
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  // Server error(s) from the place-order call, surfaced inline on the review step.
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderFieldErrors, setOrderFieldErrors] = useState<string[]>([]);

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

  /**
   * The furthest step the current selections actually permit. This is the
   * single source of truth for navigation: it is derived purely from state, so
   * it can't be bypassed by editing the `?step=` URL.
   *   - `payment`/`review` require a selected delivery address.
   *   - `review` additionally requires a selected payment method.
   */
  const maxAllowedStep: Step = useMemo(() => {
    if (!selectedAddress) return 'delivery-address';
    if (!selectedPayment) return 'payment';
    return 'review';
  }, [selectedAddress, selectedPayment]);

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
          : 'Please select a payment method to continue.',
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

  const selectedAddr = addresses.find((a) => a._id === selectedAddress);
  const isCOD = selectedPayment === COD_PAYMENT_ID;
  const selectedPm = isCOD
    ? null
    : paymentMethods.find((p) => p._id === selectedPayment);

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
      if (!selectedPayment) {
        const msg = 'Please select a payment method to continue.';
        setAdvanceError(msg);
        toast.error('Select Payment', { description: msg });
        return;
      }
      setAdvanceError(null);
      setStep('review');
    }
  };

  const goBack = () => {
    setAdvanceError(null);
    if (effectiveStep === 'payment') setStep('delivery-address');
    else if (effectiveStep === 'review') setStep('payment');
  };

  const placeOrder = useCallback(async () => {
    if (!selectedAddr || !selectedPayment) return;

    const paymentMethodValue = isCOD
      ? 'cash_on_delivery'
      : `${selectedPm!.type} - ${selectedPm!.provider} ****${selectedPm!.last4}`;

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
      });
    } catch (err) {
      // Surface the specific server message rather than a vague one.
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
      clearCart();
      const firstOrder = res.data.orders[0];
      const orderCount = res.data.orders.length;

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
      // Service returned the error body directly (not thrown). Pull out the
      // specific server message and any field-level errors.
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
    selectedPayment,
    isCOD,
    selectedPm,
    promoCode,
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
                className="space-y-3"
              >
                <h2 className="text-lg font-semibold mb-3">
                  Select Payment Method
                </h2>

                <Card
                  className={`p-4 cursor-pointer border-2 transition-colors ${
                    selectedPayment === COD_PAYMENT_ID
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-transparent hover:border-gray-200'
                  }`}
                  onClick={() => {
                    setSelectedPayment(COD_PAYMENT_ID);
                    setAdvanceError(null);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Banknote className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Cash on Delivery</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Pay in cash when your order arrives. Please have the
                        exact amount ready.
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="flex items-center justify-between mt-4 mb-1">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Saved cards &amp; wallets
                  </p>
                  <a
                    href="/profile?tab=payment"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add payment method
                  </a>
                </div>
                {paymentMethods.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">
                    No saved cards or wallets. You can add one via the link
                    above or pay cash on delivery.
                  </p>
                ) : (
                  paymentMethods.map((pm) => (
                    <Card
                      key={pm._id}
                      className={`p-4 cursor-pointer border-2 transition-colors ${
                        selectedPayment === pm._id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-transparent hover:border-gray-200'
                      }`}
                      onClick={() => {
                        setSelectedPayment(pm._id);
                        setAdvanceError(null);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-orange-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium capitalize">
                            {pm.type} – {pm.provider}
                            {pm.isDefault && (
                              <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            ****{pm.last4}
                            {pm.expiryMonth && pm.expiryYear
                              ? ` · Exp ${String(pm.expiryMonth).padStart(2, '0')}/${pm.expiryYear}`
                              : ''}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
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

                {selectedPayment && (
                  <Card className="p-4">
                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">
                      Payment
                    </p>
                    {isCOD ? (
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-orange-500" />
                        <p className="text-sm text-gray-800 font-medium">
                          Cash on Delivery
                        </p>
                      </div>
                    ) : selectedPm ? (
                      <p className="text-sm text-gray-800 capitalize">
                        {selectedPm.type} – {selectedPm.provider} ****
                        {selectedPm.last4}
                      </p>
                    ) : null}
                  </Card>
                )}

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
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={goNext}
                  disabled={
                    (effectiveStep === 'delivery-address' && !selectedAddress) ||
                    (effectiveStep === 'payment' && !selectedPayment)
                  }
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={placeOrder}
                  disabled={placing || (isMultiRestaurant && !disclaimerAccepted)}
                >
                  {placing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Placing…
                    </>
                  ) : (
                    <>
                      Place Order{isMultiRestaurant ? 's' : ''} · ৳
                      {total.toFixed(2)}
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
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>৳{total.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CheckoutPage;
