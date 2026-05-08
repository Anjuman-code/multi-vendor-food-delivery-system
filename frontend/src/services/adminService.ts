/**
 * Admin API service — wraps all /api/admin/* endpoints.
 */
import httpClient from "@/lib/httpClient";

// ── Types ─────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  adminTier?: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  isSuspended?: boolean;
  suspendedReason?: string;
  suspendedUntil?: string | null;
  isBanned?: boolean;
  bannedReason?: string;
  bannedAt?: string;
  createdAt: string;
  lastLogin?: string;
  profileImage?: string;
}

export interface AdminRestaurant {
  _id: string;
  name: string;
  address: { street: string; area: string; district: string };
  cuisineType: string[];
  approvalStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
  isTemporarilyClosed: boolean;
  isFeatured?: boolean;
  rating: { average: number; count: number };
  totalOrders: number;
  createdAt: string;
}

export interface AdminOrder {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  tipAmount: number;
  discount: number;
  createdAt: string;
  customerId: { firstName: string; lastName: string; email: string } | string;
  restaurantId: { name: string } | string;
  driverId?: { firstName: string; lastName: string } | string | null;
  couponCode?: string;
}

export interface DashboardStats {
  today: {
    gmv: number;
    revenue: number;
    orders: number;
    cancelledOrders: number;
    deliveredOrders: number;
    cancellationRate: number;
    avgOrderValue: number;
    newCustomers: number;
  };
  yesterday: { gmv: number; revenue: number; orders: number; newCustomers: number };
  changes: { gmvPct: number | null; ordersPct: number | null; customersPct: number | null };
  thisWeek: { orders: number; gmv: number };
  lastWeek: { orders: number; gmv: number };
  weekChanges: { ordersPct: number | null; gmvPct: number | null };
  liveOperations: { activeOrders: Record<string, number>; stuckPendingOrders: number };
  pendingActions: {
    vendorApplications: number;
    driverApplications: number;
    restaurantApprovals: number;
    openSupportTickets: number;
  };
}

export type ChartRange = "7d" | "30d" | "90d";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ── Dashboard ─────────────────────────────────────────────────────

