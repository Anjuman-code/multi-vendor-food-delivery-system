import { Router } from "express";
import { AdminTier, UserRole } from "../config/constants";
import { authenticate, authorize, requireAdminTier } from "../middleware/auth.middleware";

// Dashboard
import {
    getDashboardCharts,
    getDashboardStats,
    getPendingActions,
} from "../controllers/admin.dashboard.controller";

// Users
import {
    adjustLoyaltyPoints,
    approveDriver,
    banCustomer,
    changeVendorCommission,
    createAdminUser,
    deactivateAdminUser,
    getCustomerDetail,
    getDriverDetail,
    getDriverRatings,
    getVendorDetail,
    listAdmins,
    listCustomers,
    listDriverApplications,
    listDrivers,
    listVendors,
    rejectDriver,
    suspendCustomer,
    suspendDriver,
    suspendVendor,
    unbanCustomer,
    unsuspendCustomer,
    unsuspendDriver,
    unsuspendVendor,
    updateAdminUser,
    updateCustomer,
    verifyVendor,
} from "../controllers/admin.users.controller";

// Restaurants
import {
    approveRestaurant,
    deactivateRestaurant,
    getApprovalQueue,
    getRestaurantDetail,
    getRestaurantMenu,
    listRestaurants,
    rejectRestaurant,
    reopenRestaurant,
    temporarilyCloseRestaurant,
    toggleFeatureRestaurant,
    toggleMenuItemVisibility,
    updateRestaurant,
} from "../controllers/admin.restaurants.controller";

// Orders
import {
    cancelOrder,
    getActiveOrders,
    getDisputeQueue,
    getOrderDetail,
    issueRefund,
    listOrders,
    overrideOrderStatus,
    reassignDriver,
} from "../controllers/admin.orders.controller";

// Finance
import {
    batchProcessPayouts,
    createPayout,
    getCommissionHistory,
    getPayoutDetail,
    getRevenueStats,
    listPayouts,
    processPayout,
} from "../controllers/admin.finance.controller";

// Content / Settings / Search / Reviews
import {
    approveReview,
    createContentBlock,
    createCuisineType,
    createTag,
    deleteContentBlock,
    deleteCuisineType,
    deleteTag,
    getAuditLog,
    getSettings,
    globalSearch,
    hideReview,
    listContentBlocks,
    listCuisineTypes,
    listReviewsForModeration,
    listTags,
    removeReview,
    reorderContentBlocks,
    updateContentBlock,
    updateCuisineType,
    updateSettings,
    updateTag,
} from "../controllers/admin.content.controller";

// Legacy vendor commission (kept for backward compatibility)
import { updateCommissionRate } from "../controllers/vendor.controller";

const router = Router();

// All admin routes require authentication + admin/support role
const adminAuth = [authenticate, authorize(UserRole.ADMIN, UserRole.SUPPORT)];
const adminOnly = [authenticate, authorize(UserRole.ADMIN)];
const superAdminOnly = [
  authenticate,
  authorize(UserRole.ADMIN),
  requireAdminTier(AdminTier.SUPER_ADMIN),
];

// ── Dashboard ─────────────────────────────────────────────────────
router.get("/dashboard/stats", ...adminAuth, getDashboardStats);
router.get("/dashboard/charts", ...adminAuth, getDashboardCharts);
router.get("/dashboard/pending-actions", ...adminAuth, getPendingActions);

// ── Global Search ────────────────────────────────────────────────
router.get("/search", ...adminAuth, globalSearch);

// ── Audit Log ─────────────────────────────────────────────────────
router.get("/audit-log", ...adminAuth, getAuditLog);

// ── Customers ────────────────────────────────────────────────────
router.get("/users/customers", ...adminAuth, listCustomers);
router.get("/users/customers/:id", ...adminAuth, getCustomerDetail);
router.patch("/users/customers/:id", ...adminOnly, updateCustomer);
router.post("/users/customers/:id/suspend", ...adminOnly, suspendCustomer);
router.post("/users/customers/:id/unsuspend", ...adminOnly, unsuspendCustomer);
router.post("/users/customers/:id/ban", ...superAdminOnly, banCustomer);
router.post("/users/customers/:id/unban", ...superAdminOnly, unbanCustomer);
router.post("/users/customers/:id/loyalty", ...adminOnly, adjustLoyaltyPoints);

// ── Vendors ──────────────────────────────────────────────────────
router.get("/users/vendors", ...adminAuth, listVendors);
router.get("/users/vendors/:id", ...adminAuth, getVendorDetail);
router.post("/users/vendors/:id/verify", ...adminOnly, verifyVendor);
router.post("/users/vendors/:id/commission", ...superAdminOnly, changeVendorCommission);
router.post("/users/vendors/:id/suspend", ...adminOnly, suspendVendor);
router.post("/users/vendors/:id/unsuspend", ...adminOnly, unsuspendVendor);
// Legacy
router.patch("/vendors/:vendorId/commission", ...superAdminOnly, updateCommissionRate);

