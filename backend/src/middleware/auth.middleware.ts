/**
 * Authentication & authorisation middleware.
 */
import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import { verifyAccessToken } from "../utils/jwt.util";
import { UserRole } from "../config/constants";
import { IUserDocument } from "../types/user.types";

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
    }
  }
}

/**
 * Verify JWT access token from the Authorization header and attach the
 * authenticated user to `req.user`.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ success: false, message: "Access denied. No token provided." });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select("-password");

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

    req.user = user;
    next();
  } catch (error) {
    if ((error as Error).name === "TokenExpiredError") {
      res.status(401).json({ success: false, message: "Token has expired" });
      return;
    }
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

/**
 * Role-based access control – restrict endpoint to specified roles.
 *
 * @example router.get('/admin-only', authenticate, authorize(UserRole.ADMIN), handler);
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
      return;
    }

    next();
  };
};

/**
 * Require the authenticated user to have a verified email.
 */
export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Not authenticated" });
    return;
  }

  if (!req.user.isEmailVerified) {
    res.status(403).json({
      success: false,
      message: "Please verify your email address before continuing",
    });
    return;
  }

  next();
};
