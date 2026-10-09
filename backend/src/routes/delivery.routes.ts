/**
 * Delivery Routes.
 *
 * Public & Customer:
 * - POST /api/delivery/quote
 * - GET /api/delivery/campaigns/active
 * - GET /api/delivery/geocode/search
 * - GET /api/delivery/geocode/reverse
 * - GET /api/delivery/health
 *
 * Admin:
 * - GET /api/delivery/admin/settings
 * - PUT /api/delivery/admin/settings
 * - POST /api/delivery/admin/simulate
 * - GET /api/delivery/admin/campaigns
 * - POST /api/delivery/admin/campaigns
 * - GET /api/delivery/admin/campaigns/:id
 * - PUT /api/delivery/admin/campaigns/:id
 * - DELETE /api/delivery/admin/campaigns/:id
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { UserRole } from "../config/constants";
import { authenticate, authorize } from "../middleware/auth.middleware";
import {
  createDeliveryCampaign,
  deleteDeliveryCampaign,
  getActiveDeliveryCampaigns,
  getDeliveryCampaign,
  getDeliveryHealth,
  getDeliveryQuote,
  getDeliverySettings,
  geocodeReverse,
  geocodeSearch,
  listDeliveryCampaigns,
  simulateDelivery,
  updateDeliveryCampaign,
  updateDeliverySettings,
} from "../controllers/delivery.controller";

const router = Router();

// ── Rate limiters for public endpoints ───────────────────────────

const quoteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 quote requests / min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many delivery quote requests. Please try again shortly." },
});

const geocodeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 geocode requests / min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many geocoding requests. Please try again shortly." },
});

// ── Public & Customer Endpoints ──────────────────────────────────

router.post("/quote", quoteLimiter, getDeliveryQuote);
router.get("/campaigns/active", getActiveDeliveryCampaigns);
router.get("/geocode/search", geocodeLimiter, geocodeSearch);
router.get("/geocode/reverse", geocodeLimiter, geocodeReverse);
router.get("/health", getDeliveryHealth);

// ── Admin Endpoints ──────────────────────────────────────────────

router.use("/admin", authenticate, authorize(UserRole.ADMIN));

router.get("/admin/settings", getDeliverySettings);
router.put("/admin/settings", updateDeliverySettings);
router.post("/admin/simulate", simulateDelivery);

router.get("/admin/campaigns", listDeliveryCampaigns);
router.post("/admin/campaigns", createDeliveryCampaign);
router.get("/admin/campaigns/:id", getDeliveryCampaign);
router.put("/admin/campaigns/:id", updateDeliveryCampaign);
router.delete("/admin/campaigns/:id", deleteDeliveryCampaign);

export default router;
