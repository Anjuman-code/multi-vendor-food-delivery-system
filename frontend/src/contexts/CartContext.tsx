/**
 * CartContext – server-backed shopping cart.
 * Authenticated users have the server as the source of truth.
 * Guest users use an in-memory cart (no localStorage).
 */
import { cartService } from "@/services/cartService";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──────────────────────────────────────────────────────

export interface CartItemVariant {
  optionId?: string;
  variantId?: string;
  name: string;
  price: number;
}

export interface CartItemAddon {
  optionId?: string;
  addonId?: string;
  name: string;
  price: number;
}

export interface CartItem {
  itemKey?: string;
  menuItemId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  variants: CartItemVariant[];
  addons: CartItemAddon[];
  specialInstructions?: string;
}

interface CartState {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CartItem[];
  promoCode: string;
}

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  promoCode: string;
  itemCount: number;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  isLoading: boolean;
  isMutating: boolean;
  addItem: (
    restaurantId: string,
    restaurantName: string,
    item: CartItem,
    force?: boolean,
  ) => Promise<boolean>;
  setPromoCode: (code: string) => void;
  clearPromoCode: () => void;
  updateQuantity: (itemKey: string, quantity: number) => Promise<void>;
  removeItem: (itemKey: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isRestaurantMismatch: (restaurantId: string) => boolean;
}

// ── Constants ──────────────────────────────────────────────────

const TAX_RATE = 0.05;
const DEFAULT_DELIVERY_FEE = 50;

// ── Helpers ────────────────────────────────────────────────────

const buildCartItemKey = (item: CartItem): string => {
  const variantKey = (item.variants || [])
    .map((option) => option.optionId || option.variantId || option.name)
    .sort()
    .join("|");
  const addonKey = (item.addons || [])
    .map((option) => option.optionId || option.addonId || option.name)
    .sort()
    .join("|");
  const notesKey = item.specialInstructions?.trim() || "";

  return `${item.menuItemId}::v=${variantKey}::a=${addonKey}::n=${notesKey}`;
};

const serverItemToCartItem = (i: {
  key?: string;
  menuItemId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  variants?: Array<{ variantId?: string; optionId?: string; name: string; price: number }>;
  addons?: Array<{ addonId?: string; optionId?: string; name: string; price: number }>;
  specialInstructions?: string;
}): CartItem => ({
  itemKey: i.key,
  menuItemId: i.menuItemId,
  name: i.name,
  price: i.price,
  image: i.image,
  quantity: i.quantity,
  variants: (i.variants || []).map((v) => ({
    optionId: v.optionId || v.variantId,
    variantId: v.variantId,
    name: v.name,
    price: v.price,
  })),
  addons: (i.addons || []).map((a) => ({
    optionId: a.optionId || a.addonId,
    addonId: a.addonId,
    name: a.name,
    price: a.price,
  })),
  specialInstructions: i.specialInstructions,
});

const EMPTY_CART: CartState = {
  restaurantId: null,
  restaurantName: null,
  items: [],
  promoCode: "",
};

