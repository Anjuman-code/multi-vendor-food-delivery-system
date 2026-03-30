import React, { lazy, Suspense } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageLoader } from "./components/PageLoader";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import {
  AccountLayout,
  AuthLayout,
  MainLayout,
  RootLayout,
  VendorLayout,
} from "./layouts";

// Public pages
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NewHomePage = lazy(() => import("./pages/NewHomePage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const VendorRegisterPage = lazy(() => import("./pages/VendorRegisterPage"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

// Info pages
const AboutPage = lazy(() => import("./pages/AboutPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));

// User pages
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const RestaurantDetailsPage = lazy(
  () => import("./pages/RestaurantDetailsPage"),
);
const RestaurantsPage = lazy(() => import("./pages/RestaurantsPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const OrderDetailsPage = lazy(() => import("./pages/OrderDetailsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

// Vendor pages
const VendorDashboardPage = lazy(
  () => import("./pages/vendor/VendorDashboardPage"),
);
const VendorRestaurantsPage = lazy(
  () => import("./pages/vendor/VendorRestaurantsPage"),
);
const RestaurantFormPage = lazy(
  () => import("./pages/vendor/RestaurantFormPage"),
);
const VendorMenuPage = lazy(() => import("./pages/vendor/VendorMenuPage"));
const VendorOrdersPage = lazy(() => import("./pages/vendor/VendorOrdersPage"));
const VendorOrderDetailPage = lazy(
  () => import("./pages/vendor/VendorOrderDetailPage"),
);
const VendorReviewsPage = lazy(
  () => import("./pages/vendor/VendorReviewsPage"),
);
const VendorPromotionsPage = lazy(
  () => import("./pages/vendor/VendorPromotionsPage"),
);
const VendorAnalyticsPage = lazy(
  () => import("./pages/vendor/VendorAnalyticsPage"),
);
const VendorSettingsPage = lazy(
  () => import("./pages/vendor/VendorSettingsPage"),
);

// Fallback for not found
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function App(): React.ReactElement {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<RootLayout />}>
                  <Route element={<MainLayout />}>
                    <Route path="/" element={<NewHomePage />} />

                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/faq" element={<FAQPage />} />
                    <Route path="/help" element={<FAQPage />} />
                    <Route path="/restaurants" element={<RestaurantsPage />} />
                    <Route
                      path="/restaurants/:id"
                      element={<RestaurantDetailsPage />}
                    />
                    <Route path="/categories" element={<CategoriesPage />} />

                    <Route path="*" element={<NotFoundPage />} />
                  </Route>

                  <Route element={<AccountLayout />}>
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/orders/:id" element={<OrderDetailsPage />} />
                    <Route
                      path="/notifications"
                      element={<NotificationsPage />}
                    />
                  </Route>

                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route
                      path="/vendor/register"
                      element={<VendorRegisterPage />}
                    />
                    <Route
                      path="/forgot-password"
                      element={<ForgotPassword />}
                    />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                  </Route>
                </Route>

                {/* Vendor routes (outside RootLayout – uses its own sidebar layout) */}
                <Route element={<VendorLayout />}>
                  <Route path="/vendor" element={<VendorDashboardPage />} />
                  <Route
                    path="/vendor/restaurants"
                    element={<VendorRestaurantsPage />}
                  />
                  <Route
                    path="/vendor/restaurants/new"
                    element={<RestaurantFormPage />}
                  />
                  <Route
                    path="/vendor/restaurants/:id/edit"
                    element={<RestaurantFormPage />}
                  />
                  <Route path="/vendor/menu" element={<VendorMenuPage />} />
                  <Route path="/vendor/orders" element={<VendorOrdersPage />} />
                  <Route
                    path="/vendor/orders/:id"
                    element={<VendorOrderDetailPage />}
                  />
                  <Route
                    path="/vendor/reviews"
                    element={<VendorReviewsPage />}
                  />
                  <Route
                    path="/vendor/promotions"
                    element={<VendorPromotionsPage />}
                  />
                  <Route
                    path="/vendor/analytics"
                    element={<VendorAnalyticsPage />}
                  />
                  <Route
                    path="/vendor/settings"
                    element={<VendorSettingsPage />}
                  />
                </Route>
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
