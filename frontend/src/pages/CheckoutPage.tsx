/**
 * CheckoutPage – multi-step checkout: address → payment → review → place order.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Tag,
  Loader2,
} from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useToast } from "../hooks/use-toast";
import userService from "../services/userService";
import orderService from "../services/orderService";
import type { UserAddress, PaymentMethod } from "../services/userService";

type Step = "address" | "payment" | "review";

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: "address", label: "Address", icon: <MapPin className="h-4 w-4" /> },
  {
    key: "payment",
    label: "Payment",
    icon: <CreditCard className="h-4 w-4" />,
  },
  { key: "review", label: "Review", icon: <CheckCircle className="h-4 w-4" /> },
];

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const {
    items,
    restaurantId,
    restaurantName,
    subtotal,
    tax,
    deliveryFee,
    total,
    clearCart,
  } = useCart();

  const [step, setStep] = useState<Step>("address");
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);

  // Redirect if cart is empty or not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (items.length === 0) {
      navigate("/cart");
    }
  }, [isAuthenticated, items.length, navigate]);

  // Load user data
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
  const selectedPm = paymentMethods.find((p) => p._id === selectedPayment);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const goNext = () => {
    if (step === "address") {
      if (!selectedAddress) {
        toast({
          title: "Select Address",
          description: "Please select a delivery address.",
          variant: "destructive",
        });
        return;
      }
      setStep("payment");
    } else if (step === "payment") {
      if (!selectedPayment) {
        toast({
          title: "Select Payment",
          description: "Please select a payment method.",
          variant: "destructive",
        });
        return;
      }
      setStep("review");
    }
  };

  const goBack = () => {
    if (step === "payment") setStep("address");
    else if (step === "review") setStep("payment");
  };

  const placeOrder = useCallback(async () => {
    if (!selectedAddr || !selectedPm || !restaurantId) return;

    const hasInvalidMenuIds = items.some(
      (item) => !/^[0-9a-fA-F]{24}$/.test(item.menuItemId),
    );
    if (hasInvalidMenuIds) {
      toast({
        title: "Demo item in cart",
        description:
          "Some cart items are from demo data and cannot be ordered. Please add items from a live restaurant menu.",
        variant: "destructive",
      });
      navigate("/restaurants");
      return;
    }

    setPlacing(true);
    const res = await orderService.createOrder({
      restaurantId,
      items: items.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        variants: i.variants,
        addons: i.addons,
        specialInstructions: i.specialInstructions,
      })),
      deliveryAddress: {
        street: selectedAddr.street,
        apartment: selectedAddr.apartment,
        city: selectedAddr.city,
        state: selectedAddr.state,
        zipCode: selectedAddr.zipCode,
        country: selectedAddr.country,
        coordinates: selectedAddr.coordinates,
      },
      paymentMethod: `${selectedPm.type} - ${selectedPm.provider} ****${selectedPm.last4}`,
      couponCode: couponCode || undefined,
    });
    setPlacing(false);

    if (res.success && res.data) {
      clearCart();
      toast({
        title: "Order Placed!",
        description: `Order ${res.data.order.orderNumber} confirmed.`,
      });
      navigate(`/orders/${res.data.order._id}`);
    } else {
      toast({
        title: "Order Failed",
        description: res.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  }, [
    selectedAddr,
    selectedPm,
    restaurantId,
    items,
    couponCode,
    clearCart,
    navigate,
    toast,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout</h1>
        {restaurantName && (
          <p className="text-sm text-gray-500 mb-6">
            Ordering from{" "}
            <span className="font-medium text-orange-600">
              {restaurantName}
            </span>
          </p>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.key}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  idx <= stepIndex
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${
                    idx < stepIndex ? "bg-orange-400" : "bg-gray-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            {step === "address" && (
              <motion.div
                key="address"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
                <h2 className="text-lg font-semibold mb-3">
                  Select Delivery Address
                </h2>
                {addresses.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-gray-500 mb-3">No addresses saved.</p>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/profile")}
                    >
                      Add Address
                    </Button>
                  </Card>
                ) : (
                  addresses.map((addr) => (
                    <Card
                      key={addr._id}
                      className={`p-4 cursor-pointer border-2 transition-colors ${
                        selectedAddress === addr._id
                          ? "border-orange-500 bg-orange-50"
                          : "border-transparent hover:border-gray-200"
                      }`}
                      onClick={() => setSelectedAddress(addr._id)}
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
                            {addr.apartment && `, ${addr.apartment}`},{" "}
                            {addr.city}, {addr.state} {addr.zipCode}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </motion.div>
            )}

            {step === "payment" && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
                <h2 className="text-lg font-semibold mb-3">
                  Select Payment Method
                </h2>
                {paymentMethods.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-gray-500 mb-3">
                      No payment methods saved.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/profile")}
                    >
                      Add Payment Method
                    </Button>
                  </Card>
                ) : (
                  paymentMethods.map((pm) => (
                    <Card
                      key={pm._id}
                      className={`p-4 cursor-pointer border-2 transition-colors ${
                        selectedPayment === pm._id
                          ? "border-orange-500 bg-orange-50"
                          : "border-transparent hover:border-gray-200"
                      }`}
                      onClick={() => setSelectedPayment(pm._id)}
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
                              ? ` · Exp ${String(pm.expiryMonth).padStart(2, "0")}/${pm.expiryYear}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}

                {/* Coupon */}
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Tag className="h-4 w-4" /> Promo Code
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) =>
                        setCouponCode(e.target.value.toUpperCase())
                      }
                      placeholder="Enter code"
                      className="flex-1"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold mb-3">Review Order</h2>

                {/* Delivery address summary */}
                {selectedAddr && (
                  <Card className="p-4">
                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">
                      Deliver To
                    </p>
                    <p className="text-sm text-gray-800">
                      {selectedAddr.street}
                      {selectedAddr.apartment &&
                        `, ${selectedAddr.apartment}`}, {selectedAddr.city},{" "}
                      {selectedAddr.state} {selectedAddr.zipCode}
                    </p>
                  </Card>
                )}

                {/* Payment summary */}
                {selectedPm && (
                  <Card className="p-4">
                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">
                      Payment
                    </p>
                    <p className="text-sm text-gray-800 capitalize">
                      {selectedPm.type} – {selectedPm.provider} ****
                      {selectedPm.last4}
                    </p>
                  </Card>
                )}

                {/* Items */}
                <Card className="p-4">
                  <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                    Items
                  </p>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.menuItemId}
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
                </Card>

                {couponCode && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Coupon applied:{" "}
                    <span className="font-medium">{couponCode}</span>
                  </p>
                )}
              </motion.div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                variant="ghost"
                onClick={step === "address" ? () => navigate("/cart") : goBack}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {step === "address" ? "Back to Cart" : "Back"}
              </Button>
              {step !== "review" ? (
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={goNext}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={placeOrder}
                  disabled={placing}
                >
                  {placing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Placing…
                    </>
                  ) : (
                    <>
                      Place Order · ৳{total.toFixed(2)}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Summary sidebar */}
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
                  <span>৳{deliveryFee.toFixed(2)}</span>
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
