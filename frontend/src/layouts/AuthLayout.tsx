import React from "react";
import { Link, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, Clock, Shield, MapPin } from "lucide-react";

/**
 * AuthLayout - Layout for authentication pages (login, register, forgot password, etc.)
 *
 * Responsibilities:
 * - Split-screen layout with form on left, branding on right
 * - Provides consistent branding across all auth pages
 * - Responsive: stacks on mobile, side-by-side on desktop
 * - Includes decorative elements matching the site's design language
 *
 * Use this layout for:
 * - Login page
 * - Register page
 * - Forgot password page
 * - Email verification page
 */

interface AuthLayoutProps {
  children?: React.ReactNode;
}

const features = [
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Get your food delivered in under 30 minutes",
  },
  {
    icon: MapPin,
    title: "Wide Coverage",
    description: "Serving all areas across Sylhet city",
  },
  {
    icon: Clock,
    title: "Real-time Tracking",
    description: "Track your order from kitchen to doorstep",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description: "Multiple payment options with full security",
  },
];

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form Section */}
      <motion.div
        className="w-full lg:w-[45%] xl:w-[40%] bg-white flex flex-col"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Header with Logo */}
        <header className="p-6 md:p-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg"
          >
            <img
              src="/logo.svg"
              alt=""
              className="h-8 w-8 invert transition-transform group-hover:scale-110"
              aria-hidden="true"
            />
            <span className="text-2xl font-bold text-gray-800 group-hover:text-orange-500 transition-colors">
              Anfi
            </span>
          </Link>
        </header>

        {/* Main Form Content */}
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-6 md:px-12 py-8"
        >
          <div className="w-full max-w-md">{children || <Outlet />}</div>
        </main>

        {/* Footer */}
        <footer className="p-6 md:p-8 text-center text-sm text-gray-500">
          <p>
            © {new Date().getFullYear()} Anfi Food Delivery. All rights
            reserved.
          </p>
        </footer>
      </motion.div>

      {/* Right Side - Branding Section (Hidden on mobile) */}
      <motion.div
        className="hidden lg:flex lg:w-[55%] xl:w-[60%] bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating circles */}
          <div className="absolute top-[10%] left-[10%] w-4 h-4 bg-white/20 rounded-full animate-pulse" />
          <div
            className="absolute top-[25%] right-[15%] w-6 h-6 bg-white/10 rounded-full animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-[20%] left-[25%] w-3 h-3 bg-white/25 rounded-full animate-pulse"
            style={{ animationDelay: "0.5s" }}
          />
          <div
            className="absolute bottom-[35%] right-[30%] w-5 h-5 bg-white/15 rounded-full animate-pulse"
            style={{ animationDelay: "1.5s" }}
          />
          <div
            className="absolute top-[40%] left-[40%] w-2 h-2 bg-white/30 rounded-full animate-pulse"
            style={{ animationDelay: "2s" }}
          />

          {/* Large decorative blobs */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-400/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-red-500/20 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 xl:p-16">
          <motion.div
            className="max-w-xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Main Headline */}
            <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white mb-6 leading-tight">
              Sylhet's Favorite Food{" "}
              <span className="block">Delivered Fast</span>
            </h1>

            <p className="text-white/90 text-lg xl:text-xl mb-12 leading-relaxed">
              Order from hundreds of local restaurants, track your delivery in
              real-time, and enjoy Sylhet's best flavors at your doorstep.
            </p>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-left hover:bg-white/15 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-white/70 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <motion.div
              className="mt-12 flex items-center justify-center gap-8 xl:gap-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <div className="text-center">
                <div className="text-3xl xl:text-4xl font-bold text-white">
                  500+
                </div>
                <div className="text-white/70 text-sm">Restaurants</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="text-center">
                <div className="text-3xl xl:text-4xl font-bold text-white">
                  10K+
                </div>
                <div className="text-white/70 text-sm">Happy Customers</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="text-center">
                <div className="text-3xl xl:text-4xl font-bold text-white">
                  4.8★
                </div>
                <div className="text-white/70 text-sm">Avg. Rating</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthLayout;
