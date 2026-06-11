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
  restaurantId: string;
  restaurantName: string;
  menuItemId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  variants: CartItemVariant[];
  addons: CartItemAddon[];
  specialInstructions?: string;
}

export interface RestaurantCartGroup {
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
}

interface CartState {
  items: CartItem[];
  promoCode: string;
}

interface CartContextType {
  items: CartItem[];
  promoCode: string;
  itemCount: number;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  isLoading: boolean;
  isMutating: boolean;
  itemsByRestaurant: RestaurantCartGroup[];
  addItem: (
    restaurantId: string,
    restaurantName: string,
    item: Omit<CartItem, "restaurantId" | "restaurantName">,
  ) => Promise<void>;
  setPromoCode: (code: string) => void;
  clearPromoCode: () => void;
  updateQuantity: (itemKey: string, quantity: number) => Promise<void>;
  removeItem: (itemKey: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const TAX_RATE = 0.05;
const DEFAULT_DELIVERY_FEE = 50;

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

  return `${item.restaurantId}::${item.menuItemId}::v=${variantKey}::a=${addonKey}::n=${notesKey}`;
};

const serverItemToCartItem = (i: {
  key?: string;
  restaurantId: string;
  restaurantName: string;
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
  restaurantId: i.restaurantId,
  restaurantName: i.restaurantName,
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
  items: [],
  promoCode: "",
};

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

  useEffect(() => {
    if (isAuthenticated && !initialFetchDone.current) {
      initialFetchDone.current = true;
      setIsLoading(true);

      const doLoginSync = async () => {
        const guestCart = cartRef.current;
        if (guestCart.items.length > 0) {
          try {
            await cartService.mergeCart({
              items: guestCart.items.map((i) => ({
                restaurantId: i.restaurantId,
                restaurantName: i.restaurantName,
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

        try {
          const serverCart = await cartService.getCart();
          if (serverCart && serverCart.items.length > 0) {
            setCart({
              items: serverCart.items.map(serverItemToCartItem),
              promoCode: "",
            });
          }
        } catch {
          // Server unreachable — keep guest cart
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

  useEffect(() => {
    if (prevAuth.current && !isAuthenticated) {
      initialFetchDone.current = false;
      setCart(EMPTY_CART);
      cartService.clearCart().catch(() => {});
    }
    prevAuth.current = isAuthenticated;
  }, [isAuthenticated]);

  const setCartFromServer = useCallback((serverCart: { items: any[] } | null) => {
    if (!serverCart || serverCart.items.length === 0) {
      setCart(EMPTY_CART);
      return;
    }
    setCart({
      items: serverCart.items.map(serverItemToCartItem),
      promoCode: "",
    });
  }, []);

  const addItem = useCallback(
    async (
      restaurantId: string,
      restaurantName: string,
      item: Omit<CartItem, "restaurantId" | "restaurantName">,
    ): Promise<void> => {
      const itemWithRestaurant: CartItem = { ...item, restaurantId, restaurantName };
      const incomingKey = item.itemKey || buildCartItemKey(itemWithRestaurant);

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
          newItems = [...prev.items, { ...itemWithRestaurant, itemKey: incomingKey }];
        }
        return { items: newItems, promoCode: prev.promoCode };
      });

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
    },
    [isAuthenticated, setCartFromServer],
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
      setCart((prev) => {
        const newItems = prev.items.filter(
          (i) => (i.itemKey || buildCartItemKey(i)) !== itemKey,
        );
        if (newItems.length === 0) return EMPTY_CART;
        return { ...prev, items: newItems };
      });

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
    setCart(EMPTY_CART);

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

  const itemsByRestaurant = useMemo(() => {
    const groups: Record<string, { restaurantId: string; restaurantName: string; items: CartItem[] }> = {};
    for (const item of cart.items) {
      const key = item.restaurantId;
      if (!groups[key]) {
        groups[key] = { restaurantId: item.restaurantId, restaurantName: item.restaurantName, items: [] };
      }
      groups[key].items.push(item);
    }
    return Object.values(groups).map((group) => {
      const groupSubtotal = group.items.reduce((sum, item) => {
        const variantExtra = item.variants.reduce((s, v) => s + v.price, 0);
        const addonExtra = item.addons.reduce((s, a) => s + a.price, 0);
        return sum + (item.price + variantExtra + addonExtra) * item.quantity;
      }, 0);
      return {
        ...group,
        subtotal: groupSubtotal,
        deliveryFee: DEFAULT_DELIVERY_FEE,
      };
    });
  }, [cart.items]);

  const deliveryFee = cart.items.length > 0
    ? itemsByRestaurant.length * DEFAULT_DELIVERY_FEE
    : 0;

  const total = subtotal + tax + deliveryFee;

  const value = useMemo<CartContextType>(
    () => ({
      items: cart.items,
      promoCode: cart.promoCode,
      itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      tax,
      deliveryFee,
      total,
      isLoading,
      isMutating,
      itemsByRestaurant,
      addItem,
      setPromoCode,
      clearPromoCode,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      cart,
      subtotal,
      tax,
      deliveryFee,
      total,
      isLoading,
      isMutating,
      itemsByRestaurant,
      addItem,
      setPromoCode,
      clearPromoCode,
      updateQuantity,
      removeItem,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};

export const mergeGuestCart = async (
  guestCart: { items: CartItem[] },
): Promise<void> => {
  if (guestCart.items.length === 0) return;
  try {
    await cartService.mergeCart({
      items: guestCart.items.map((i) => ({
        restaurantId: i.restaurantId,
        restaurantName: i.restaurantName,
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
