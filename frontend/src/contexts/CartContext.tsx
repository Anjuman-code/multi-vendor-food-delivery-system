/**
 * CartContext – persistent shopping cart state with localStorage backing.
 * Enforces single-restaurant cart (standard for food delivery).
 */
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────

export interface CartItemVariant {
  optionId?: string;
  name: string;
  price: number;
}

export interface CartItemAddon {
  optionId?: string;
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
}

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  itemCount: number;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  addItem: (
    restaurantId: string,
    restaurantName: string,
    item: CartItem,
  ) => boolean;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
  isRestaurantMismatch: (restaurantId: string) => boolean;
}

// ── Constants ──────────────────────────────────────────────────

const CART_KEY = "Food Rush_cart";
const TAX_RATE = 0.05;
const DEFAULT_DELIVERY_FEE = 50;

// ── Helpers ────────────────────────────────────────────────────

const loadCart = (): CartState => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CartState;
      if (parsed && Array.isArray(parsed.items)) return parsed;
    }
  } catch {
    // Corrupt data – ignore
  }
  return { restaurantId: null, restaurantName: null, items: [] };
};

const saveCart = (state: CartState) => {
  localStorage.setItem(CART_KEY, JSON.stringify(state));
};

const buildCartItemKey = (item: CartItem): string => {
  const variantKey = (item.variants || [])
    .map((option) => option.optionId || option.name)
    .sort()
    .join("|");
  const addonKey = (item.addons || [])
    .map((option) => option.optionId || option.name)
    .sort()
    .join("|");
  const notesKey = item.specialInstructions?.trim() || "";

  return `${item.menuItemId}::v=${variantKey}::a=${addonKey}::n=${notesKey}`;
};

// ── Context ────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cart, setCart] = useState<CartState>(loadCart);

  // Persist on change
  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const addItem = useCallback(
    (restaurantId: string, restaurantName: string, item: CartItem): boolean => {
      // Different restaurant – caller should confirm clear
      if (cart.restaurantId && cart.restaurantId !== restaurantId) {
        return false;
      }

      setCart((prev) => {
        const incomingKey = item.itemKey || buildCartItemKey(item);
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

        return {
          restaurantId,
          restaurantName,
          items: newItems,
        };
      });
      return true;
    },
    [cart.restaurantId],
  );

  const updateQuantity = useCallback((itemKey: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        const newItems = prev.items.filter(
          (i) =>
            (i.itemKey || buildCartItemKey(i)) !== itemKey && i.menuItemId !== itemKey,
        );
        if (newItems.length === 0) {
          return { restaurantId: null, restaurantName: null, items: [] };
        }
        return { ...prev, items: newItems };
      }
      return {
        ...prev,
        items: prev.items.map((i) =>
          (i.itemKey || buildCartItemKey(i)) === itemKey || i.menuItemId === itemKey
            ? { ...i, quantity }
            : i,
        ),
      };
    });
  }, []);

  const removeItem = useCallback((itemKey: string) => {
    setCart((prev) => {
      const newItems = prev.items.filter(
        (i) =>
          (i.itemKey || buildCartItemKey(i)) !== itemKey && i.menuItemId !== itemKey,
      );
      if (newItems.length === 0) {
        return { restaurantId: null, restaurantName: null, items: [] };
      }
      return { ...prev, items: newItems };
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart({ restaurantId: null, restaurantName: null, items: [] });
  }, []);

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
      itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      tax,
      deliveryFee,
      total,
      addItem,
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
      addItem,
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
