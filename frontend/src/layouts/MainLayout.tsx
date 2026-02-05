import React from "react";
import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/**
 * MainLayout - Layout for public-facing pages with Navbar and Footer.
 *
 * Responsibilities:
 * - Renders the global Navbar at the top
 * - Renders the Footer at the bottom
 * - Provides a main content area with proper semantic structure
 * - Handles page transition animations
 *
 * Use this layout for:
 * - Home page
 * - Restaurant listings
 * - Category pages
 * - Any public page that needs the standard header/footer
 */

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <Navbar />

      {/* Main Content Area */}
      <motion.main
        id="main-content"
        role="main"
        className="flex-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto w-full">
          {children || <Outlet />}
        </div>
      </motion.main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default MainLayout;
