/**
 * Menu routes – public endpoints for browsing restaurant menus.
 */
import { Router } from "express";
import { getMenu, getMenuItem } from "../controllers/menu.controller";

const router = Router();

// Public routes – no auth required
router.get("/:restaurantId/menu", getMenu);
router.get("/:restaurantId/menu/:itemId", getMenuItem);

export default router;
