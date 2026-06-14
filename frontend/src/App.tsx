import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoader } from "@/components/PageLoader";
import { RouteProgressBar } from "@/components/RouteProgressBar";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AuthLayout, MainLayout, RootLayout, VendorLayout } from "@/layouts";
import React, { lazy, Suspense } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

// ── Public pages ──────────────────────────────────────
const NewHomePage = lazy(() => import("@/pages/public/NewHomePage"));
const AboutPage = lazy(() => import("@/pages/public/AboutPage"));
const CareersPage = lazy(() => import("@/pages/public/CareersPage"));
const CategoriesPage = lazy(() => import("@/pages/public/CategoriesPage"));
const MenuItemDetailPage = lazy(() => import("@/pages/public/MenuItemDetailPage"));
const ContactPage = lazy(() => import("@/pages/public/ContactPage"));
const FAQPage = lazy(() => import("./pages/public/FAQPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/public/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("./pages/public/TermsPage"));
const RefundPolicyPage = lazy(() => import("./pages/public/RefundPolicyPage"));
const RestaurantsPage = lazy(() => import("./pages/public/RestaurantsPage"));
const RestaurantDetailsPage = lazy(() => import("./pages/public/RestaurantDetailsPage"));
const NotFoundPage = lazy(() => import("./pages/public/NotFoundPage"));

// ── Auth pages ─────────────────────────────────────────────────
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const VendorRegisterPage = lazy(() => import("./pages/auth/VendorRegisterPage"));
const RiderRegisterPage = lazy(() => import("./pages/auth/RiderRegisterPage"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));
const GoogleAuthCallbackPage = lazy(() => import("./pages/auth/GoogleAuthCallbackPage"));

// ── Customer pages ─────────────────────────────────────────────
const ProfilePage = lazy(() => import("./pages/customer/ProfilePage"));
const FavoritesPage = lazy(() => import("./pages/customer/FavoritesPage"));
const CartPage = lazy(() => import("./pages/customer/CartPage"));
const CheckoutPage = lazy(() => import("./pages/customer/CheckoutPage"));
const OrdersPage = lazy(() => import("./pages/customer/OrdersPage"));
const OrderDetailsPage = lazy(() => import("./pages/customer/OrderDetailsPage"));
const NotificationsPage = lazy(() => import("./pages/customer/NotificationsPage"));
const SupportPage = lazy(() => import("./pages/customer/SupportPage"));
const CreateTicketPage = lazy(() => import("./pages/customer/CreateTicketPage"));
const TicketDetailPage = lazy(() => import("./pages/customer/TicketDetailPage"));
const OnboardingPage = lazy(() => import("./pages/customer/OnboardingPage"));

// ── Vendor pages ───────────────────────────────────────────────
const VendorDashboardPage = lazy(() => import("./pages/vendor/VendorDashboardPage"));
const VendorRestaurantsPage = lazy(() => import("./pages/vendor/VendorRestaurantsPage"));
const RestaurantFormPage = lazy(() => import("./pages/vendor/RestaurantFormPage"));
const VendorMenuPage = lazy(() => import("./pages/vendor/VendorMenuPage"));
const MenuItemEditorPage = lazy(() => import("./pages/vendor/MenuItemEditorPage"));
const VendorOrdersPage = lazy(() => import("./pages/vendor/VendorOrdersPage"));
const VendorOrderDetailPage = lazy(() => import("./pages/vendor/VendorOrderDetailPage"));
const VendorReviewsPage = lazy(() => import("./pages/vendor/VendorReviewsPage"));
const VendorPromotionsPage = lazy(() => import("./pages/vendor/VendorPromotionsPage"));
const VendorAnalyticsPage = lazy(() => import("./pages/vendor/VendorAnalyticsPage"));
const VendorEarningsPage = lazy(() => import("./pages/vendor/VendorEarningsPage"));
const VendorCustomersPage = lazy(() => import("./pages/vendor/VendorCustomersPage"));
const VendorSettingsPage = lazy(() => import("./pages/vendor/VendorSettingsPage"));
const VendorSupportPage = lazy(() => import("./pages/vendor/VendorSupportPage"));
const VendorCreateTicketPage = lazy(() => import("./pages/vendor/VendorCreateTicketPage"));
const VendorTicketDetailPage = lazy(() => import("./pages/vendor/VendorTicketDetailPage"));
const VendorOnboardingPage = lazy(() => import("./pages/vendor/VendorOnboardingPage"));

// ── Rider pages ────────────────────────────────────────────────
const RiderLayout = lazy(() => import("./layouts/RiderLayout"));
const RiderDashboardPage = lazy(() => import("./pages/rider/RiderDashboardPage"));
const AvailableDeliveriesPage = lazy(() => import("./pages/rider/AvailableDeliveriesPage"));
const ActiveDeliveryPage = lazy(() => import("./pages/rider/ActiveDeliveryPage"));
const RiderEarningsPage = lazy(() => import("./pages/rider/RiderEarningsPage"));
const RiderHistoryPage = lazy(() => import("./pages/rider/RiderHistoryPage"));
const RiderProfilePage = lazy(() => import("./pages/rider/RiderProfilePage"));
const RiderSupportPage = lazy(() => import("./pages/rider/RiderSupportPage"));
const RiderCreateTicketPage = lazy(() => import("./pages/rider/RiderCreateTicketPage"));
const RiderTicketDetailPage = lazy(() => import("./pages/rider/RiderTicketDetailPage"));
const RiderOnboardingPage = lazy(() => import("./pages/rider/RiderOnboardingPage"));

// ── Admin pages ─────────────────────────────────────────────────
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminCustomersPage = lazy(() => import("./pages/admin/users/CustomersPage"));
const AdminCustomerDetailPage = lazy(() => import("./pages/admin/users/CustomerDetailPage"));
const AdminVendorsPage = lazy(() => import("./pages/admin/users/VendorsPage"));
const AdminVendorDetailPage = lazy(() => import("./pages/admin/users/VendorDetailPage"));
const AdminDriversPage = lazy(() => import("./pages/admin/users/DriversPage"));
const AdminDriverDetailPage = lazy(() => import("./pages/admin/users/DriverDetailPage"));
const AdminRestaurantsPage = lazy(() => import("./pages/admin/restaurants/RestaurantsPage"));
const AdminApprovalQueuePage = lazy(() => import("./pages/admin/restaurants/ApprovalQueuePage"));
const AdminRestaurantDetailPage = lazy(() => import("./pages/admin/restaurants/RestaurantDetailPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/orders/OrdersPage"));
const AdminOrderDetailPage = lazy(() => import("./pages/admin/orders/OrderDetailPage"));
const AdminPayoutsPage = lazy(() => import("./pages/admin/finance/PayoutsPage"));
const AdminRevenueReportsPage = lazy(() => import("./pages/admin/finance/RevenueReportsPage"));
const AdminSupportPage = lazy(() => import("./pages/admin/support/SupportPage"));
const AdminTicketDetailPage = lazy(() => import("./pages/admin/support/AdminTicketDetailPage"));
const AdminDisputePage = lazy(() => import("./pages/admin/support/DisputePage"));
const AdminReviewModerationPage = lazy(() => import("./pages/admin/support/ReviewModerationPage"));
const AdminTaxonomyPage = lazy(() => import("./pages/admin/content/TaxonomyPage"));
const AdminContentBlocksPage = lazy(() => import("./pages/admin/content/ContentBlocksPage"));
const AdminAuditLogPage = lazy(() => import("./pages/admin/system/AuditLogPage"));
const AdminTeamPage = lazy(() => import("./pages/admin/system/AdminTeamPage"));
const AdminPlatformSettingsPage = lazy(() => import("./pages/admin/settings/PlatformSettingsPage"));

function App(): React.ReactElement {
  return (
    <Router>
      <RouteProgressBar />
      <AuthProvider>
        <CartProvider>
          <ConfirmProvider>
            <SocketProvider>
            <NotificationProvider>
            <Toaster />
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ── Main layout: public + customer pages ── */}
                  <Route element={<RootLayout />}>
                    <Route element={<MainLayout />}>
                      {/* Public */}
                      <Route path="/" element={<NewHomePage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/careers" element={<CareersPage />} />
                      <Route path="/privacy" element={<PrivacyPolicyPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/refund" element={<RefundPolicyPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/faq" element={<FAQPage />} />
                      <Route path="/help" element={<FAQPage />} />
                      <Route path="/restaurants" element={<RestaurantsPage />} />
                      <Route path="/restaurants/:id" element={<RestaurantDetailsPage />} />
                      <Route path="/categories" element={<CategoriesPage />} />
                      <Route path="/menu/:restaurantId/:itemId" element={<MenuItemDetailPage />} />

                      {/* Customer (authenticated) */}
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/favorites" element={<FavoritesPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/orders" element={<OrdersPage />} />
                      <Route path="/orders/:id" element={<OrderDetailsPage />} />
                      <Route path="/notifications" element={<NotificationsPage />} />
                      <Route path="/support" element={<SupportPage />} />
                      <Route path="/support/new" element={<CreateTicketPage />} />
                      <Route path="/support/:id" element={<TicketDetailPage />} />

                      <Route path="*" element={<NotFoundPage />} />
                    </Route>

                    {/* Onboarding: uses RootLayout directly (no navbar/footer) */}
                    <Route path="/onboarding" element={<OnboardingPage />} />

                    {/* Auth */}
                    <Route element={<AuthLayout />}>
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/auth/google/callback" element={<GoogleAuthCallbackPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/vendor/register" element={<VendorRegisterPage />} />
                      <Route path="/rider/register" element={<RiderRegisterPage />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />
                    </Route>
                  </Route>

                  {/* Vendor onboarding (no sidebar) */}
                  <Route path="/vendor/onboarding" element={<VendorOnboardingPage />} />

                  {/* ── Vendor routes (own sidebar layout) ──── */}
                  <Route element={<VendorLayout />}>
                    <Route path="/vendor" element={<VendorDashboardPage />} />
                    <Route path="/vendor/restaurants" element={<VendorRestaurantsPage />} />
                    <Route path="/vendor/restaurants/new" element={<RestaurantFormPage />} />
                    <Route path="/vendor/restaurants/:id/edit" element={<RestaurantFormPage />} />
                    <Route path="/vendor/menu" element={<VendorMenuPage />} />
                    <Route path="/vendor/menu/items/new" element={<MenuItemEditorPage />} />
                    <Route path="/vendor/menu/items/:itemId/edit" element={<MenuItemEditorPage />} />
                    <Route path="/vendor/orders" element={<VendorOrdersPage />} />
                    <Route path="/vendor/orders/:id" element={<VendorOrderDetailPage />} />
                    <Route path="/vendor/reviews" element={<VendorReviewsPage />} />
                    <Route path="/vendor/promotions" element={<VendorPromotionsPage />} />
                    <Route path="/vendor/analytics" element={<VendorAnalyticsPage />} />
                    <Route path="/vendor/earnings" element={<VendorEarningsPage />} />
                    <Route path="/vendor/customers" element={<VendorCustomersPage />} />
                    <Route path="/vendor/settings" element={<VendorSettingsPage />} />
                    <Route path="/vendor/support" element={<VendorSupportPage />} />
                    <Route path="/vendor/support/new" element={<VendorCreateTicketPage />} />
                    <Route path="/vendor/support/:id" element={<VendorTicketDetailPage />} />
                  </Route>

                  {/* ── Rider routes (own sidebar layout) ───── */}
                  <Route element={<RiderLayout />}>
                    <Route path="/rider" element={<RiderDashboardPage />} />
                    <Route path="/rider/available" element={<AvailableDeliveriesPage />} />
                    <Route path="/rider/active" element={<ActiveDeliveryPage />} />
                    <Route path="/rider/earnings" element={<RiderEarningsPage />} />
                    <Route path="/rider/history" element={<RiderHistoryPage />} />
                    <Route path="/rider/profile" element={<RiderProfilePage />} />
                    <Route path="/rider/support" element={<RiderSupportPage />} />
                    <Route path="/rider/support/new" element={<RiderCreateTicketPage />} />
                    <Route path="/rider/support/:id" element={<RiderTicketDetailPage />} />
                  </Route>

                  {/* Rider onboarding (no sidebar) */}
                  <Route path="/rider/onboarding" element={<RiderOnboardingPage />} />

                  {/* ── Admin routes (own sidebar layout) ───── */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="users/customers" element={<AdminCustomersPage />} />
                    <Route path="users/customers/:id" element={<AdminCustomerDetailPage />} />
                    <Route path="users/vendors" element={<AdminVendorsPage />} />
                    <Route path="users/vendors/:id" element={<AdminVendorDetailPage />} />
                    <Route path="users/drivers" element={<AdminDriversPage />} />
                    <Route path="users/drivers/:id" element={<AdminDriverDetailPage />} />
                    <Route path="restaurants" element={<AdminRestaurantsPage />} />
                    <Route path="restaurants/approval-queue" element={<AdminApprovalQueuePage />} />
                    <Route path="restaurants/:id" element={<AdminRestaurantDetailPage />} />
                    <Route path="orders" element={<AdminOrdersPage />} />
                    <Route path="orders/:id" element={<AdminOrderDetailPage />} />
                    <Route path="finance/payouts" element={<AdminPayoutsPage />} />
                    <Route path="finance/revenue" element={<AdminRevenueReportsPage />} />
                    <Route path="support" element={<AdminSupportPage />} />
                    <Route path="support/:id" element={<AdminTicketDetailPage />} />
                    <Route path="disputes" element={<AdminDisputePage />} />
                    <Route path="reviews" element={<AdminReviewModerationPage />} />
                    <Route path="content/taxonomy" element={<AdminTaxonomyPage />} />
                    <Route path="content/blocks" element={<AdminContentBlocksPage />} />
                    <Route path="audit-log" element={<AdminAuditLogPage />} />
                    <Route path="team" element={<AdminTeamPage />} />
                    <Route path="settings" element={<AdminPlatformSettingsPage />} />
                  </Route>
                </Routes>
              </Suspense>
            </ErrorBoundary>
            </NotificationProvider>
          </SocketProvider>
          </ConfirmProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
