import NotificationPopover from "@/components/NotificationPopover";
import { useAuth } from "@/contexts/AuthContext";
import { useSocketContext } from "@/contexts/SocketContext";
import { useVendor, VendorProvider } from "@/contexts/VendorContext";
import { useToast } from "@/hooks/use-toast";
import authService from "@/services/authService";
import { AnimatePresence, motion } from "framer-motion";
import {
    BarChart3,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    LayoutDashboard,
    LogOut,
    Settings,
    Star,
    Store,
    Tag,
    UtensilsCrossed,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const sidebarItems: SidebarItem[] = [
  { name: "Dashboard", path: "/vendor", icon: LayoutDashboard },
  { name: "Restaurants", path: "/vendor/restaurants", icon: Store },
  { name: "Menu", path: "/vendor/menu", icon: UtensilsCrossed },
  { name: "Orders", path: "/vendor/orders", icon: ClipboardList },
  { name: "Reviews", path: "/vendor/reviews", icon: Star },
  { name: "Promotions", path: "/vendor/promotions", icon: Tag },
  { name: "Analytics", path: "/vendor/analytics", icon: BarChart3 },
  { name: "Settings", path: "/vendor/settings", icon: Settings },
];

const VendorLayoutInner: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout: logoutContext } = useAuth();
  const { restaurants, selectedRestaurantId, setSelectedRestaurantId } =
    useVendor();
  const { toast } = useToast();
  const { newOrderCount, clearNewOrderCount } = useSocketContext();

  // Clear badge when vendor navigates to /vendor/orders
  useEffect(() => {
    if (location.pathname.startsWith("/vendor/orders")) {
      clearNewOrderCount();
    }
  }, [location.pathname, clearNewOrderCount]);

  const isActive = (path: string) => {
    if (path === "/vendor") return location.pathname === "/vendor";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      logoutContext();
      toast({ title: "Success", description: "Logged out successfully" });
      navigate("/");
    } catch {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = () => {
    if (!user) return "V";
    return (
      `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() ||
      "V"
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-gray-200 flex flex-col"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-xl shrink-0">
              <img
                src="/logo.svg"
                alt=""
                className="h-5 w-5 brightness-0 invert"
              />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xl font-bold text-gray-800 whitespace-nowrap"
                >
                  Food Rush Vendor
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Restaurant Selector */}
        {!collapsed && restaurants.length > 0 && (
          <div className="px-3 py-3 border-b border-gray-100">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Restaurant
            </label>
            <div className="relative">
              <select
                value={selectedRestaurantId || ""}
                onChange={(e) => setSelectedRestaurantId(e.target.value)}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                {restaurants.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                  active
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
                title={collapsed ? item.name : undefined}
              >
                <span className="relative shrink-0">
                  <Icon className="w-5 h-5" />
                  {item.path === "/vendor/orders" && newOrderCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {newOrderCount > 9 ? "9+" : newOrderCount}
                    </span>
                  )}
                </span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="vendorSidebarActive"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-r-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="px-3 py-2 border-t border-gray-100">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* User section */}
        <div className="px-3 py-3 border-t border-gray-100">
          <div
            className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}
          >
            <div className="w-9 h-9 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {getUserInitials()}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* Main area */}
      <div
        className="flex-1 flex flex-col transition-all duration-200"
        style={{ marginLeft: collapsed ? 72 : 256 }}
      >
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-lg border-b border-gray-200 flex items-center justify-between px-6">
          <h2 className="text-lg font-semibold text-gray-800">
            {sidebarItems.find((i) => isActive(i.path))?.name || "Vendor"}
          </h2>
          <div className="flex items-center gap-3">
            <NotificationPopover />
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <motion.main
          className="flex-1 overflow-y-auto p-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
};

const VendorLayout: React.FC = () => (
  <VendorProvider>
    <VendorLayoutInner />
  </VendorProvider>
);

export default VendorLayout;
