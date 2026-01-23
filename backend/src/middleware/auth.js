const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key");

      // Get user from token and attach to request
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not found"
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated"
        });
      }

      next();
    } catch (error) {
      console.error("Authentication error:", error);
      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed"
      });
    }
  }

  // Check for token in cookies (for refresh token)
  if (!token && req.cookies.refreshToken) {
    try {
      const decoded = jwt.verify(req.cookies.refreshToken, process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret");
      req.user = await User.findById(decoded.id).select("-password");
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not found"
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated"
        });
      }

      next();
    } catch (error) {
      console.error("Cookie token verification error:", error);
      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed"
      });
    }
  }

  if (!token && !req.cookies.refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token"
    });
  }
};