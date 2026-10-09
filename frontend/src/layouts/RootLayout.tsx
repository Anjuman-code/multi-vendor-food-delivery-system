import ScrollToTop from "@/components/ScrollToTop";
import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useLoading } from "@/contexts/LoadingContext";

/**
 * RootLayout - The outermost layout wrapper for the entire application.
 *
 * Responsibilities:
 * - Provides the base HTML structure for all pages
 * - Includes global providers and utilities (e.g., Toaster)
 * - Sets up the root container with minimum height
 * - Handles scroll behavior and font rendering
 * - Coordinates navigation commit and pending-content cue (>400ms)
 *
 * This layout wraps ALL routes and should contain only truly global elements.
 */
const RootLayout: React.FC = () => {
  const { isNavigatingSlow, finishNavigation } = useLoading();
  const location = useLocation();

  // Route commit listener: fires when the destination route is rendered into the DOM
  useEffect(() => {
    finishNavigation();
  }, [location.pathname, location.search, finishNavigation]);

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

      {/* Main outlet with subtle pending cue for slow transitions (>400ms) */}
      <div
        className={`transition-opacity duration-300 ${
          isNavigatingSlow ? "opacity-60" : "opacity-100"
        }`}
        aria-busy={isNavigatingSlow}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default RootLayout;
