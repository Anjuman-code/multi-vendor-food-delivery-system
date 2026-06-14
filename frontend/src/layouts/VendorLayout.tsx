import NotificationPopover from "@/components/NotificationPopover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useSocketContext } from "@/contexts/SocketContext";
import { useVendor, VendorProvider } from "@/contexts/VendorContext";
import { toast } from "@/lib/toast";
import { cn } from "@/utils/cn";
import authService from "@/services/authService";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Star,
  Store,
  Tag,
  User,
  Users,
  UtensilsCrossed,
  Wallet,
  Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
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
      { name: "Earnings", path: "/vendor/earnings", icon: Wallet },
      { name: "Customers", path: "/vendor/customers", icon: Users },
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
  {
    label: "Support",
    items: [
      { name: "Help & Support", path: "/vendor/support", icon: HelpCircle },
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
    crumbs.push({ label: active.name, href: active.path });
  }
  // Handle sub-pages
  if (pathname.includes("/restaurants/") && pathname.includes("/edit")) {
    crumbs.push({ label: "Edit Restaurant" });
  } else if (pathname.includes("/restaurants/new")) {
    crumbs.push({ label: "New Restaurant" });
  } else if (pathname.includes("/menu/items/new")) {
    crumbs.push({ label: "New Item" });
  } else if (pathname.includes("/menu/items/") && pathname.includes("/edit")) {
    crumbs.push({ label: "Edit Item" });
  } else if (pathname.includes("/orders/") && pathname.split("/").length > 3) {
    crumbs.push({ label: "Order Detail" });
  } else if (pathname.includes("/support/new")) {
    crumbs.push({ label: "New Ticket" });
  } else if (pathname.includes("/support/") && pathname.split("/").length > 3) {
    crumbs.push({ label: "Ticket" });
  }
  return crumbs;
};

// ── Inner layout component ──────────────────────────────────────

const VendorLayoutInner: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout: logoutContext } = useAuth();
  const confirm = useConfirm();
  const { restaurants, selectedRestaurantId, setSelectedRestaurantId } = useVendor();
  const { newOrderCount, clearNewOrderCount } = useSocketContext();

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
    const ok = await confirm({
      title: "Log out",
      description: "Are you sure you want to log out?",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await authService.logout();
      logoutContext();
      toast.success("Success", { description: "Logged out successfully" });
      navigate("/login");
    } catch {
      toast.error("Error", { description: "Failed to logout" });
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

  return (
    <div className="flex h-screen bg-muted/40">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        aria-label="Vendor navigation"
        className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-border bg-card"
      >
        {/* Logo */}
        <Link
          to="/vendor"
          className="flex h-16 items-center gap-3 border-b border-border px-4"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-red-500">
            <img src="/logo.svg" alt="" className="h-5 w-5 brightness-0 invert" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap text-lg font-bold text-foreground"
              >
                Food Rush
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Restaurant switcher */}
        <div className="border-b border-border px-3 py-3">
          {restaurants.length > 0 ? (
            !collapsed ? (
              <>
                <label className="mb-1.5 block px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Active Restaurant
                </label>
                <Select
                  value={selectedRestaurantId || undefined}
                  onValueChange={setSelectedRestaurantId}
                >
                  <SelectTrigger className="h-9 w-full" aria-label="Select active restaurant">
                    <SelectValue placeholder="Select restaurant" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map((r) => (
                      <SelectItem key={r._id} value={r._id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <div className="flex justify-center">
                {selectedRestaurant?.images?.logo ? (
                  <img
                    src={selectedRestaurant.images.logo}
                    alt={selectedRestaurant.name}
                    className="h-8 w-8 rounded-xl border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
                    <Store className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            )
          ) : (
            !collapsed && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No restaurants yet
              </p>
            )
          )}
        </div>

        {/* Navigation groups */}
        <nav className="vendor-scrollbar flex-1 space-y-5 overflow-y-auto px-2.5 py-3">
          {sidebarGroups.map((group) => (
            <div key={group.label}>
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground"
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
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group/nav relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        collapsed && "justify-center",
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <span className="relative shrink-0">
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px]",
                            active ? "text-primary" : "text-muted-foreground group-hover/nav:text-foreground",
                          )}
                        />
                        {item.badge && newOrderCount > 0 && (
                          <span
                            className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold leading-none text-primary-foreground"
                            aria-label={`${newOrderCount} new orders`}
                          >
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
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border px-2.5 py-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* User section */}
        <div className="border-t border-border px-2.5 py-3">
          <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-red-500 text-xs font-bold text-white">
              {getUserInitials()}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                    {user?.email}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button
                onClick={handleLogout}
                title="Log out"
                aria-label="Log out"
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ── Main area ─────────────────────────────────────────── */}
      <div
        className="flex flex-1 flex-col transition-all duration-200"
        style={{ marginLeft: collapsed ? 72 : 256 }}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-lg">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={`${crumb.label}-${i}`}>
                {i > 0 && <span className="text-border">/</span>}
                {crumb.href && i < breadcrumbs.length - 1 ? (
                  <Link
                    to={crumb.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Right section */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/vendor/menu/items/new")}
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
              title="Add new menu item"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
            <button
              onClick={() => navigate("/vendor/orders")}
              className="hidden items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/70 sm:inline-flex"
              title="View live orders"
            >
              <Zap className="h-3.5 w-3.5" />
              Live Orders
            </button>

            {/* Notification bell */}
            <div className="relative">
              <NotificationPopover />
              {newOrderCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold leading-none text-primary-foreground ring-2 ring-card"
                  aria-label={`${newOrderCount} new orders`}
                >
                  {newOrderCount > 9 ? "9+" : newOrderCount}
                </span>
              )}
            </div>

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-1 flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted"
                  aria-label="Account menu"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-red-500 text-xs font-semibold text-white">
                    {getUserInitials()}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium text-foreground">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/vendor/settings")}>
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/vendor/restaurants")}>
                  <Store className="mr-2 h-4 w-4 text-muted-foreground" />
                  Manage Restaurants
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
