/**
 * CartPage – displays cart items with quantity controls and order summary.
 */
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowRight,
    ChevronLeft,
    MessageSquare,
    Minus,
    Plus,
    ShoppingBag,
    ShoppingCart,
    Store,
    Tag,
    Trash2,
    Truck,
} from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { foodFallbackSVG } from "@/utils/fallbackImages";

const FREE_DELIVERY_THRESHOLD = 500;

const CartPage: React.FC = () => {
  const {
    items,
    restaurantId,
    restaurantName,
    itemCount,
    subtotal,
    tax,
    deliveryFee,
    total,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");

  const handleRemove = (itemKey: string) => {
    setRemovingId(itemKey);
    setTimeout(() => {
      removeItem(itemKey);
      setRemovingId(null);
    }, 250);
  };

  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const freeDeliveryProgress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);
  const qualifiesForFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;

  /* ── Empty State ────────────────────────────────────────────── */
  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 bg-gradient-to-b from-orange-50/40 to-transparent">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-sm"
        >
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-orange-100 rounded-full scale-150 opacity-40" />
            <div className="relative bg-white rounded-full p-6 shadow-md border border-orange-100">
              <ShoppingCart className="h-12 w-12 text-orange-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Looks like you haven't added anything yet. Explore our restaurants and find something delicious!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/restaurants">
              <Button className="bg-orange-500 hover:bg-orange-600 px-6 w-full sm:w-auto">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Browse Restaurants
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="px-6 w-full sm:w-auto">
                Go Home
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Cart ───────────────────────────────────────────────────── */
  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-gray-800"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs font-medium"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear all
            </Button>
          </div>

          {/* Restaurant Banner */}
          {restaurantName && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5"
            >
              <Link
                to={restaurantId ? `/restaurants/${restaurantId}` : "/restaurants"}
                className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:border-orange-200 transition-all group w-fit"
              >
                <div className="bg-orange-100 rounded-lg p-1.5">
                  <Store className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Ordering from</p>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">
                    {restaurantName}
                  </p>
                </div>
                <ChevronLeft className="h-4 w-4 text-gray-400 ml-2 rotate-180 group-hover:text-orange-500 transition-colors" />
              </Link>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ── Items Column ─────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-3">
              <AnimatePresence mode="popLayout">
                {items.map((item, idx) => {
                  const itemKey = item.itemKey || item.menuItemId;
                  const lineTotal = item.price * item.quantity;
                  return (
                    <motion.div
                      key={itemKey}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{
                        opacity: removingId === itemKey ? 0.3 : 1,
                        y: 0,
                        scale: removingId === itemKey ? 0.98 : 1,
                      }}
                      exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.22, delay: idx * 0.03 }}
                    >
                      <Card className="overflow-hidden bg-white border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-stretch">
                          {/* Image */}
                          <div className="w-24 sm:w-28 flex-shrink-0">
                            <img
                              src={item.image || foodFallbackSVG}
                              alt={item.name}
                              className="h-full w-full object-cover"
                              style={{ minHeight: "96px" }}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                                  {item.name}
                                </h3>
                                <button
                                  onClick={() => handleRemove(itemKey)}
                                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 p-0.5"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {(item.variants.length > 0 || item.addons.length > 0) && (
                                <div className="mt-1 space-y-0.5">
                                  {item.variants.length > 0 && (
                                    <p className="text-xs text-gray-400">
                                      {item.variants.map((v) => v.name).join(", ")}
                                    </p>
                                  )}
                                  {item.addons.length > 0 && (
                                    <p className="text-xs text-gray-400">
                                      +{item.addons.map((a) => a.name).join(", ")}
                                    </p>
                                  )}
                                </div>
                              )}

                              {item.specialInstructions && (
                                <div className="flex items-start gap-1 mt-1.5">
                                  <MessageSquare className="h-3 w-3 text-gray-300 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-gray-400 italic leading-snug">
                                    {item.specialInstructions}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Price + Qty row */}
                            <div className="flex items-center justify-between mt-3">
                              <div>
                                <p className="text-xs text-gray-400">৳{item.price.toFixed(0)} each</p>
                                <p className="text-sm font-bold text-gray-900">
                                  ৳{lineTotal.toFixed(2)}
                                </p>
                              </div>

                              {/* Quantity stepper */}
                              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-1 py-1">
                                <button
                                  className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-orange-100 hover:text-orange-600 transition-colors disabled:opacity-40"
                                  onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-6 text-center text-sm font-semibold text-gray-800">
                                  {item.quantity}
                                </span>
                                <button
                                  className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-orange-100 hover:text-orange-600 transition-colors"
                                  onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Add More Items */}
              <Link
                to={restaurantId ? `/restaurants/${restaurantId}` : "/restaurants"}
                className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium px-1 py-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add more items
              </Link>
            </div>

            {/* ── Summary Column ───────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 space-y-4">
                {/* Free Delivery Progress */}
                <Card className="p-4 bg-white border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className={`h-4 w-4 ${qualifiesForFreeDelivery ? "text-green-500" : "text-orange-500"}`} />
                    {qualifiesForFreeDelivery ? (
                      <p className="text-sm font-medium text-green-700">
                        🎉 You've unlocked free delivery!
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Add{" "}
                        <span className="font-semibold text-orange-600">
                          ৳{amountToFreeDelivery.toFixed(0)}
                        </span>{" "}
                        more for free delivery
                      </p>
                    )}
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${qualifiesForFreeDelivery ? "bg-green-500" : "bg-orange-400"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${freeDeliveryProgress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </Card>

                {/* Promo Code */}
                <Card className="p-4 bg-white border-gray-100">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2.5">
                    <Tag className="h-4 w-4 text-orange-500" />
                    Promo Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 placeholder:text-gray-300 font-mono tracking-widest"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-200 text-orange-600 hover:bg-orange-50 font-medium"
                      disabled={!promoCode}
                    >
                      Apply
                    </Button>
                  </div>
                </Card>

                {/* Order Summary */}
                <Card className="p-5 bg-white border-gray-100">
                  <h3 className="font-bold text-base text-gray-900 mb-4">
                    Order Summary
                  </h3>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                      <span className="font-medium text-gray-800">৳{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Tax (5%)</span>
                      <span className="font-medium text-gray-800">৳{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Delivery Fee</span>
                      {qualifiesForFreeDelivery ? (
                        <span className="font-medium text-green-600 flex items-center gap-1">
                          <span className="line-through text-gray-400 text-xs">৳{deliveryFee.toFixed(0)}</span>
                          Free
                        </span>
                      ) : (
                        <span className="font-medium text-gray-800">৳{deliveryFee.toFixed(2)}</span>
                      )}
                    </div>

                    <div className="border-t border-dashed border-gray-200 pt-3 mt-1 flex justify-between">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-bold text-lg text-orange-600">
                        ৳{(qualifiesForFreeDelivery ? total - deliveryFee : total).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-5 bg-orange-500 hover:bg-orange-600 shadow-sm shadow-orange-200 font-semibold h-11 text-sm"
                    onClick={() =>
                      navigate(isAuthenticated ? "/checkout" : "/login")
                    }
                  >
                    {isAuthenticated ? "Proceed to Checkout" : "Login to Order"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <p className="text-center text-xs text-gray-400 mt-3">
                    Secure checkout · No hidden fees
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CartPage;