// ── Drivers ──────────────────────────────────────────────────────
router.get("/users/drivers", ...adminAuth, listDrivers);
router.get("/users/drivers/applications", ...adminAuth, listDriverApplications);
router.get("/users/drivers/:id", ...adminAuth, getDriverDetail);
router.get("/users/drivers/:id/ratings", ...adminAuth, getDriverRatings);
router.post("/users/drivers/:id/approve", ...adminOnly, approveDriver);
router.post("/users/drivers/:id/reject", ...adminOnly, rejectDriver);
router.post("/users/drivers/:id/suspend", ...adminOnly, suspendDriver);
router.post("/users/drivers/:id/unsuspend", ...adminOnly, unsuspendDriver);

// ── Admin Team (super_admin only) ────────────────────────────────
router.get("/team", ...superAdminOnly, listAdmins);
router.post("/team", ...superAdminOnly, createAdminUser);
router.patch("/team/:id", ...superAdminOnly, updateAdminUser);
router.post("/team/:id/deactivate", ...superAdminOnly, deactivateAdminUser);

// ── Restaurants ──────────────────────────────────────────────────
router.get("/restaurants", ...adminAuth, listRestaurants);
router.get("/restaurants/approval-queue", ...adminAuth, getApprovalQueue);
router.get("/restaurants/:id", ...adminAuth, getRestaurantDetail);
router.patch("/restaurants/:id", ...adminOnly, updateRestaurant);
router.post("/restaurants/:id/approve", ...adminOnly, approveRestaurant);
router.post("/restaurants/:id/reject", ...adminOnly, rejectRestaurant);
router.post("/restaurants/:id/feature", ...adminOnly, toggleFeatureRestaurant);
router.post("/restaurants/:id/close", ...adminOnly, temporarilyCloseRestaurant);
router.post("/restaurants/:id/reopen", ...adminOnly, reopenRestaurant);
router.post("/restaurants/:id/deactivate", ...superAdminOnly, deactivateRestaurant);
router.get("/restaurants/:id/menu", ...adminAuth, getRestaurantMenu);
router.patch("/restaurants/:restaurantId/menu/:itemId/visibility", ...adminOnly, toggleMenuItemVisibility);

// ── Orders ───────────────────────────────────────────────────────
router.get("/orders", ...adminAuth, listOrders);
router.get("/orders/active", ...adminAuth, getActiveOrders);
router.get("/orders/disputes", ...adminAuth, getDisputeQueue);
router.get("/orders/:id", ...adminAuth, getOrderDetail);
router.patch("/orders/:id/status", ...adminOnly, overrideOrderStatus);
router.post("/orders/:id/cancel", ...adminOnly, cancelOrder);
router.post("/orders/:id/refund", ...adminOnly, issueRefund);
router.post("/orders/:id/reassign-driver", ...adminOnly, reassignDriver);

// ── Finance (super_admin only) ───────────────────────────────────
router.get("/finance/payouts", ...superAdminOnly, listPayouts);
router.post("/finance/payouts", ...superAdminOnly, createPayout);
router.post("/finance/payouts/batch-process", ...superAdminOnly, batchProcessPayouts);
router.get("/finance/payouts/:id", ...superAdminOnly, getPayoutDetail);
router.post("/finance/payouts/:id/process", ...superAdminOnly, processPayout);
router.get("/finance/revenue", ...superAdminOnly, getRevenueStats);
router.get("/finance/commission-history", ...superAdminOnly, getCommissionHistory);

// ── Content: Cuisine Types ────────────────────────────────────────
router.get("/content/cuisine-types", ...adminAuth, listCuisineTypes);
router.post("/content/cuisine-types", ...adminOnly, createCuisineType);
router.patch("/content/cuisine-types/:id", ...adminOnly, updateCuisineType);
router.delete("/content/cuisine-types/:id", ...superAdminOnly, deleteCuisineType);

// ── Content: Tags ────────────────────────────────────────────────
router.get("/content/tags", ...adminAuth, listTags);
router.post("/content/tags", ...adminOnly, createTag);
router.patch("/content/tags/:id", ...adminOnly, updateTag);
router.delete("/content/tags/:id", ...superAdminOnly, deleteTag);

// ── Content: Blocks (Homepage Curation) ──────────────────────────
router.get("/content/blocks", ...adminAuth, listContentBlocks);
router.post("/content/blocks", ...adminOnly, createContentBlock);
router.patch("/content/blocks/reorder", ...adminOnly, reorderContentBlocks);
router.patch("/content/blocks/:id", ...adminOnly, updateContentBlock);
router.delete("/content/blocks/:id", ...adminOnly, deleteContentBlock);

// ── Review Moderation ────────────────────────────────────────────
router.get("/reviews", ...adminAuth, listReviewsForModeration);
router.post("/reviews/:id/approve", ...adminOnly, approveReview);
router.post("/reviews/:id/remove", ...adminOnly, removeReview);
router.post("/reviews/:id/hide", ...adminOnly, hideReview);

// ── Platform Settings (super_admin only) ─────────────────────────
router.get("/settings", ...adminAuth, getSettings);
router.patch("/settings", ...superAdminOnly, updateSettings);

export default router;
