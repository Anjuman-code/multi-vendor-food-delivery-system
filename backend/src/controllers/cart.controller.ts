import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Cart from "../models/Cart";
import { successResponse } from "../utils/response.util";
import { AuthenticationError, NotFoundError } from "../utils/errors";
import type { AuthRequest } from "../types";
import type {
  AddToCartInput,
  UpdateCartItemInput,
  SyncCartInput,
  MergeCartInput,
} from "../validations/cart.validation";

const CART_TTL_DAYS = 7;

/**
 * Migrate legacy cart items that lack restaurantId (old single-restaurant schema).
 * Returns true if any items were migrated.
 */
export const migrateLegacyCartItems = (cart: any): boolean => {
  const legacyRestId = cart.restaurantId;
  const legacyRestName = cart.restaurantName || "";
  if (!legacyRestId) return false;

  let migrated = false;
  for (const ci of cart.items) {
    if (!ci.restaurantId) {
      ci.restaurantId = legacyRestId;
      ci.restaurantName = legacyRestName;
      migrated = true;
    }
  }
  if (migrated) {
    const rid = legacyRestId.toString();
    for (const ci of cart.items) {
      ci.key = buildCartItemKey({
        restaurantId: rid,
        menuItemId: ci.menuItemId.toString(),
        variants: ci.variants.map((v: any) => ({ variantId: v.variantId?.toString(), name: v.name })),
        addons: ci.addons.map((a: any) => ({ addonId: a.addonId?.toString(), name: a.name })),
        specialInstructions: ci.specialInstructions,
      });
    }
  }
  return migrated;
};

const mapOption = (
  opt: {
    optionId?: string;
    variantId?: string;
    addonId?: string;
    name: string;
    price: number;
  },
  kind: "variant" | "addon",
) => {
  const id = opt.optionId || opt.variantId || opt.addonId;
  if (kind === "variant") {
    return { variantId: id ? new mongoose.Types.ObjectId(id) : undefined, name: opt.name, price: opt.price };
  }
  return { addonId: id ? new mongoose.Types.ObjectId(id) : undefined, name: opt.name, price: opt.price };
};

const buildCartItemKey = (item: {
  restaurantId?: string;
  menuItemId: string;
  variants?: Array<{ optionId?: string; variantId?: string; name: string }>;
  addons?: Array<{ optionId?: string; addonId?: string; name: string }>;
  specialInstructions?: string;
}): string => {
  const variantKey = (item.variants || [])
    .map((v) => v.optionId || v.variantId || v.name)
    .sort()
    .join("|");
  const addonKey = (item.addons || [])
    .map((a) => a.optionId || a.addonId || a.name)
    .sort()
    .join("|");
  const notesKey = item.specialInstructions?.trim() || "";
  const restKey = item.restaurantId || "";
  return `${restKey}::${item.menuItemId}::v=${variantKey}::a=${addonKey}::n=${notesKey}`;
};

/** GET /api/cart — Get the authenticated user's cart */
export const getCart = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const cart = await Cart.findOne({ userId: authReq.user._id });
    if (!cart) {
      successResponse(res, { cart: null });
      return;
    }

    if (migrateLegacyCartItems(cart)) {
      await cart.save();
    }

    successResponse(res, { cart });
  } catch (error) {
    next(error);
  }
};

/** POST /api/cart/add — Add an item to the cart */
export const addToCart = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { restaurantId, restaurantName, item } = req.body as AddToCartInput;

    let cart = await Cart.findOne({ userId: authReq.user._id });

    if (!cart) {
      cart = new Cart({
        userId: authReq.user._id,
        items: [],
        expiresAt: new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000),
      });
    } else {
      migrateLegacyCartItems(cart);
    }

    const itemWithRestaurant = { ...item, restaurantId, restaurantName };
    const key = buildCartItemKey(itemWithRestaurant);

    const existingIdx = cart.items.findIndex((existing) => existing.key === key);

    if (existingIdx >= 0) {
      cart.items[existingIdx].quantity += item.quantity;
    } else {
      cart.items.push({
        key,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        restaurantName,
        menuItemId: new mongoose.Types.ObjectId(item.menuItemId),
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
        variants: (item.variants || []).map((v) => mapOption(v, "variant")),
        addons: (item.addons || []).map((a) => mapOption(a, "addon")),
        specialInstructions: item.specialInstructions,
      });
    }

    cart.expiresAt = new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);
    await cart.save();

    successResponse(res, { cart });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/cart/item/:itemKey — Update quantity */
