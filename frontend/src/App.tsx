import React from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { RootLayout, MainLayout, AuthLayout } from "./layouts";

// Pages
import NewHomePage from "./pages/NewHomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";

// Public informational pages
import AboutPage from "./pages/AboutPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import ContactPage from "./pages/ContactPage";
import FAQPage from "./pages/FAQPage";

function App(): React.ReactElement {
  return (
    <Router>
      <Routes>
        {/* Root Layout wraps everything */}
        <Route element={<RootLayout />}>
          {/* Public pages with Navbar/Footer */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<NewHomePage />} />
            {/* Informational pages */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/help" element={<FAQPage />} />
          </Route>

          {/* Auth pages with split-screen layout */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
