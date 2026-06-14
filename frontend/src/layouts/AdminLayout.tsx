import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { toast } from "@/lib/toast";
import adminService from "@/services/adminService";
import authService from "@/services/authService";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Command,
  FileText,
  Gavel,
  Globe,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  Shield,
  Star,
  Store,
  Tag,
  Users,
  Wallet,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

// ── Navigation definition ────────────────────────────────────────

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ name: "Dashboard", path: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Users",
    items: [
      { name: "Customers", path: "/admin/users/customers", icon: Users },
      { name: "Vendors", path: "/admin/users/vendors", icon: Store },
      { name: "Drivers", path: "/admin/users/drivers", icon: Package },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Restaurants", path: "/admin/restaurants", icon: Store },
      { name: "Orders", path: "/admin/orders", icon: ClipboardList },
      { name: "Disputes", path: "/admin/disputes", icon: Gavel },
      { name: "Support", path: "/admin/support", icon: AlertTriangle },
    ],
  },
  {
    label: "Finance",
    items: [
      { name: "Payouts", path: "/admin/finance/payouts", icon: Wallet },
      { name: "Revenue", path: "/admin/finance/revenue", icon: BarChart3 },
    ],
  },
  {
    label: "Content",
    items: [
      { name: "Reviews", path: "/admin/reviews", icon: Star },
      { name: "Cuisine & Tags", path: "/admin/content/taxonomy", icon: Tag },
      { name: "Homepage", path: "/admin/content/blocks", icon: Globe },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Audit Log", path: "/admin/audit-log", icon: FileText },
      { name: "Admin Team", path: "/admin/team", icon: Shield },
      { name: "Settings", path: "/admin/settings", icon: Settings },
    ],
  },
];

const allItems = navGroups.flatMap((g) => g.items);

// ── Breadcrumb helper ─────────────────────────────────────────────

const getBreadcrumbs = (pathname: string) => {
  const crumbs: { label: string; href?: string }[] = [
    { label: "Admin", href: "/admin" },
  ];
  const active = allItems.find((i) => {
    if (i.path === "/admin") return pathname === "/admin";
    return pathname.startsWith(i.path);
  });
  if (active && active.path !== "/admin") {
    crumbs.push({ label: active.name, href: active.path });
  }
  if (pathname.match(/\/admin\/users\/customers\/[^/]+$/)) crumbs.push({ label: "Customer Detail" });
  if (pathname.match(/\/admin\/users\/vendors\/[^/]+$/)) crumbs.push({ label: "Vendor Detail" });
  if (pathname.match(/\/admin\/users\/drivers\/[^/]+$/)) crumbs.push({ label: "Driver Detail" });
  if (pathname.match(/\/admin\/restaurants\/[^/]+$/) && !pathname.endsWith("approval-queue"))
    crumbs.push({ label: "Restaurant Detail" });
  if (pathname.match(/\/admin\/orders\/[^/]+$/)) crumbs.push({ label: "Order Detail" });
  if (pathname.match(/\/admin\/support\/[^/]+$/)) crumbs.push({ label: "Ticket Detail" });
  return crumbs;
};

// ── Global Search Palette (Cmd/Ctrl-K) ───────────────────────────

interface SearchResult {
  users: Array<{ _id: string; firstName: string; lastName: string; email: string; role: string }>;
  restaurants: Array<{ _id: string; name: string; approvalStatus: string }>;
  orders: Array<{ _id: string; orderNumber: string; status: string; total: number }>;
}

const detailPathForRole = (id: string, role: string) => {
  if (role === "vendor") return `/admin/users/vendors/${id}`;
  if (role === "driver") return `/admin/users/drivers/${id}`;
  return `/admin/users/customers/${id}`;
};

const GlobalSearch: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults(null);
        return;
      }
      setLoading(true);
      try {
        const res = await adminService.search(query.trim());
        setResults((res.data as { data: SearchResult }).data);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  const empty =
    results &&
    results.users.length === 0 &&
    results.restaurants.length === 0 &&
    results.orders.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/30 p-4 pt-[14vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, y: -8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97, y: -8 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Global search"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, restaurants, orders…"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-brand-500" />}
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {results && !empty && (
            <>
              {results.users.length > 0 && (
                <SearchGroup label="Users">
                  {results.users.map((u) => (
                    <SearchRow
                      key={u._id}
                      icon={Users}
                      title={`${u.firstName} ${u.lastName}`}
                      subtitle={`${u.email} · ${u.role}`}
                      onClick={() => go(detailPathForRole(u._id, u.role))}
                    />
                  ))}
                </SearchGroup>
              )}
              {results.restaurants.length > 0 && (
                <SearchGroup label="Restaurants">
                  {results.restaurants.map((r) => (
                    <SearchRow
                      key={r._id}
                      icon={Store}
                      title={r.name}
                      subtitle={r.approvalStatus}
                      onClick={() => go(`/admin/restaurants/${r._id}`)}
                    />
                  ))}
                </SearchGroup>
              )}
              {results.orders.length > 0 && (
                <SearchGroup label="Orders">
                  {results.orders.map((o) => (
                    <SearchRow
                      key={o._id}
                      icon={ClipboardList}
                      title={`#${o.orderNumber}`}
                      subtitle={`${o.status} · ৳${o.total}`}
                      onClick={() => go(`/admin/orders/${o._id}`)}
                    />
                  ))}
                </SearchGroup>
              )}
            </>
          )}
          {empty && !loading && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No results for “{query}”
            </p>
          )}
          {!results && !loading && (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Search across all entities
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Users, restaurants, and orders
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const SearchGroup: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="mb-2 last:mb-0">
    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {label}
    </p>
    {children}
  </div>
);

const SearchRow: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
}> = ({ icon: Icon, title, subtitle, onClick }) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
  >
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-foreground">{title}</p>
      <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
    </div>
  </button>
);