// ── Context ────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cart, setCart] = useState<CartState>(EMPTY_CART);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const { isAuthenticated } = useAuth();
  const prevAuth = useRef(isAuthenticated);
  const initialFetchDone = useRef(false);
  const cartRef = useRef(cart);
  cartRef.current = cart;

  // On mount / auth change: merge guest cart, then fetch server cart
  useEffect(() => {
    if (isAuthenticated && !initialFetchDone.current) {
      initialFetchDone.current = true;
      setIsLoading(true);

      const doLoginSync = async () => {
        // Merge guest cart (if any) into server
        const guestCart = cartRef.current;
        if (guestCart.restaurantId && guestCart.items.length > 0) {
          try {
            await cartService.mergeCart({
              restaurantId: guestCart.restaurantId,
              restaurantName: guestCart.restaurantName || "",
              items: guestCart.items.map((i) => ({
                menuItemId: i.menuItemId,
                name: i.name,
                price: i.price,
                image: i.image,
                quantity: i.quantity,
                variants: i.variants.map((v) => ({
                  optionId: v.optionId || v.variantId,
                  name: v.name,
                  price: v.price,
                })),
                addons: i.addons.map((a) => ({
                  optionId: a.optionId || a.addonId,
                  name: a.name,
                  price: a.price,
                })),
                specialInstructions: i.specialInstructions,
              })),
            });
          } catch {
            // Non-critical
          }
        }

        // Fetch server cart
        try {
          const serverCart = await cartService.getCart();
          if (serverCart && serverCart.items.length > 0) {
            setCart({
              restaurantId: serverCart.restaurantId,
              restaurantName: serverCart.restaurantName,
              items: serverCart.items.map(serverItemToCartItem),
              promoCode: "",
            });
          }
        } catch {
          // Server unreachable — keep guest cart (optimistic state)
        } finally {
          setIsLoading(false);
        }
      };

      doLoginSync();
    } else if (!isAuthenticated) {
      initialFetchDone.current = false;
      setCart(EMPTY_CART);
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Clear cart when user logs out
  useEffect(() => {
    if (prevAuth.current && !isAuthenticated) {
      initialFetchDone.current = false;
      setCart(EMPTY_CART);
      cartService.clearCart().catch(() => {});
    }
    prevAuth.current = isAuthenticated;
  }, [isAuthenticated]);

  const setCartFromServer = useCallback((serverCart: { restaurantId: string; restaurantName: string; items: any[] } | null) => {
    if (!serverCart || serverCart.items.length === 0) {
      setCart(EMPTY_CART);
      return;
    }
    setCart({
      restaurantId: serverCart.restaurantId,
      restaurantName: serverCart.restaurantName,
      items: serverCart.items.map(serverItemToCartItem),
      promoCode: "",
    });
  }, []);

  const addItem = useCallback(
    async (
      restaurantId: string,
      restaurantName: string,
      item: CartItem,
      force?: boolean,
    ): Promise<boolean> => {
      // Different restaurant – caller should confirm clear
      if (!force && cart.restaurantId && cart.restaurantId !== restaurantId) {
        return false;
      }

      const incomingKey = item.itemKey || buildCartItemKey(item);

      // Optimistic update (both guest and authenticated)
      setCart((prev) => {
        const existing = prev.items.findIndex(
          (i) => (i.itemKey || buildCartItemKey(i)) === incomingKey,
        );
        let newItems: CartItem[];
        if (existing >= 0) {
          newItems = prev.items.map((i, idx) =>
            idx === existing
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          );
        } else {
          newItems = [...prev.items, { ...item, itemKey: incomingKey }];
        }
        return { restaurantId, restaurantName, items: newItems, promoCode: prev.promoCode };
      });

      // Background server sync (authenticated only)
      if (isAuthenticated) {
        setIsMutating(true);
        try {
          const serverCart = await cartService.addToCart({
            restaurantId,
            restaurantName,
            item: {
              menuItemId: item.menuItemId,
              name: item.name,
              price: item.price,
              image: item.image,
              quantity: item.quantity,
              variants: item.variants.map((v) => ({
                optionId: v.optionId || v.variantId,
                name: v.name,
                price: v.price,
              })),
              addons: item.addons.map((a) => ({
                optionId: a.optionId || a.addonId,
                name: a.name,
                price: a.price,
              })),
              specialInstructions: item.specialInstructions,
            },
          });
          setCartFromServer(serverCart);
        } catch {
          // Server failure — optimistic state stays
        } finally {
          setIsMutating(false);
        }
      }

      return true;
    },
    [cart.restaurantId, isAuthenticated, setCartFromServer],
  );

  const setPromoCode = useCallback((code: string) => {
    setCart((prev) => ({
      ...prev,
      promoCode: code.trim().toUpperCase(),
    }));
  }, []);

  const clearPromoCode = useCallback(() => {
    setCart((prev) => ({ ...prev, promoCode: "" }));
  }, []);

  const updateQuantity = useCallback(
    async (itemKey: string, quantity: number) => {
      // Optimistic update (both guest and authenticated)
      setCart((prev) => {
        if (quantity <= 0) {
          const newItems = prev.items.filter(
            (i) => (i.itemKey || buildCartItemKey(i)) !== itemKey,
          );
          if (newItems.length === 0) return EMPTY_CART;
          return { ...prev, items: newItems };
        }
        return {
          ...prev,
          items: prev.items.map((i) =>
            (i.itemKey || buildCartItemKey(i)) === itemKey
              ? { ...i, quantity }
              : i,
          ),
        };
      });

      // Background server sync (authenticated only)
      if (isAuthenticated) {
        setIsMutating(true);
        try {
          const serverCart = await cartService.updateCartItem(itemKey, quantity);
          setCartFromServer(serverCart);
        } catch {
          // Server failure — optimistic state stays
        } finally {
          setIsMutating(false);
        }
      }
    },
    [isAuthenticated, setCartFromServer],
  );

  const removeItem = useCallback(
    async (itemKey: string) => {
      // Optimistic update (both guest and authenticated)
      setCart((prev) => {
        const newItems = prev.items.filter(
          (i) => (i.itemKey || buildCartItemKey(i)) !== itemKey,
        );
        if (newItems.length === 0) return EMPTY_CART;
        return { ...prev, items: newItems };
      });

      // Background server sync (authenticated only)
      if (isAuthenticated) {
        setIsMutating(true);
        try {
          const serverCart = await cartService.removeCartItem(itemKey);
          setCartFromServer(serverCart);
        } catch {
          // Server failure — optimistic state stays
        } finally {
          setIsMutating(false);
        }
      }
    },
    [isAuthenticated, setCartFromServer],
  );

  const clearCart = useCallback(async () => {
    // Optimistic update (both guest and authenticated)
    setCart(EMPTY_CART);

    // Background server sync (authenticated only)
    if (isAuthenticated) {
      setIsMutating(true);
      try {
        await cartService.clearCart();
      } catch {
        // Server failure — optimistic state stays
      } finally {
        setIsMutating(false);
      }
    }
  }, [isAuthenticated]);

  const isRestaurantMismatch = useCallback(
    (restaurantId: string) =>
      !!cart.restaurantId && cart.restaurantId !== restaurantId,
    [cart.restaurantId],
  );

  const subtotal = useMemo(
    () =>
      cart.items.reduce((sum, item) => {
        const variantExtra = item.variants.reduce((s, v) => s + v.price, 0);
        const addonExtra = item.addons.reduce((s, a) => s + a.price, 0);
        return sum + (item.price + variantExtra + addonExtra) * item.quantity;
      }, 0),
    [cart.items],
  );

  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const deliveryFee = cart.items.length > 0 ? DEFAULT_DELIVERY_FEE : 0;
  const total = subtotal + tax + deliveryFee;

  const value = useMemo<CartContextType>(
    () => ({
      items: cart.items,
      restaurantId: cart.restaurantId,
      restaurantName: cart.restaurantName,
      promoCode: cart.promoCode,
      itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      tax,
      deliveryFee,
      total,
      isLoading,
      isMutating,
      addItem,
      setPromoCode,
      clearPromoCode,
      updateQuantity,
      removeItem,
      clearCart,
      isRestaurantMismatch,
    }),
    [
      cart,
      subtotal,
      tax,
      deliveryFee,
      total,
      isLoading,
      isMutating,
      addItem,
      setPromoCode,
      clearPromoCode,
      updateQuantity,
      removeItem,
      clearCart,
      isRestaurantMismatch,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};

/**
 * Merge guest cart into server cart on login.
 * Call this from AuthContext after successful login.
 */
export const mergeGuestCart = async (
  guestCart: CartState,
): Promise<void> => {
  if (!guestCart.restaurantId || guestCart.items.length === 0) return;
  try {
    await cartService.mergeCart({
      restaurantId: guestCart.restaurantId,
      restaurantName: guestCart.restaurantName || "",
      items: guestCart.items.map((i) => ({
        menuItemId: i.menuItemId,
        name: i.name,
        price: i.price,
        image: i.image,
        quantity: i.quantity,
        variants: i.variants.map((v) => ({
          optionId: v.optionId || v.variantId,
          name: v.name,
          price: v.price,
        })),
        addons: i.addons.map((a) => ({
          optionId: a.optionId || a.addonId,
          name: a.name,
          price: a.price,
        })),
        specialInstructions: i.specialInstructions,
      })),
    });
  } catch {
    // Merge failure is non-critical
  }
};
