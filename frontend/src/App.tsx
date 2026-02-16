import React, { lazy, Suspense } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageLoader } from "./components/PageLoader";
import { AuthProvider } from "./contexts/AuthContext";
import { AccountLayout, AuthLayout, MainLayout, RootLayout } from "./layouts";

const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NewHomePage = lazy(() => import("./pages/NewHomePage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const RestaurantDetailsPage = lazy(
  () => import("./pages/RestaurantDetailsPage"),
);
const RestaurantsPage = lazy(() => import("./pages/RestaurantsPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function App(): React.ReactElement {
  return (
    <Router>
      <AuthProvider>
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
                </Route>

                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </Router>
  );
}

export default App;
