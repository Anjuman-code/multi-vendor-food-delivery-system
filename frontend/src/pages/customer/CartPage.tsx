import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import FoodItemCard from "@/components/ui/FoodItemCard";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/lib/toast";
import { formatCurrency } from "@/utils/format";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  Plus,
  ShoppingCart,
  Store,
  Tag,
  Trash2,
  Truck,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import deliveryService, {
  type ActiveDeliveryCampaign,
} from "@/services/deliveryService";

const CartPage: React.FC = () => {
  const {
    items,
    itemCount,
    subtotal,
    tax,
    deliveryFee,
    deliveryFeeOriginal,
    deliveryFeeDiscount,
    deliveryQuote,
    total,
    promoCode,
    setPromoCode,
    clearPromoCode,
    updateQuantity,
    removeItem,
    clearCart,
    itemsByRestaurant,
  } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [promoDraft, setPromoDraft] = useState(promoCode);
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveDeliveryCampaign[]>([]);

  useEffect(() => {
    let isMounted = true;
    deliveryService.getActiveCampaigns().then((res) => {
      if (isMounted && res.success && res.data?.campaigns) {
        setActiveCampaigns(res.data.campaigns);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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
    toast.success("Promo code saved", {
      description: `We'll apply ${normalized} at checkout.`,
    });
  };

  const handleClearPromo = () => {
    clearPromoCode();
    setPromoDraft("");
    toast.success("Promo code removed");
  };

  const handleRemove = (itemKey: string) => {
    setRemovingId(itemKey);
    setTimeout(() => {
      removeItem(itemKey);
      setRemovingId(null);
    }, 250);
  };

  // Find relevant active campaigns for the restaurants in the cart
  const relevantCampaigns = useMemo(() => {
    const cartRestIds = itemsByRestaurant.map((g) => g.restaurantId);
    return activeCampaigns.filter((c) => {
      if (!c.restaurantIds || c.restaurantIds.length === 0) return true;
      return cartRestIds.some((id) => c.restaurantIds.includes(id));
    });
  }, [activeCampaigns, itemsByRestaurant]);

  // Pick best campaign with the lowest qualification threshold
  const bestCampaign = useMemo(() => {
    if (relevantCampaigns.length === 0) return null;
    return [...relevantCampaigns].sort((a, b) => a.minSubtotal - b.minSubtotal)[0];
  }, [relevantCampaigns]);

  const amountToFreeDelivery = bestCampaign
    ? Math.max(0, bestCampaign.minSubtotal - subtotal)
    : 0;
  const freeDeliveryProgress = bestCampaign && bestCampaign.minSubtotal > 0
    ? Math.min(100, (subtotal / bestCampaign.minSubtotal) * 100)
    : 0;
  const qualifiesForFreeDelivery = bestCampaign
    ? subtotal >= bestCampaign.minSubtotal
    : false;

  const isMultiRestaurant = itemsByRestaurant.length > 1;

  /* ── Empty State ────────────────────────────────────────────── */
  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Looks like you haven't added anything yet. Explore our restaurants and find something delicious!"
          action={{
            label: "Browse Restaurants",
            onClick: () => navigate("/restaurants"),
          }}
          secondaryAction={
            isAuthenticated
              ? {
                  label: "View Order History",
                  onClick: () => navigate("/orders"),
                }
              : undefined
          }
        />
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
                  {isMultiRestaurant && (
                    <span className="ml-1">
                      from {itemsByRestaurant.length} restaurants
                    </span>
                  )}
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

          {/* Multi-restaurant header */}
          {isMultiRestaurant && (
            <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-800 font-medium">
                Your cart contains items from multiple restaurants. Each
                restaurant will be processed as a separate order.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ── Items Column ─────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-6">
              {itemsByRestaurant.map((group) => (
                <div key={group.restaurantId}>
                  {/* Restaurant header */}
                  <Link
                    to={`/restaurants/${group.restaurantId}`}
                    className="flex items-center gap-2 mb-3 group"
                  >
                    <div className="bg-orange-100 rounded-lg p-1.5">
                      <Store className="h-4 w-4 text-orange-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">
                      {group.restaurantName}
                    </p>
                    <ChevronLeft className="h-3 w-3 text-gray-400 rotate-180 group-hover:text-orange-500 transition-colors" />
                  </Link>

                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {group.items.map((item, idx) => {
                        const itemKey = item.itemKey || item.menuItemId;
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
                            exit={{
                              opacity: 0,
                              x: -30,
                              height: 0,
                              marginBottom: 0,
                            }}
                            transition={{
                              duration: 0.22,
                              delay: idx * 0.03,
                            }}
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
                                  lineTotal:
                                    (item.price +
                                      item.variants.reduce(
                                        (s, v) => s + v.price,
                                        0,
                                      ) +
                                      item.addons.reduce(
                                        (s, a) => s + a.price,
                                        0,
                                      )) *
                                    item.quantity,
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
                  </div>

                  {/* Add more items link per restaurant */}
                  <Link
                    to={`/restaurants/${group.restaurantId}`}
                    className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium px-1 py-2 transition-colors mt-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add more from {group.restaurantName}
                  </Link>
                </div>
              ))}
            </div>

            {/* ── Summary Column ───────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 space-y-4">
                {/* Dynamic Admin-Managed Free Delivery Campaign Banner */}
                {bestCampaign && (
                  <Card className="p-4 bg-white border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck
                        className={`h-4 w-4 ${qualifiesForFreeDelivery ? "text-green-500" : "text-orange-500"}`}
                      />
                      {qualifiesForFreeDelivery ? (
                        <p className="text-sm font-medium text-green-700">
                          You've unlocked free delivery! ({bestCampaign.label})
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600">
                          Add{" "}
                          <span className="font-semibold text-orange-600">
                            ৳{amountToFreeDelivery.toFixed(0)}
                          </span>{" "}
                          more for free delivery ({bestCampaign.label})
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
                )}

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

                {/* Per-restaurant delivery breakdown */}
                {isMultiRestaurant && (
                  <Card className="p-4 bg-white border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Delivery Fees
                    </h4>
                    <div className="space-y-1.5 text-sm">
                      {itemsByRestaurant.map((group) => (
                        <div
                          key={group.restaurantId}
                          className="flex justify-between text-gray-600"
                        >
                          <span className="truncate mr-2">
                            {group.restaurantName}
                          </span>
                          <span>{formatCurrency(group.deliveryFee)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

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
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Tax (5%)</span>
                      <span className="font-medium text-gray-800">
                        {formatCurrency(tax)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Delivery Fee</span>
                      <span className="font-medium text-gray-800">
                        {deliveryQuote ? (
                          deliveryFeeDiscount > 0 ? (
                            <span className="flex items-center gap-1.5">
                              <span className="line-through text-gray-400 text-xs">
                                {formatCurrency(deliveryFeeOriginal)}
                              </span>
                              <span className="text-green-600 font-semibold">
                                {deliveryFee === 0 ? "FREE" : formatCurrency(deliveryFee)}
                              </span>
                            </span>
                          ) : (
                            formatCurrency(deliveryFee)
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground font-normal">
                            Calculated at checkout
                          </span>
                        )}
                        {isMultiRestaurant && deliveryQuote && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({itemsByRestaurant.length}×)
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="border-t border-dashed border-gray-200 pt-3 mt-1 flex justify-between">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-bold text-lg text-orange-600">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-5 bg-orange-500 hover:bg-orange-600 shadow-sm shadow-orange-200 font-semibold h-11 text-sm"
                    onClick={() =>
                      navigate(isAuthenticated ? "/checkout" : "/login")
                    }
                  >
                    {isAuthenticated
                      ? `Proceed to Checkout`
                      : "Login to Order"}
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
