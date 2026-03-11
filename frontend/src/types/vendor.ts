/**
 * Vendor-specific TypeScript type definitions.
 */
import type { MenuItem, MenuCategory } from "./menu";

// ── Vendor Profile ─────────────────────────────────────────────

export interface VendorProfile {
  _id: string;
  userId: string;
  restaurantIds: VendorRestaurant[] | string[];
  businessName: string;
  businessLicense: string;
  taxId: string;
  bankDetails: Record<string, unknown>;
  commissionRate: number;
  isVerified: boolean;
  verificationDocuments: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

export interface VendorUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  profileImage?: string;
}

export interface VendorProfileData {
  user: VendorUser;
  vendorProfile: VendorProfile;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  bio?: string;
}

// ── Restaurant (Vendor view with all details) ──────────────────

export interface RestaurantAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: { lat: number; lng: number };
}

export interface RestaurantContactInfo {
  phone: string;
  email: string;
  website?: string;
}

export interface RestaurantImages {
  logo: string;
  coverPhoto: string;
  gallery: string[];
}

export interface OperatingHoursEntry {
  day: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface RestaurantRating {
  average: number;
  count: number;
}

export interface VendorRestaurant {
  _id: string;
  name: string;
  description: string;
  address: RestaurantAddress;
  contactInfo: RestaurantContactInfo;
  cuisineType: string[];
  images: RestaurantImages;
  operatingHours: OperatingHoursEntry[];
  isActive: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  rating: RestaurantRating;
  deliveryTime: string;
  deliveryFee: number;
  minimumOrder: number;
  createdAt: string;
  updatedAt: string;
  // Convenience / derived fields the API may include
  isOpen?: boolean;
  coverImage?: string;
  averageRating?: number;
  phone?: string;
  email?: string;
  estimatedDeliveryTime?: number;
  openingHours?: OperatingHoursEntry[];
}

// ── Dashboard Stats ────────────────────────────────────────────

export interface VendorDashboardStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  averageRating: number;
  avgRating?: number;
  ordersByStatus: { status: string; count: number }[];
  recentOrders: VendorOrder[];
  popularItems: PopularItem[];
}

export interface PopularItem {
  _id: string;
  name: string;
  totalOrdered: number;
  totalRevenue: number;
  orderCount?: number;
}

// ── Analytics ──────────────────────────────────────────────────

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopSellingItem {
  _id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface PeakHour {
  hour: number;
  orders: number;
}

export interface VendorAnalytics {
  period: string;
  revenueOverTime: RevenueDataPoint[];
  topSellingItems: TopSellingItem[];
  peakHours: PeakHour[];
  completionRate: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  deliveredOrders: number;
  cancelledOrders: number;
  // Convenience aliases for pages
  revenueByDay: { date: string; revenue: number }[];
  ordersByDay: { date: string; count: number }[];
  topItems: { name: string; orderCount: number; revenue: number }[];
}

// ── Orders (Vendor view) ───────────────────────────────────────

export interface VendorOrderCustomer {
  _id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email?: string;
}

export interface VendorOrderRestaurant {
  _id: string;
  name: string;
  images?: { logo?: string };
  contactInfo?: { phone?: string; email?: string };
}

export interface VendorOrderItem {
  menuItemId: string;
  menuItem?: { name: string; image?: string };
  name: string;
  price: number;
  quantity: number;
  variants?: { name: string; price: number }[];
  addons?: { name: string; price: number }[];
  specialInstructions?: string;
  itemTotal: number;
}

export type VendorOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "ready"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface VendorOrder {
  _id: string;
  orderNumber: string;
  customerId: VendorOrderCustomer | string;
  restaurantId: VendorOrderRestaurant | string;
  items: VendorOrderItem[];
  deliveryAddress: {
    street: string;
    apartment?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates: { latitude: number; longitude: number };
    instructions?: string;
  };
  status: VendorOrderStatus;
  statusHistory: { status: string; timestamp: string; note?: string }[];
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  totalAmount: number;
  couponCode?: string;
  specialInstructions?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  // Populated convenience fields
  customer?: { name: string; phone?: string; email?: string };
}

// ── Coupons ────────────────────────────────────────────────────

export interface VendorCoupon {
  _id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderAmount: number;
  minimumOrderAmount?: number;
  maxDiscount?: number;
  validFrom: string;
  validTo: string;
  startDate?: string;
  endDate?: string;
  usageLimit: number;
  usedCount: number;
  maxUses?: number;
  currentUses?: number;
  applicableRestaurants: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponStats {
  coupon: VendorCoupon;
  totalUses?: number;
  totalRevenue?: number;
  totalDiscount?: number;
  stats: {
    usedCount: number;
    usageLimit: number;
    totalOrders: number;
    totalDiscount: number;
    totalRevenue: number;
  };
}

// ── Reviews (Vendor view) ──────────────────────────────────────

export interface VendorReview {
  _id: string;
  customerId:
    | {
        _id: string;
        firstName: string;
        lastName: string;
        profileImage?: string;
      }
    | string;
  restaurantId: string;
  orderId: string;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  helpfulVotes: number;
  unhelpfulVotes: number;
  reply?: { text: string; repliedAt: string };
  createdAt: string;
  updatedAt: string;
}

// ── Payload types ──────────────────────────────────────────────

export interface CreateRestaurantPayload {
  name: string;
  description: string;
  cuisineType: string[];
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  openingHours?: {
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }[];
  minimumOrder?: number;
  deliveryFee?: number;
  estimatedDeliveryTime?: number;
  // Nested API formats (alternative)
  contactInfo?: RestaurantContactInfo;
  images?: RestaurantImages;
  operatingHours?: OperatingHoursEntry[];
  deliveryTime?: string;
}

export interface UpdateRestaurantPayload extends Partial<CreateRestaurantPayload> {
  isActive?: boolean;
}

export interface CreateMenuItemPayload {
  categoryId?: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  dietaryTags?: string[];
  variants?: { name: string; price: number }[];
  addons?: { name: string; price: number }[];
  isAvailable?: boolean;
  preparationTime?: number;
}

export interface UpdateMenuItemPayload extends Omit<
  Partial<CreateMenuItemPayload>,
  "categoryId"
> {
  categoryId?: string | null;
}

export interface CreateMenuCategoryPayload {
  name: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdateMenuCategoryPayload extends Partial<CreateMenuCategoryPayload> {
  isActive?: boolean;
}

export interface CreateCouponPayload {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderAmount?: number;
  minimumOrderAmount?: number;
  maxDiscount?: number;
  validFrom?: string;
  validTo?: string;
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  maxUses?: number;
  applicableRestaurants?: string[];
  isActive?: boolean;
}

export interface UpdateCouponPayload extends Partial<CreateCouponPayload> {}

export interface VendorOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  restaurantId?: string;
  sortBy?: string;
}

// Re-export menu types for convenience
export type { MenuItem, MenuCategory };