// ── Sidebar (shared between desktop rail & mobile drawer) ─────────

const SidebarContent: React.FC<{
  collapsed: boolean;
  isActive: (path: string) => boolean;
  onNavigate?: () => void;
}> = ({ collapsed, isActive, onNavigate }) => (
  <>
    <Link
      to="/admin"
      onClick={onNavigate}
      className="flex h-16 items-center gap-3 border-b border-border px-4"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-red-500">
        <Shield className="h-5 w-5 text-white" />
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="whitespace-nowrap text-base font-bold leading-none text-foreground">
              Food Rush
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase leading-none tracking-widest text-primary">
              Admin
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Link>

    <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-3" style={{ scrollbarWidth: "none" }}>
      {navGroups.map((group) => (
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
                  onClick={onNavigate}
                  title={collapsed ? item.name : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group/nav relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      active ? "text-primary" : "text-muted-foreground group-hover/nav:text-foreground",
                    )}
                  />
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
  </>
);

// ── Main Layout ──────────────────────────────────────────────────

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout: logoutContext } = useAuth();
  const confirm = useConfirm();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
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
      navigate("/login");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const initials = user
    ? `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase()
    : "A";

  const breadcrumbs = useMemo(() => getBreadcrumbs(location.pathname), [location.pathname]);

  const tierLabel =
    (user as unknown as { adminTier?: string })?.adminTier?.replace("_", " ").toUpperCase() ??
    "ADMIN";
  const tierTone = tierLabel.includes("SUPER") ? "text-red-600" : "text-primary";

  return (
    <>
      <AnimatePresence>
        {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>

      <div className="flex h-screen bg-muted/40">
        {/* ── Desktop sidebar ─────────────────────────────────── */}
        <motion.aside
          animate={{ width: collapsed ? 72 : 256 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          aria-label="Admin navigation"
          className="fixed bottom-0 left-0 top-0 z-40 hidden flex-col border-r border-border bg-card lg:flex"
        >
          <SidebarContent collapsed={collapsed} isActive={isActive} />

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

          <div className="border-t border-border px-2.5 py-3">
            <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-red-500 text-xs font-bold text-white">
                {initials}
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
                    <p className={cn("text-[10px] font-bold", tierTone)}>{tierLabel}</p>
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

        {/* ── Mobile drawer ──────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -288 }}
                animate={{ x: 0 }}
                exit={{ x: -288 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col border-r border-border bg-card lg:hidden"
                aria-label="Admin navigation"
              >
                <SidebarContent
                  collapsed={false}
                  isActive={isActive}
                  onNavigate={() => setMobileOpen(false)}
                />
                <div className="border-t border-border px-2.5 py-3">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Log out
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── Main area ─────────────────────────────────────── */}
        <div
          className="flex min-w-0 flex-1 flex-col transition-[padding] duration-200 lg:pl-[var(--admin-sidebar)]"
          style={{ ["--admin-sidebar" as string]: `${collapsed ? 72 : 256}px` } as React.CSSProperties}
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-lg sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
                  {breadcrumbs.map((crumb, i) => (
                    <React.Fragment key={`${crumb.label}-${i}`}>
                      {i > 0 && <span className="text-border">/</span>}
                      {crumb.href && i < breadcrumbs.length - 1 ? (
                        <Link
                          to={crumb.href}
                          className="truncate text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="truncate font-medium text-foreground">{crumb.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/70"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span className="hidden sm:block">Search…</span>
                  <kbd className="hidden items-center gap-0.5 rounded border border-border bg-card px-1 text-xs text-muted-foreground sm:flex">
                    <Command className="h-2.5 w-2.5" />K
                  </kbd>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center rounded-lg p-1 transition-colors hover:bg-muted"
                      aria-label="Account menu"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-red-500 text-xs font-semibold text-white">
                        {initials}
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-medium text-foreground">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{user?.email}</p>
                      <p className={cn("mt-1 text-[10px] font-bold", tierTone)}>{tierLabel}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate("/admin/settings")}>
                      <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                      Platform Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate("/admin/audit-log")}>
                      <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                      Audit Log
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

            <motion.main
              key={location.pathname}
              className="flex-1 overflow-y-auto p-4 sm:p-6"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Outlet />
            </motion.main>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminLayout;
