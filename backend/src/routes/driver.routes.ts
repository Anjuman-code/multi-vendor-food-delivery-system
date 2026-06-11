import { Router } from "express";
import { UserRole } from "../config/constants";
import {
    acceptOrder,
    completeDriverOnboarding,
    completeOnboardingWithDetails,
    getActiveDelivery,
    getAvailableOrders,
    getDeliveryHistory,
    getEarnings,
    getProfile,
    updateAvailability,
    updateDeliveryStatus,
    updateLocation,
    updateProfile,
    uploadDocument,
} from "../controllers/driver.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { uploadDriverDocument } from "../middleware/uploads/upload.middleware";

const router = Router();

router.use(authenticate, authorize(UserRole.DRIVER));

// Profile
router.get("/profile", getProfile);
router.patch("/profile", updateProfile);
router.patch("/availability", updateAvailability);

// Onboarding
router.patch("/onboarding", completeDriverOnboarding);
router.post("/onboarding/complete", completeOnboardingWithDetails);
router.post("/documents/upload", uploadDriverDocument, uploadDocument);

// Orders
router.get("/orders/available", getAvailableOrders);
router.get("/orders/active", getActiveDelivery);
router.post("/orders/:orderId/accept", acceptOrder);
router.patch("/orders/:orderId/status", updateDeliveryStatus);

// Location
router.post("/location", updateLocation);

// Earnings & history
router.get("/earnings", getEarnings);
router.get("/deliveries", getDeliveryHistory);

export default router;