export const updateCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { itemKey } = req.params;
    const { quantity } = req.body as UpdateCartItemInput;

    const cart = await Cart.findOne({ userId: authReq.user._id });
    if (!cart) throw new NotFoundError("Cart not found");

    migrateLegacyCartItems(cart);

    const item = cart.items.find((i) => i.key === itemKey);
    if (!item) throw new NotFoundError("Item not found in cart");

    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.key !== itemKey);
    } else {
      item.quantity = quantity;
    }

    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: cart._id });
      successResponse(res, { cart: null }, "Cart cleared");
      return;
    }

    cart.expiresAt = new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);
    await cart.save();

    successResponse(res, { cart });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/cart/item/:itemKey — Remove a single item */
export const removeCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { itemKey } = req.params;

    const cart = await Cart.findOne({ userId: authReq.user._id });
    if (!cart) throw new NotFoundError("Cart not found");

    migrateLegacyCartItems(cart);

    const existed = cart.items.some((i) => i.key === itemKey);
    if (!existed) throw new NotFoundError("Item not found in cart");

    cart.items = cart.items.filter((i) => i.key !== itemKey);

    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: cart._id });
      successResponse(res, { cart: null }, "Cart cleared");
      return;
    }

    cart.expiresAt = new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);
    await cart.save();

    successResponse(res, { cart });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/cart — Clear the entire cart */
export const clearCart = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    await Cart.deleteOne({ userId: authReq.user._id });
    successResponse(res, null, "Cart cleared");
  } catch (error) {
    next(error);
  }
};

/** POST /api/cart/sync — Full cart sync (used after login or cross-device) */
export const syncCart = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { items } = req.body as SyncCartInput;

    if (!items || items.length === 0) {
      await Cart.deleteOne({ userId: authReq.user._id });
      successResponse(res, { cart: null }, "Cart cleared");
      return;
    }

    const cart = await Cart.findOneAndUpdate(
      { userId: authReq.user._id },
      {
        userId: authReq.user._id,
        items: items.map((item) => ({
          key: buildCartItemKey(item),
          restaurantId: new mongoose.Types.ObjectId(item.restaurantId || ""),
          restaurantName: item.restaurantName || "",
          menuItemId: new mongoose.Types.ObjectId(item.menuItemId),
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
          variants: (item.variants || []).map((v) => mapOption(v, "variant")),
          addons: (item.addons || []).map((a) => mapOption(a, "addon")),
          specialInstructions: item.specialInstructions,
        })),
        expiresAt: new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true },
    );

    successResponse(res, { cart });
  } catch (error) {
    next(error);
  }
};

/** POST /api/cart/merge — Merge local guest cart into server cart on login */
export const mergeCart = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { items } = req.body as MergeCartInput;

    if (!items || items.length === 0) {
      const cart = await Cart.findOne({ userId: authReq.user._id });
      successResponse(res, { cart: cart || null });
      return;
    }

    let cart = await Cart.findOne({ userId: authReq.user._id });

    if (cart) {
      migrateLegacyCartItems(cart);
    }

    if (!cart) {
      cart = new Cart({
        userId: authReq.user._id,
        items: items.map((item) => ({
          key: buildCartItemKey(item),
          restaurantId: new mongoose.Types.ObjectId(item.restaurantId || ""),
          restaurantName: item.restaurantName || "",
          menuItemId: new mongoose.Types.ObjectId(item.menuItemId),
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
          variants: (item.variants || []).map((v) => mapOption(v, "variant")),
          addons: (item.addons || []).map((a) => mapOption(a, "addon")),
          specialInstructions: item.specialInstructions,
        })),
        expiresAt: new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000),
      });
      await cart.save();
      successResponse(res, { cart });
      return;
    }

    for (const localItem of items) {
      const itemWithRest = { ...localItem, restaurantId: localItem.restaurantId, restaurantName: localItem.restaurantName };
      const localKey = buildCartItemKey(itemWithRest);
      const existing = cart.items.find((i) => i.key === localKey);
      if (!existing) {
        cart.items.push({
          key: localKey,
          restaurantId: new mongoose.Types.ObjectId(localItem.restaurantId || ""),
          restaurantName: localItem.restaurantName || "",
          menuItemId: new mongoose.Types.ObjectId(localItem.menuItemId),
          name: localItem.name,
          price: localItem.price,
          image: localItem.image,
          quantity: localItem.quantity,
          variants: (localItem.variants || []).map((v) => mapOption(v, "variant")),
          addons: (localItem.addons || []).map((a) => mapOption(a, "addon")),
          specialInstructions: localItem.specialInstructions,
        });
      }
    }

    cart.expiresAt = new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);
    await cart.save();

    successResponse(res, { cart });
  } catch (error) {
    next(error);
  }
};
