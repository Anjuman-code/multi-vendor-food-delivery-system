import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import React from "react";
import { Outlet } from "react-router-dom";

/**
 * MainLayout - Shared layout for all public and customer pages.
 *
 * - Fixed Navbar at the top (h-20), content padded with pt-20
 * - Full Footer at the bottom
 * - Global background comes from RootLayout
 */
const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <motion.main
        id="main-content"
        role="main"
        className="flex-1 pt-20"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Outlet />
      </motion.main>

      <Footer />
    </div>
  );
};

export default MainLayout;
