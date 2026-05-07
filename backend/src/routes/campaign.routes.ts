import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../config/constants";
import { createCampaign, listCampaigns, updateCampaign, deleteCampaign } from "../controllers/campaign.controller";

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN));

router.get("/", listCampaigns);
router.post("/", createCampaign);
router.put("/:id", updateCampaign);
router.delete("/:id", deleteCampaign);

export default router;
