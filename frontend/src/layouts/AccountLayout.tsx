import React from "react";
import { Outlet, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

/**
 * AccountLayout - Layout for account/profile pages.
 *
 * Uses Navbar but replaces the full marketing footer
 * with a minimal footer (copyright + Help Center link).
 */
const AccountLayout: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <motion.main
        id="main-content"
        role="main"
        className="flex-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </motion.main>

      {/* Minimal footer for account pages */}
      <footer className="border-t border-gray-200 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-gray-400">
            &copy; {currentYear} Anfi Food Delivery. All rights reserved.
          </p>
          <Link
            to="/faq"
            className="text-sm text-gray-400 hover:text-orange-500 transition-colors"
          >
            Help Center
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default AccountLayout;
