import NotificationPopover from "@/components/NotificationPopover";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import authService from "@/services/authService";
import { AnimatePresence, motion } from "framer-motion";
import {
    Activity,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    History,
    LayoutDashboard,
    LogOut,
    MapPin,
    Package,
    User,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

// ── Sidebar definitions ──────────────────────────────────────────

interface SidebarGroup {
  label: string;
  items: { name: string; path: string; icon: React.ElementType }[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    label: "Deliveries",
    items: [
      { name: "Dashboard", path: "/rider", icon: LayoutDashboard },
      { name: "Available Orders", path: "/rider/available", icon: Package },
      { name: "Active Delivery", path: "/rider/active", icon: MapPin },
    ],
  },
  {
    label: "Earnings",
    items: [
      { name: "Earnings", path: "/rider/earnings", icon: DollarSign },
      { name: "History", path: "/rider/history", icon: History },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "Profile", path: "/rider/profile", icon: User },
    ],
  },
];

const allItems = sidebarGroups.flatMap((g) => g.items);

// ── Layout ───────────────────────────────────────────────────────

const RiderLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout: logoutContext } = useAuth();
  const { toast } = useToast();
  const avatarRef = useRef<HTMLButtonElement>(null);

  // Close avatar menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };
    if (avatarMenuOpen) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [avatarMenuOpen]);

  const isActive = (path: string) => {
    if (path === "/rider") return location.pathname === "/rider";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      /* ignore */
    }
    logoutContext();
    navigate("/");
    toast({ title: "Logged out", description: "See you soon!" });
  };

  // Breadcrumb
  const activePage = allItems.find((i) => isActive(i.path));
  const breadcrumbs: { label: string; href?: string }[] = [
    { label: "Rider", href: "/rider" },
    ...(activePage && activePage.path !== "/rider" ? [{ label: activePage.name }] : []),
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="relative z-20 flex flex-col bg-white border-r border-gray-200 shadow-sm shrink-0"
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-gray-100">
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                key="full-logo"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-sm text-gray-900 tracking-tight">
                  Rider Portal
                </span>
              </motion.div>
            )}
            {collapsed && (
              <motion.div
                key="icon-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center"
              >
                <Activity className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((p) => !p)}
            className="ml-auto p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          {sidebarGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        title={collapsed ? item.name : undefined}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                          active
                            ? "bg-orange-50 text-orange-600"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active ? "text-orange-500" : "text-gray-400 group-hover:text-gray-600"
                          }`}
                        />
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              key="label"
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden whitespace-nowrap"
                            >
                              {item.name}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Avatar */}
        <div className="border-t border-gray-100 p-3">
          <button
            ref={avatarRef}
            onClick={() => setAvatarMenuOpen((p) => !p)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors relative"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.firstName?.[0]?.toUpperCase() ?? "R"}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  key="user-info"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-left overflow-hidden flex-1"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">Driver</p>
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          <AnimatePresence>
            {avatarMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute bottom-16 left-3 right-3 bg-white rounded-lg border border-gray-200 shadow-lg z-50 overflow-hidden"
              >
                <Link
                  to="/rider/profile"
                  onClick={() => setAvatarMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* ── Main area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shrink-0">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-500 flex-1">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-gray-300">/</span>}
                {crumb.href && i < breadcrumbs.length - 1 ? (
                  <Link to={crumb.href} className="hover:text-gray-900 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={i === breadcrumbs.length - 1 ? "text-gray-900 font-medium" : ""}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>

          <NotificationPopover />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default RiderLayout;
