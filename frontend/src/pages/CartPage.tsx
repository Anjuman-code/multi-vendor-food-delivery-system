/**
 * CartPage – displays cart items with quantity controls and order summary.
 */
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../contexts/AuthContext";

const CartPage: React.FC = () => {
  const {
    items,
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

  const handleRemove = (itemKey: string) => {
    setRemovingId(itemKey);
    setTimeout(() => {
      removeItem(itemKey);
      setRemovingId(null);
    }, 200);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <ShoppingCart className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-500 mb-6">
            Add items from a restaurant to get started
          </p>
          <Link to="/restaurants">
            <Button className="bg-orange-500 hover:bg-orange-600">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Browse Restaurants
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
            {restaurantName && (
              <p className="text-sm text-gray-500 mt-1">
                From{" "}
                <span className="font-medium text-orange-600">
                  {restaurantName}
                </span>{" "}
                · {itemCount} {itemCount === 1 ? "item" : "items"}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence>
              {items.map((item) => {
                const itemKey = item.itemKey || item.menuItemId;
                return (
                <motion.div
                  key={itemKey}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{
                    opacity: removingId === itemKey ? 0.3 : 1,
                    x: 0,
                  }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="p-4">
                    <div className="flex items-start gap-4">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {item.name}
                        </h3>
                        {item.variants.length > 0 && (
                          <p className="text-xs text-gray-500">
                            {item.variants.map((v) => v.name).join(", ")}
                          </p>
                        )}
                        {item.addons.length > 0 && (
                          <p className="text-xs text-gray-500">
                            +{item.addons.map((a) => a.name).join(", ")}
                          </p>
                        )}
                        {item.specialInstructions && (
                          <p className="text-xs text-gray-400 italic mt-1">
                            {item.specialInstructions}
                          </p>
                        )}
                        <p className="text-sm font-medium text-orange-600 mt-1">
                          ৳{item.price.toFixed(2)}
                        </p>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-600"
                          onClick={() => handleRemove(itemKey)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-5 sticky top-24">
              <h3 className="font-bold text-lg text-gray-900 mb-4">
                Order Summary
              </h3>
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
                  <span>Delivery Fee</span>
                  <span>৳{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>৳{total.toFixed(2)}</span>
                </div>
              </div>
              <Button
                className="w-full mt-5 bg-orange-500 hover:bg-orange-600"
                onClick={() =>
                  navigate(isAuthenticated ? "/checkout" : "/login")
                }
              >
                {isAuthenticated ? "Proceed to Checkout" : "Login to Order"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CartPage;
