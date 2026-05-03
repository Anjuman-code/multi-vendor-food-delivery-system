import React, { lazy, Suspense } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageLoader } from "./components/PageLoader";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { SocketProvider } from "./contexts/SocketContext";
import { AuthLayout, MainLayout, RootLayout, VendorLayout } from "./layouts";

// ── Public pages ──────────────────────────────────────────────
const NewHomePage = lazy(() => import("./pages/public/NewHomePage"));
const AboutPage = lazy(() => import("./pages/public/AboutPage"));
const CategoriesPage = lazy(() => import("./pages/public/CategoriesPage"));
const ContactPage = lazy(() => import("./pages/public/ContactPage"));
const FAQPage = lazy(() => import("./pages/public/FAQPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/public/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("./pages/public/TermsPage"));
const RestaurantsPage = lazy(() => import("./pages/public/RestaurantsPage"));
const RestaurantDetailsPage = lazy(() => import("./pages/public/RestaurantDetailsPage"));
const NotFoundPage = lazy(() => import("./pages/public/NotFoundPage"));

// ── Auth pages ─────────────────────────────────────────────────
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const VendorRegisterPage = lazy(() => import("./pages/auth/VendorRegisterPage"));
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
const OnboardingPage = lazy(() => import("./pages/customer/OnboardingPage"));

// ── Vendor pages ───────────────────────────────────────────────
const VendorDashboardPage = lazy(() => import("./pages/vendor/VendorDashboardPage"));
const VendorRestaurantsPage = lazy(() => import("./pages/vendor/VendorRestaurantsPage"));
const RestaurantFormPage = lazy(() => import("./pages/vendor/RestaurantFormPage"));
const VendorMenuPage = lazy(() => import("./pages/vendor/VendorMenuPage"));
const VendorOrdersPage = lazy(() => import("./pages/vendor/VendorOrdersPage"));
const VendorOrderDetailPage = lazy(() => import("./pages/vendor/VendorOrderDetailPage"));
const VendorReviewsPage = lazy(() => import("./pages/vendor/VendorReviewsPage"));
const VendorPromotionsPage = lazy(() => import("./pages/vendor/VendorPromotionsPage"));
const VendorAnalyticsPage = lazy(() => import("./pages/vendor/VendorAnalyticsPage"));
const VendorSettingsPage = lazy(() => import("./pages/vendor/VendorSettingsPage"));

function App(): React.ReactElement {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <SocketProvider>
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
                      <Route path="/privacy" element={<PrivacyPolicyPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/faq" element={<FAQPage />} />
                      <Route path="/help" element={<FAQPage />} />
                      <Route path="/restaurants" element={<RestaurantsPage />} />
                      <Route path="/restaurants/:id" element={<RestaurantDetailsPage />} />
                      <Route path="/categories" element={<CategoriesPage />} />

                      {/* Customer (authenticated) */}
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/favorites" element={<FavoritesPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/orders" element={<OrdersPage />} />
                      <Route path="/orders/:id" element={<OrderDetailsPage />} />
                      <Route path="/notifications" element={<NotificationsPage />} />

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
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />
                    </Route>
                  </Route>

                  {/* ── Vendor routes (own sidebar layout) ──── */}
                  <Route element={<VendorLayout />}>
                    <Route path="/vendor" element={<VendorDashboardPage />} />
                    <Route path="/vendor/restaurants" element={<VendorRestaurantsPage />} />
                    <Route path="/vendor/restaurants/new" element={<RestaurantFormPage />} />
                    <Route path="/vendor/restaurants/:id/edit" element={<RestaurantFormPage />} />
                    <Route path="/vendor/menu" element={<VendorMenuPage />} />
                    <Route path="/vendor/orders" element={<VendorOrdersPage />} />
                    <Route path="/vendor/orders/:id" element={<VendorOrderDetailPage />} />
                    <Route path="/vendor/reviews" element={<VendorReviewsPage />} />
                    <Route path="/vendor/promotions" element={<VendorPromotionsPage />} />
                    <Route path="/vendor/analytics" element={<VendorAnalyticsPage />} />
                    <Route path="/vendor/settings" element={<VendorSettingsPage />} />
                  </Route>
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </SocketProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
