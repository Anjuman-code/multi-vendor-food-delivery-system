/**
 * Cart controller — server-side cart with add/remove/update/sync/merge.
 */
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

/** Map incoming variant/addon from string IDs to ObjectIds for the model */
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

/** Build a deterministic item key matching the frontend algorithm */
const buildCartItemKey = (item: {
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
  return `${item.menuItemId}::v=${variantKey}::a=${addonKey}::n=${notesKey}`;
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

    // If cart exists for a different restaurant, clear it
    if (cart && cart.restaurantId.toString() !== restaurantId) {
      cart.restaurantId = new mongoose.Types.ObjectId(restaurantId);
      cart.restaurantName = restaurantName;
      cart.items = [];
    }

    if (!cart) {
      cart = new Cart({
        userId: authReq.user._id,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        restaurantName,
        items: [],
        expiresAt: new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000),
      });
    }

    const key = buildCartItemKey(item);

    // Merge with existing item by key
    const existingIdx = cart.items.findIndex((existing) => existing.key === key);

    if (existingIdx >= 0) {
      cart.items[existingIdx].quantity += item.quantity;
    } else {
      cart.items.push({
        key,
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

    // Refresh TTL
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

    const { restaurantId, restaurantName, items } = req.body as SyncCartInput;

    if (!items || items.length === 0) {
      await Cart.deleteOne({ userId: authReq.user._id });
      successResponse(res, { cart: null }, "Cart cleared");
      return;
    }

    const cart = await Cart.findOneAndUpdate(
      { userId: authReq.user._id },
      {
        userId: authReq.user._id,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        restaurantName,
        items: items.map((item) => ({
          key: buildCartItemKey(item),
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

    const { restaurantId, restaurantName, items } = req.body as MergeCartInput;

    if (!items || items.length === 0) {
      // No local items — keep server cart as-is
      const cart = await Cart.findOne({ userId: authReq.user._id });
      successResponse(res, { cart: cart || null });
      return;
    }

    let cart = await Cart.findOne({ userId: authReq.user._id });

    // If no server cart, create from local items
    if (!cart) {
      cart = new Cart({
        userId: authReq.user._id,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        restaurantName,
        items: items.map((item) => ({
          key: buildCartItemKey(item),
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

    // Merge: server items keep their quantities, local items absent on server get added
    for (const localItem of items) {
      const localKey = buildCartItemKey(localItem);
      const existing = cart.items.find((i) => i.key === localKey);
      if (!existing) {
        cart.items.push({
          key: localKey,
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
