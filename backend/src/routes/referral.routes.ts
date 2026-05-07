import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { createReferralCode, getMyReferral, validateReferralCode } from "../controllers/referral.controller";

const router = Router();

router.get("/validate/:code", validateReferralCode); // public
router.post("/", authenticate, createReferralCode);
router.get("/mine", authenticate, getMyReferral);

export default router;
