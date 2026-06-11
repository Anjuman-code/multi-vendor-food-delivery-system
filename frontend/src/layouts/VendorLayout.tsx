import NotificationPopover from "@/components/NotificationPopover";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
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
  Plus,
  Settings,
  Star,
  Store,
  Tag,
  User,
  UtensilsCrossed,
  Zap
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

// ── Sidebar definitions ──────────────────────────────────────────

interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: boolean; // show order count badge
}

const sidebarGroups: SidebarGroup[] = [
  {
    label: "Operations",
    items: [
      { name: "Dashboard", path: "/vendor", icon: LayoutDashboard },
      { name: "Orders", path: "/vendor/orders", icon: ClipboardList, badge: true },
      { name: "Menu", path: "/vendor/menu", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Business",
    items: [
      { name: "Analytics", path: "/vendor/analytics", icon: BarChart3 },
      { name: "Promotions", path: "/vendor/promotions", icon: Tag },
      { name: "Reviews", path: "/vendor/reviews", icon: Star },
    ],
  },
  {
    label: "Settings",
    items: [
      { name: "Restaurants", path: "/vendor/restaurants", icon: Store },
      { name: "Settings", path: "/vendor/settings", icon: Settings },
    ],
  },
];

const allItems = sidebarGroups.flatMap((g) => g.items);

// ── Breadcrumb helper ────────────────────────────────────────────

const getBreadcrumbs = (pathname: string): { label: string; href?: string }[] => {
  const crumbs: { label: string; href?: string }[] = [{ label: "Vendor", href: "/vendor" }];
  const active = allItems.find((i) => {
    if (i.path === "/vendor") return pathname === "/vendor";
    return pathname.startsWith(i.path);
  });
  if (active && active.path !== "/vendor") {
    crumbs.push({ label: active.name });
  }
  // Handle sub-pages
  if (pathname.includes("/restaurants/") && pathname.includes("/edit")) {
    crumbs.push({ label: "Edit Restaurant" });
  } else if (pathname.includes("/restaurants/new")) {
    crumbs.push({ label: "New Restaurant" });
  } else if (pathname.includes("/orders/") && pathname.split("/").length > 3) {
    crumbs.push({ label: "Order Detail" });
  }
  return crumbs;
};

// ── Inner layout component ──────────────────────────────────────

const VendorLayoutInner: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout: logoutContext } = useAuth();
  const confirm = useConfirm();
  const { restaurants, selectedRestaurantId, setSelectedRestaurantId } = useVendor();
  const { toast } = useToast();
  const { newOrderCount, clearNewOrderCount } = useSocketContext();
  const avatarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (location.pathname.startsWith("/vendor/orders")) {
      clearNewOrderCount();
    }
  }, [location.pathname, clearNewOrderCount]);

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
    if (path === "/vendor") return location.pathname === "/vendor";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Log out",
      description: "Are you sure you want to log out?",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await authService.logout();
      logoutContext();
      toast({ title: "Success", description: "Logged out successfully" });
      navigate("/login");
    } catch {
      toast({ title: "Error", description: "Failed to logout", variant: "destructive" });
    }
  };

  const getUserInitials = () => {
    if (!user) return "V";
    return `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() || "V";
  };

  const selectedRestaurant = useMemo(
    () => restaurants.find((r) => r._id === selectedRestaurantId),
    [restaurants, selectedRestaurantId],
  );

  const breadcrumbs = useMemo(() => getBreadcrumbs(location.pathname), [location.pathname]);
  const activePage = allItems.find((i) => isActive(i.path));

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="fixed left-0 top-0 bottom-0 z-40 bg-[#0d1117] text-white flex flex-col"
        style={{ boxShadow: "1px 0 0 0 rgba(255,255,255,0.06)" }}
      >
        {/* Logo */}
        <Link to="/vendor" className="flex items-center gap-3 px-4 h-16 border-b border-white/[0.06]">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-xl shrink-0">
            <img src="/logo.svg" alt="" className="h-5 w-5 brightness-0 invert" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-lg font-bold whitespace-nowrap"
              >
                Food Rush
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Restaurant switcher */}
        <div className="px-3 py-3 border-b border-white/[0.06]">
          {restaurants.length > 0 ? (
            <div className="relative">
              {!collapsed ? (
                <>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5 block px-1">
                    Active Restaurant
                  </label>
                  <button
                    className="w-full flex items-center gap-2.5 bg-white/[0.07] hover:bg-white/[0.11] border border-white/[0.08] rounded-xl px-3 py-2 text-sm transition-colors"
                    onClick={() => document.getElementById("vendor-restaurant-select")?.focus()}
                  >
                    {selectedRestaurant?.images?.logo ? (
                      <img
                        src={selectedRestaurant.images.logo}
                        alt=""
                        className="w-5 h-5 rounded object-cover shrink-0"
                      />
                    ) : (
                    <Store className="w-4 h-4 text-orange-400 shrink-0" />
                  )}
                    <span className="flex-1 text-left truncate text-gray-200 text-[13px]">{selectedRestaurant?.name || "Select"}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  </button>
                  <select
                    id="vendor-restaurant-select"
                    value={selectedRestaurantId || ""}
                    onChange={(e) => setSelectedRestaurantId(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  >
                    {restaurants.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <div className="flex justify-center">
                  {selectedRestaurant?.images?.logo ? (
                    <img
                      src={selectedRestaurant.images.logo}
                      alt=""
                      className="w-8 h-8 rounded-xl object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-white/[0.07] border border-white/[0.08] flex items-center justify-center">
                      <Store className="w-4 h-4 text-orange-400" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            !collapsed && (
              <p className="text-xs text-gray-500 text-center py-2">No restaurants yet</p>
            )
          )}
        </div>

        {/* Navigation groups */}
        <nav className="flex-1 overflow-y-auto vendor-scrollbar px-2.5 py-3 space-y-5">
          {sidebarGroups.map((group) => (
            <div key={group.label}>
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-600 mb-1.5 px-2"
                  >
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 relative group/nav ${
                        active
                          ? "bg-orange-500/[0.18] text-white"
                          : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-100"
                      } ${collapsed ? "justify-center" : ""}`}
                      title={collapsed ? item.name : undefined}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-orange-500 rounded-r-full" />
                      )}
                      <span className="relative shrink-0">
                        <Icon className={`w-[18px] h-[18px] ${active ? "text-orange-400" : "text-gray-500 group-hover/nav:text-gray-300"}`} />
                        {item.badge && newOrderCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
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
                            className="whitespace-nowrap tracking-[-0.01em]"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="px-2.5 py-2 border-t border-white/[0.06]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-3 w-full px-2.5 py-2 rounded-xl text-[13px] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300 transition-all duration-150 ${collapsed ? "justify-center" : ""}`}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span className="tracking-[-0.01em]">Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* User section */}
        <div className="px-2.5 py-3 border-t border-white/[0.06]">
          <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
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
                  <p className="text-[13px] font-semibold text-gray-200 truncate leading-tight tracking-[-0.01em]">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">{user?.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button
                onClick={handleLogout}
                title="Log out"
                className="shrink-0 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ── Main area ─────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col transition-all duration-200"
        style={{ marginLeft: collapsed ? 72 : 256 }}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-lg border-b border-gray-200 flex items-center justify-between px-6">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.label}>
                {i > 0 && <span className="text-gray-300">/</span>}
                {crumb.href ? (
                  <Link to={crumb.href} className="text-gray-500 hover:text-gray-700 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Quick actions */}
            <button
              onClick={() => navigate("/vendor/menu/items/new")}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Add new menu item"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
            <button
              onClick={() => navigate("/vendor/orders")}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
              title="View live orders"
            >
              <Zap className="w-3.5 h-3.5" />
              Live Orders
            </button>

            {/* Notification bell */}
            <div className="relative">
              <NotificationPopover />
              {newOrderCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none ring-2 ring-white">
                  {newOrderCount > 9 ? "9+" : newOrderCount}
                </span>
              )}
            </div>

            {/* Avatar dropdown */}
            <div className="relative">
              <button
                ref={avatarRef}
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors ml-1"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  {getUserInitials()}
                </div>
              </button>
              <AnimatePresence>
                {avatarMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-card-lg py-1 z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { setAvatarMenuOpen(false); navigate("/vendor/settings"); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => { setAvatarMenuOpen(false); navigate("/vendor/restaurants"); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Store className="w-4 h-4 text-gray-400" />
                      Manage Restaurants
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-header-title">{activePage?.name || "Vendor"}</h1>
              {selectedRestaurant && (
                <p className="page-header-subtitle">
                  {selectedRestaurant.name}
                  {selectedRestaurant.isTemporarilyClosed && (
                    <span className="ml-2 status-pill status-pill-warning">Temporarily Closed</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Contextual actions — individual pages can slot in via a portal target or just leave empty */}
            </div>
          </div>
        </div>

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
