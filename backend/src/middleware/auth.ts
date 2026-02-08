import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AuthRequest, JwtTokenPayload } from "../types";

/**
 * Protect routes – verifies JWT from Authorization header or refresh
 * token from cookies and attaches the user to `req`.
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  let token: string | undefined;

  // ── 1. Check Bearer token in Authorization header ────────────
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback_secret_key",
      ) as JwtTokenPayload;

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        res.status(401).json({ success: false, message: "User not found" });
        return;
      }

      if (!user.isActive) {
        res
          .status(401)
          .json({ success: false, message: "Account is deactivated" });
        return;
      }

      (req as AuthRequest).user = user;
      next();
      return;
    } catch (error) {
      console.error("Authentication error:", error);
      res
        .status(401)
        .json({ success: false, message: "Not authorized, token failed" });
      return;
    }
  }

  // ── 2. Fallback: check refresh token in cookies ──────────────
  if (!token && req.cookies?.refreshToken) {
    try {
      const decoded = jwt.verify(
        req.cookies.refreshToken as string,
        process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret",
      ) as JwtTokenPayload;

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        res.status(401).json({ success: false, message: "User not found" });
        return;
      }

      if (!user.isActive) {
        res
          .status(401)
          .json({ success: false, message: "Account is deactivated" });
        return;
      }

      (req as AuthRequest).user = user;
      next();
      return;
    } catch (error) {
      console.error("Cookie token verification error:", error);
      res
        .status(401)
        .json({ success: false, message: "Not authorized, token failed" });
      return;
    }
  }

  // ── 3. No token at all ───────────────────────────────────────
  res.status(401).json({ success: false, message: "Not authorized, no token" });
};
