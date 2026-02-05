import React from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import ScrollToTop from "@/components/ScrollToTop";

/**
 * RootLayout - The outermost layout wrapper for the entire application.
 *
 * Responsibilities:
 * - Provides the base HTML structure for all pages
 * - Includes global providers and utilities (e.g., Toaster)
 * - Sets up the root container with minimum height
 * - Handles scroll behavior and font rendering
 *
 * This layout wraps ALL routes and should contain only truly global elements.
 */
const RootLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 antialiased">
      {/* Scroll to top on route change */}
      <ScrollToTop />

      {/* Skip link for accessibility - navigates to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Main outlet for nested routes */}
      <Outlet />

      {/* Global toast notifications */}
      <Toaster />
    </div>
  );
};

export default RootLayout;
