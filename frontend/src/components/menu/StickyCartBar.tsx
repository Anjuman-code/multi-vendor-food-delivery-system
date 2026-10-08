import React, { memo } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/utils/format";

export const StickyCartBar: React.FC = memo(() => {
  const { itemCount, subtotal, itemsByRestaurant } = useCart();

  if (itemCount === 0) return null;

  const vendorCount = itemsByRestaurant.length;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        aria-label="Floating cart summary"
        className="fixed bottom-4 left-4 right-4 z-40 sm:hidden pb-[env(safe-area-inset-bottom)]"
      >
        <Link
          to="/cart"
          className="flex items-center justify-between p-3.5 bg-gray-900 text-white rounded-2xl shadow-xl hover:bg-gray-800 transition-colors border border-gray-800"
        >
          <div className="flex items-center gap-3">
            <div className="relative p-2 bg-brand-500 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-brand-600 text-[10px] font-extrabold flex items-center justify-center shadow">
                {itemCount}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-300">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
                {vendorCount > 1 && (
                  <span className="text-[10px] bg-gray-800 text-amber-300 px-1.5 py-0.5 rounded-full font-medium">
                    {vendorCount} restaurants
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-white">
                {formatCurrency(subtotal)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-sm font-semibold text-brand-400">
            <span>View Cart</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </motion.aside>
    </AnimatePresence>
  );
});

StickyCartBar.displayName = "StickyCartBar";
