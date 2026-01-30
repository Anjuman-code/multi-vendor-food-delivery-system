import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, MapPin, ShoppingBag, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface NavItem {
  name: string;
  path: string;
}

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const navLinks: NavItem[] = [
    { name: "Home", path: "/" },
    { name: "Restaurants", path: "/restaurants" },
    { name: "Categories", path: "/categories" },
    { name: "About", path: "/about" },
  ];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const isActiveLink = (path: string) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/80 backdrop-blur-lg shadow-lg" : "bg-transparent"
      }`}
      onKeyDown={handleKeyDown}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-xl">
                <img
                  src="/logo.svg"
                  alt=""
                  className="h-6 w-6 brightness-0 invert"
                  aria-hidden="true"
                />
              </div>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Anfi
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActiveLink(link.path)
                    ? "text-orange-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {link.name}
                {isActiveLink(link.path) && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-orange-100 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Location Selector */}
            <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100">
              <MapPin className="w-4 h-4 text-orange-500" />
              <span>Sylhet</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Cart */}
            <button className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                2
              </span>
            </button>

            {/* Auth Buttons */}
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
            >
              Log in
            </Link>
            <Link to="/register">
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-2 rounded-full font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 hover:-translate-y-0.5">
                Sign up
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-3">
            {/* Mobile Cart */}
            <button className="relative p-2 text-gray-600">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                2
              </span>
            </button>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm lg:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              id="mobile-menu"
              ref={mobileMenuRef}
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[80%] max-w-sm bg-white shadow-2xl lg:hidden overflow-y-auto"
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <Link
                  to="/"
                  className="flex items-center gap-2"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-xl">
                    <img
                      src="/logo.svg"
                      alt=""
                      className="h-5 w-5 brightness-0 invert"
                    />
                  </div>
                  <span className="text-xl font-bold text-gray-800">Anfi</span>
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu Content */}
              <div className="p-6">
                {/* Location */}
                <button className="w-full flex items-center gap-3 p-4 mb-6 bg-orange-50 rounded-2xl text-left">
                  <div className="p-2 bg-orange-100 rounded-xl">
                    <MapPin className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Deliver to</p>
                    <p className="font-semibold text-gray-800">
                      Sylhet, Bangladesh
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
                </button>

                {/* Nav Links */}
                <nav className="space-y-1 mb-8">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={link.path}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                          isActiveLink(link.path)
                            ? "bg-orange-100 text-orange-600"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {link.name}
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                {/* Auth Section */}
                <div className="space-y-3 pt-6 border-t border-gray-100">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:border-orange-500 hover:text-orange-500 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Log in
                  </Link>
                  <Link to="/register" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 rounded-xl font-medium shadow-lg shadow-orange-500/25">
                      Create Account
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
