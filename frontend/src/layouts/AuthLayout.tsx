import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarClock,
  Clock,
  Coins,
  MapPin,
  ShieldCheck,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

/**
 * AuthLayout — split-screen shell for every authentication page.
 *
 * Left: scrollable form column (full width on mobile). Right: brand panel,
 * hidden below `lg`. The panel content is chosen by route so vendor/rider
 * applicants see value props built for them, not the customer pitch. All
 * pages render into the centered `max-w-md` slot for shared spacing.
 */

interface AuthLayoutProps {
  children?: React.ReactNode;
}

interface BrandPanel {
  badge: string;
  heading: React.ReactNode;
  subheading: string;
  features: { icon: LucideIcon; title: string; description: string }[];
  stats: { value: string; label: string }[];
}

const PANELS: Record<"customer" | "vendor" | "rider", BrandPanel> = {
  customer: {
    badge: "Sylhet's #1 food delivery",
    heading: (
      <>
        Great food,
        <br />
        delivered fast.
      </>
    ),
    subheading:
      "Order from your favourite local restaurants, track every step in real time, and pay securely — all in one place.",
    features: [
      { icon: Truck, title: "Fast delivery", description: "Hot food at your door in under 30 minutes." },
      { icon: MapPin, title: "Wide coverage", description: "Hundreds of restaurants across Sylhet." },
      { icon: Clock, title: "Live tracking", description: "Follow your order from kitchen to doorstep." },
      { icon: ShieldCheck, title: "Secure payments", description: "Multiple options, protected end to end." },
    ],
    stats: [
      { value: "500+", label: "Restaurants" },
      { value: "10K+", label: "Happy customers" },
      { value: "4.8★", label: "Avg. rating" },
    ],
  },
  vendor: {
    badge: "Partner with Food Rush",
    heading: (
      <>
        Grow your
        <br />
        restaurant business.
      </>
    ),
    subheading:
      "List your menu, reach thousands of nearby diners, and manage every order from one simple dashboard.",
    features: [
      { icon: Users, title: "More customers", description: "Get discovered by hungry diners near you." },
      { icon: BarChart3, title: "Sales insights", description: "Track orders and revenue in real time." },
      { icon: Store, title: "Easy menu tools", description: "Update items, prices and hours in seconds." },
      { icon: Wallet, title: "Reliable payouts", description: "Get paid on a dependable weekly schedule." },
    ],
    stats: [
      { value: "10K+", label: "Active diners" },
      { value: "Weekly", label: "Payouts" },
      { value: "24/7", label: "Partner support" },
    ],
  },
  rider: {
    badge: "Ride with Food Rush",
    heading: (
      <>
        Earn on your
        <br />
        own schedule.
      </>
    ),
    subheading:
      "Deliver when it suits you, keep 100% of your tips, and get paid every week. Be your own boss.",
    features: [
      { icon: CalendarClock, title: "Flexible hours", description: "Work whenever fits your day — no shifts." },
      { icon: Coins, title: "Keep your tips", description: "Every tip you earn is 100% yours." },
      { icon: Wallet, title: "Weekly payouts", description: "Reliable earnings paid straight to you." },
      { icon: ShieldCheck, title: "Backed by support", description: "On-road assistance whenever you need it." },
    ],
    stats: [
      { value: "100%", label: "Tips kept" },
      { value: "Weekly", label: "Payouts" },
      { value: "Flexible", label: "Hours" },
    ],
  },
};

function panelForPath(pathname: string): BrandPanel {
  if (pathname.startsWith("/vendor")) return PANELS.vendor;
  if (pathname.startsWith("/rider")) return PANELS.rider;
  return PANELS.customer;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const panel = panelForPath(pathname);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Form column ─────────────────────────────────────────── */}
      <div className="flex w-full flex-col lg:w-[46%] xl:w-[42%]">
        <header className="p-6 md:px-10 md:py-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <img src="/logo.svg" alt="" aria-hidden className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight text-foreground">
              Food Rush
            </span>
          </Link>
        </header>

        <main
          id="main-content"
          className="flex flex-1 items-center justify-center px-6 py-6 md:px-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            {children || <Outlet />}
          </motion.div>
        </main>

        <footer className="p-6 text-center text-xs text-muted-foreground md:px-10">
          © {new Date().getFullYear()} Food Rush. All rights reserved.
        </footer>
      </div>

      {/* ── Brand panel (route-aware) ───────────────────────────── */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-red-500 lg:flex lg:w-[54%] xl:w-[58%]">
        {/* Soft decorative glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-red-500/30 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_45%)]" />
        </div>

        <div className="relative z-10 flex w-full flex-col justify-center p-12 xl:p-16">
          <motion.div
            key={panel.badge}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="max-w-xl"
          >
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              {panel.badge}
            </span>

            <h2 className="mt-6 text-4xl font-bold leading-tight text-white xl:text-5xl">
              {panel.heading}
            </h2>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-white/85">
              {panel.subheading}
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              {panel.features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm transition-colors hover:bg-white/[0.16]"
                >
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <feature.icon className="h-5 w-5 text-white" />
                  </span>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="mt-1 text-sm text-white/70">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-8">
              {panel.stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-white/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