const adminService = {
  // Dashboard
  getDashboardStats: () =>
    httpClient.get<{ data: { data: DashboardStats } }>("/api/admin/dashboard/stats"),

  getDashboardCharts: (range: ChartRange = "30d") =>
    httpClient.get("/api/admin/dashboard/charts", { params: { range } }),

  getPendingActions: () =>
    httpClient.get("/api/admin/dashboard/pending-actions"),

  // Global Search
  search: (q: string) =>
    httpClient.get("/api/admin/search", { params: { q } }),

  // Audit Log
  getAuditLog: (params?: Record<string, unknown>) =>
    httpClient.get("/api/admin/audit-log", { params }),

  // ── Customers ─────────────────────────────────────────────────

  listCustomers: (params?: Record<string, unknown>) =>
    httpClient.get("/api/admin/users/customers", { params }),

  getCustomer: (id: string) =>
    httpClient.get(`/api/admin/users/customers/${id}`),

  updateCustomer: (id: string, data: Record<string, unknown>) =>
    httpClient.patch(`/api/admin/users/customers/${id}`, data),

  suspendCustomer: (id: string, data: { reason: string; durationDays?: number }) =>
    httpClient.post(`/api/admin/users/customers/${id}/suspend`, data),

  unsuspendCustomer: (id: string, data: { reason: string }) =>
    httpClient.post(`/api/admin/users/customers/${id}/unsuspend`, data),

  banCustomer: (id: string, data: { reason: string }) =>
    httpClient.post(`/api/admin/users/customers/${id}/ban`, data),

  unbanCustomer: (id: string, data: { reason: string }) =>
    httpClient.post(`/api/admin/users/customers/${id}/unban`, data),

  adjustLoyalty: (id: string, data: { points: number; reason: string }) =>
    httpClient.post(`/api/admin/users/customers/${id}/loyalty`, data),

  // ── Vendors ───────────────────────────────────────────────────

  listVendors: (params?: Record<string, unknown>) =>
    httpClient.get("/api/admin/users/vendors", { params }),

  getVendor: (id: string) =>
    httpClient.get(`/api/admin/users/vendors/${id}`),

  verifyVendor: (id: string, data: { action: "approve" | "reject"; reason?: string }) =>
    httpClient.post(`/api/admin/users/vendors/${id}/verify`, data),

  changeVendorCommission: (id: string, data: { rate: number; reason: string }) =>
    httpClient.post(`/api/admin/users/vendors/${id}/commission`, data),

  suspendVendor: (id: string, data: { reason: string; durationDays?: number }) =>
    httpClient.post(`/api/admin/users/vendors/${id}/suspend`, data),

  // ── Drivers ───────────────────────────────────────────────────

  listDrivers: (params?: Record<string, unknown>) =>
    httpClient.get("/api/admin/users/drivers", { params }),

  listDriverApplications: (params?: Record<string, unknown>) =>
    httpClient.get("/api/admin/users/drivers/applications", { params }),

  getDriver: (id: string) =>
    httpClient.get(`/api/admin/users/drivers/${id}`),

  getDriverRatings: (id: string, params?: Record<string, unknown>) =>
    httpClient.get(`/api/admin/users/drivers/${id}/ratings`, { params }),

  approveDriver: (id: string, data?: { welcomeNote?: string }) =>
    httpClient.post(`/api/admin/users/drivers/${id}/approve`, data ?? {}),

  rejectDriver: (id: string, data: { reason: string }) =>
    httpClient.post(`/api/admin/users/drivers/${id}/reject`, data),

  suspendDriver: (id: string, data: { reason: string; durationDays?: number }) =>
    httpClient.post(`/api/admin/users/drivers/${id}/suspend`, data),

  unsuspendDriver: (id: string, data: { reason: string }) =>
    httpClient.post(`/api/admin/users/drivers/${id}/unsuspend`, data),

  // ── Admin Team ─────────────────────────────────────────────────

  listAdmins: () => httpClient.get("/api/admin/team"),

  createAdmin: (data: Record<string, unknown>) =>
    httpClient.post("/api/admin/team", data),

  updateAdmin: (id: string, data: Record<string, unknown>) =>
    httpClient.patch(`/api/admin/team/${id}`, data),

  deactivateAdmin: (id: string) =>
    httpClient.post(`/api/admin/team/${id}/deactivate`),

  // ── Restaurants ───────────────────────────────────────────────

  listRestaurants: (params?: Record<string, unknown>) =>
    httpClient.get("/api/admin/restaurants", { params }),

  getApprovalQueue: () =>
    httpClient.get("/api/admin/restaurants/approval-queue"),

  getRestaurant: (id: string) =>
    httpClient.get(`/api/admin/restaurants/${id}`),

  updateRestaurant: (id: string, data: Record<string, unknown>) =>
    httpClient.patch(`/api/admin/restaurants/${id}`, data),

  approveRestaurant: (id: string, data?: { welcomeMessage?: string }) =>
    httpClient.post(`/api/admin/restaurants/${id}/approve`, data),

  rejectRestaurant: (id: string, data: { reason: string }) =>
    httpClient.post(`/api/admin/restaurants/${id}/reject`, data),

  featureRestaurant: (id: string) =>
    httpClient.post(`/api/admin/restaurants/${id}/feature`),

  closeRestaurant: (id: string, data: { reason: string; reopenDate?: string }) =>
    httpClient.post(`/api/admin/restaurants/${id}/close`, data),

  reopenRestaurant: (id: string) =>
    httpClient.post(`/api/admin/restaurants/${id}/reopen`),

  deactivateRestaurant: (id: string, data: { reason: string }) =>
    httpClient.post(`/api/admin/restaurants/${id}/deactivate`, data),

  getRestaurantMenu: (id: string) =>
    httpClient.get(`/api/admin/restaurants/${id}/menu`),

  toggleMenuItemVisibility: (restaurantId: string, itemId: string) =>
    httpClient.patch(`/api/admin/restaurants/${restaurantId}/menu/${itemId}/visibility`),

  // ── Orders ────────────────────────────────────────────────────

  listOrders: (params?: Record<string, unknown>) =>
    httpClient.get("/api/admin/orders", { params }),

  getOrder: (id: string) =>
    httpClient.get(`/api/admin/orders/${id}`),

  overrideOrderStatus: (id: string, data: { status: string; reason: string }) =>
    httpClient.patch(`/api/admin/orders/${id}/status`, data),

  cancelOrder: (id: string, data: { reason: string }) =>
    httpClient.post(`/api/admin/orders/${id}/cancel`, data),

  issueRefund: (id: string, data: { amount: number; reason: string; lineItems?: unknown[] }) =>
    httpClient.post(`/api/admin/orders/${id}/refund`, data),

  reassignDriver: (id: string, data: { driverId: string; reason: string }) =>
    httpClient.post(`/api/admin/orders/${id}/reassign-driver`, data),

  getDisputeQueue: () =>
    httpClient.get("/api/admin/orders/disputes"),

  // ── Finance ───────────────────────────────────────────────────

  listPayouts: (params?: Record<string, unknown>) =>
    httpClient.get("/api/admin/finance/payouts", { params }),

  getPayout: (id: string) =>
    httpClient.get(`/api/admin/finance/payouts/${id}`),

  processPayout: (id: string, data?: { transactionRef?: string }) =>
    httpClient.post(`/api/admin/finance/payouts/${id}/process`, data),

  getRevenue: (range?: string) =>
    httpClient.get("/api/admin/finance/revenue", { params: { range } }),

  getCommissionHistory: () =>
    httpClient.get("/api/admin/finance/commission-history"),

  // ── Content ───────────────────────────────────────────────────

  listCuisineTypes: () => httpClient.get("/api/admin/content/cuisine-types"),
  createCuisineType: (data: Record<string, unknown>) =>
    httpClient.post("/api/admin/content/cuisine-types", data),
  updateCuisineType: (id: string, data: Record<string, unknown>) =>
    httpClient.patch(`/api/admin/content/cuisine-types/${id}`, data),
  deleteCuisineType: (id: string) =>
    httpClient.delete(`/api/admin/content/cuisine-types/${id}`),

  listTags: () => httpClient.get("/api/admin/content/tags"),
  createTag: (data: Record<string, unknown>) =>
    httpClient.post("/api/admin/content/tags", data),
  updateTag: (id: string, data: Record<string, unknown>) =>
    httpClient.patch(`/api/admin/content/tags/${id}`, data),
  deleteTag: (id: string) => httpClient.delete(`/api/admin/content/tags/${id}`),

  listContentBlocks: () => httpClient.get("/api/admin/content/blocks"),
  createContentBlock: (data: Record<string, unknown>) =>
    httpClient.post("/api/admin/content/blocks", data),
  updateContentBlock: (id: string, data: Record<string, unknown>) =>
    httpClient.patch(`/api/admin/content/blocks/${id}`, data),
  deleteContentBlock: (id: string) =>
    httpClient.delete(`/api/admin/content/blocks/${id}`),

  // ── Review Moderation ─────────────────────────────────────────

  listReviews: (params?: Record<string, unknown>) =>
    httpClient.get("/api/admin/reviews", { params }),

  approveReview: (id: string) =>
    httpClient.post(`/api/admin/reviews/${id}/approve`),

  removeReview: (id: string, data: { reason: string }) =>
    httpClient.post(`/api/admin/reviews/${id}/remove`, data),

  hideReview: (id: string) =>
    httpClient.post(`/api/admin/reviews/${id}/hide`),

  // ── Platform Settings ─────────────────────────────────────────

  getSettings: () => httpClient.get("/api/admin/settings"),
  updateSettings: (data: Record<string, unknown>) =>
    httpClient.patch("/api/admin/settings", data),
};

export default adminService;
