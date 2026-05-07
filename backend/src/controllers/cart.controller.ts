/**
 * Cart controller — server-side cart with add/remove/update/sync.
 */
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Cart from "../models/Cart";
import { successResponse } from "../utils/response.util";
import { AuthenticationError, NotFoundError, ValidationError } from "../utils/errors";
import type { AuthRequest } from "../types";
import type { AddToCartInput, UpdateCartItemInput, SyncCartInput } from "../validations/cart.validation";

const CART_TTL_DAYS = 7;

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

    // Merge with existing item (same menuItemId + same variants + same addons)
    const existingIdx = cart.items.findIndex(
      (existing) =>
        existing.menuItemId.toString() === item.menuItemId &&
        JSON.stringify(existing.variants) === JSON.stringify(item.variants) &&
        JSON.stringify(existing.addons) === JSON.stringify(item.addons) &&
        (existing.specialInstructions || "") === (item.specialInstructions || ""),
    );

    if (existingIdx >= 0) {
      cart.items[existingIdx].quantity += item.quantity;
    } else {
      cart.items.push({
        menuItemId: new mongoose.Types.ObjectId(item.menuItemId),
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
        variants: item.variants || [],
        addons: item.addons || [],
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

/** PATCH /api/cart/item/:menuItemId — Update quantity or remove */
export const updateCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { menuItemId } = req.params;
    const { quantity } = req.body as UpdateCartItemInput;

    const cart = await Cart.findOne({ userId: authReq.user._id });
    if (!cart) throw new NotFoundError("Cart not found");

    if (quantity === 0) {
      cart.items = cart.items.filter(
        (item) => item.menuItemId.toString() !== menuItemId,
      );
    } else {
      const item = cart.items.find(
        (item) => item.menuItemId.toString() === menuItemId,
      );
      if (!item) throw new NotFoundError("Item not found in cart");
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
          menuItemId: new mongoose.Types.ObjectId(item.menuItemId),
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
          variants: item.variants || [],
          addons: item.addons || [],
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
