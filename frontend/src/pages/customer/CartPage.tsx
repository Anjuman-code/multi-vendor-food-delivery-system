/**
 * CartPage – displays cart items with quantity controls and order summary.
 */
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import FoodItemCard from "@/components/ui/FoodItemCard";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  Trash2,
  Truck,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
    promoCode,
    setPromoCode,
    clearPromoCode,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [promoDraft, setPromoDraft] = useState(promoCode);

  useEffect(() => {
    setPromoDraft(promoCode);
  }, [promoCode]);

  const canApplyPromo =
    promoDraft.trim().length > 0 &&
    promoDraft.trim().toUpperCase() !== promoCode;

  const handleApplyPromo = () => {
    if (!canApplyPromo) return;
    const normalized = promoDraft.trim().toUpperCase();
    setPromoCode(normalized);
    toast({
      title: "Promo code saved",
      description: `We'll apply ${normalized} at checkout.`,
    });
  };

  const handleClearPromo = () => {
    clearPromoCode();
    setPromoDraft("");
    toast({ title: "Promo code removed" });
  };

  const handleRemove = (itemKey: string) => {
    setRemovingId(itemKey);
    setTimeout(() => {
      removeItem(itemKey);
      setRemovingId(null);
    }, 250);
  };

  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const freeDeliveryProgress = Math.min(
    100,
    (subtotal / FREE_DELIVERY_THRESHOLD) * 100,
  );
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
            Looks like you haven't added anything yet. Explore our restaurants
            and find something delicious!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/restaurants">
              <Button className="bg-orange-500 hover:bg-orange-600 px-6 w-full sm:w-auto">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Browse Restaurants
              </Button>
            </Link>
            {isAuthenticated && (
              <Link to="/orders">
                <Button variant="outline" className="px-6 w-full sm:w-auto">
                  View Order History &rarr;
                </Button>
              </Link>
            )}
          </div>
          <Link
            to="/"
            className="inline-block mt-4 text-sm text-gray-500 hover:text-gray-700 font-medium hover:underline transition-colors"
          >
            Go Home
          </Link>
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
                to={
                  restaurantId ? `/restaurants/${restaurantId}` : "/restaurants"
                }
                className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:border-orange-200 transition-all group w-fit"
              >
                <div className="bg-orange-100 rounded-lg p-1.5">
                  <Store className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    Ordering from
                  </p>
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
                        <FoodItemCard
                          variant="cart"
                          item={{
                            id: itemKey,
                            name: item.name,
                            image: item.image,
                            price: item.price,
                            quantity: item.quantity,
                            variants: item.variants,
                            addons: item.addons,
                            specialInstructions: item.specialInstructions,
                            itemKey: itemKey,
                            lineTotal: lineTotal,
                          }}
                          onUpdateQuantity={(_, qty) =>
                            updateQuantity(itemKey, qty)
                          }
                          onRemove={(key) => handleRemove(key as string)}
                        />
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Add More Items */}
              <Link
                to={
                  restaurantId ? `/restaurants/${restaurantId}` : "/restaurants"
                }
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
                    <Truck
                      className={`h-4 w-4 ${qualifiesForFreeDelivery ? "text-green-500" : "text-orange-500"}`}
                    />
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
                      value={promoDraft}
                      onChange={(e) =>
                        setPromoDraft(e.target.value.toUpperCase())
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleApplyPromo();
                      }}
                      placeholder="Enter code"
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 placeholder:text-gray-300 font-mono tracking-widest"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-200 text-orange-600 hover:bg-orange-50 font-medium"
                      disabled={!canApplyPromo}
                      onClick={handleApplyPromo}
                    >
                      Apply
                    </Button>
                  </div>
                  {promoCode ? (
                    <>
                      <div className="mt-2 flex items-center justify-between text-xs text-green-700">
                        <span>
                          Applied:{" "}
                          <span className="font-semibold">{promoCode}</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                          onClick={handleClearPromo}
                        >
                          Remove
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Discount is calculated at checkout.
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-gray-400">
                      Discount is calculated at checkout.
                    </p>
                  )}
                </Card>

                {/* Order Summary */}
                <Card className="p-5 bg-white border-gray-100">
                  <h3 className="font-bold text-base text-gray-900 mb-4">
                    Order Summary
                  </h3>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>
                        Subtotal ({itemCount}{" "}
                        {itemCount === 1 ? "item" : "items"})
                      </span>
                      <span className="font-medium text-gray-800">
                        ৳{subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Tax (5%)</span>
                      <span className="font-medium text-gray-800">
                        ৳{tax.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Delivery Fee</span>
                      {qualifiesForFreeDelivery ? (
                        <span className="font-medium text-green-600 flex items-center gap-1">
                          <span className="line-through text-gray-400 text-xs">
                            ৳{deliveryFee.toFixed(0)}
                          </span>
                          Free
                        </span>
                      ) : (
                        <span className="font-medium text-gray-800">
                          ৳{deliveryFee.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="border-t border-dashed border-gray-200 pt-3 mt-1 flex justify-between">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-bold text-lg text-orange-600">
                        ৳
                        {(qualifiesForFreeDelivery
                          ? total - deliveryFee
                          : total
                        ).toFixed(2)}
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

                  {isAuthenticated && (
                    <Link
                      to="/orders"
                      className="block text-center text-xs text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors"
                    >
                      View Order History &rarr;
                    </Link>
                  )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CartPage;
