import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import authService from "@/services/authService";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertTriangle,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Command,
    FileText,
    Globe,
    LayoutDashboard,
    LogOut,
    Package,
    Search,
    Settings,
    Shield,
    Star,
    Store,
    Tag,
    Users,
    Wallet,
    X
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
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
    items: [
      { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    ],
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
    crumbs.push({ label: active.name });
  }
  // Sub-page labels
  if (pathname.match(/\/admin\/users\/customers\/[^/]+$/)) crumbs.push({ label: "Customer Detail" });
  if (pathname.match(/\/admin\/users\/vendors\/[^/]+$/)) crumbs.push({ label: "Vendor Detail" });
  if (pathname.match(/\/admin\/users\/drivers\/[^/]+$/)) crumbs.push({ label: "Driver Detail" });
  if (pathname.match(/\/admin\/restaurants\/[^/]+$/)) crumbs.push({ label: "Restaurant Detail" });
  if (pathname.match(/\/admin\/orders\/[^/]+$/)) crumbs.push({ label: "Order Detail" });
  return crumbs;
};

// ── Global Search Panel ──────────────────────────────────────────

interface SearchResult {
  users: Array<{ _id: string; firstName: string; lastName: string; email: string; role: string }>;
  restaurants: Array<{ _id: string; name: string; approvalStatus: string }>;
  orders: Array<{ _id: string; orderNumber: string; status: string; total: number }>;
}

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
      if (query.length < 2) { setResults(null); return; }
      setLoading(true);
      try {
        const res = await adminService.search(query);
        setResults((res.data as { data: SearchResult }).data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (path: string) => { navigate(path); onClose(); };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: -8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: -8 }}
        transition={{ duration: 0.15 }}
        className="bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, restaurants, orders…"
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
          />
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          )}
          {results && !loading && (
            <div className="p-2">
              {results.users.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-3 py-1.5">Users</p>
                  {results.users.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => go(`/admin/users/customers/${u._id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.05] text-left transition-colors"
                    >
                      <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <p className="text-sm text-white">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-500">{u.email} · {u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.restaurants.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-3 py-1.5">Restaurants</p>
                  {results.restaurants.map((r) => (
                    <button
                      key={r._id}
                      onClick={() => go(`/admin/restaurants/${r._id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.05] text-left transition-colors"
                    >
                      <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-sm text-white">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.approvalStatus}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.orders.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-3 py-1.5">Orders</p>
                  {results.orders.map((o) => (
                    <button
                      key={o._id}
                      onClick={() => go(`/admin/orders/${o._id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.05] text-left transition-colors"
                    >
                      <ClipboardList className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-sm text-white">#{o.orderNumber}</p>
                        <p className="text-xs text-gray-500">{o.status} · ৳{o.total}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.users.length === 0 && results.restaurants.length === 0 && results.orders.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8">No results for "{query}"</p>
              )}
            </div>
          )}
          {!results && !loading && query.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-gray-600 text-sm">Start typing to search across all entities</p>
              <p className="text-gray-700 text-xs mt-1">Users, restaurants, and orders</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main Layout ──────────────────────────────────────────────────

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout: logoutContext } = useAuth();
  const { toast } = useToast();

  // Keyboard shortcut for search
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

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      logoutContext();
      navigate("/login");
    } catch {
      toast({ title: "Error", description: "Failed to logout", variant: "destructive" });
    }
  };

  const initials = user
    ? `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase()
    : "A";

  const breadcrumbs = getBreadcrumbs(location.pathname);

  const tierLabel = (user as unknown as { adminTier?: string })?.adminTier
    ?.replace("_", " ")
    .toUpperCase() ?? "ADMIN";

  const tierColor =
    tierLabel.includes("SUPER") ? "text-red-400" : tierLabel === "ADMIN" ? "text-indigo-400" : "text-gray-400";

  return (
    <>
      <AnimatePresence>
        {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>

      <div className="flex h-screen bg-gray-50">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <motion.aside
          animate={{ width: collapsed ? 72 : 256 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="fixed left-0 top-0 bottom-0 z-40 bg-[#0a0f1a] text-white flex flex-col"
          style={{ boxShadow: "1px 0 0 0 rgba(255,255,255,0.05)" }}
        >
          {/* Logo */}
          <Link
            to="/admin"
            className="flex items-center gap-3 px-4 h-16 border-b border-white/[0.05]"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-2 rounded-xl shrink-0">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="text-base font-bold whitespace-nowrap">Food Rush</p>
                  <p className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase leading-none">
                    Admin
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4"
            style={{ scrollbarWidth: "none" }}>
            {navGroups.map((group) => (
              <div key={group.label}>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-600 mb-1 px-2"
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
                        title={collapsed ? item.name : undefined}
                        className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 relative group/nav ${
                          active
                            ? "bg-indigo-600/20 text-white"
                            : "text-gray-400 hover:bg-white/[0.05] hover:text-gray-200"
                        } ${collapsed ? "justify-center" : ""}`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full" />
                        )}
                        <Icon
                          className={`w-[18px] h-[18px] shrink-0 ${
                            active ? "text-indigo-400" : "text-gray-600 group-hover/nav:text-gray-400"
                          }`}
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

          {/* Collapse toggle */}
          <div className="px-2.5 py-2 border-t border-white/[0.05]">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`flex items-center gap-3 w-full px-2.5 py-2 rounded-xl text-[13px] text-gray-600 hover:bg-white/[0.05] hover:text-gray-400 transition-all ${
                collapsed ? "justify-center" : ""
              }`}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 shrink-0" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>

          {/* User section */}
          <div className="px-2.5 py-3 border-t border-white/[0.05]">
            <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-[13px] font-semibold text-gray-200 truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className={`text-[10px] font-bold ${tierColor}`}>{tierLabel}</p>
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

        {/* ── Main area ─────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col transition-all duration-200 min-w-0"
          style={{ marginLeft: collapsed ? 72 : 256 }}
        >
          {/* Top bar */}
          <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-lg border-b border-gray-200 flex items-center justify-between px-6 gap-4">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-sm min-w-0">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.label}>
                  {i > 0 && <span className="text-gray-300">/</span>}
                  {crumb.href ? (
                    <Link to={crumb.href} className="text-gray-500 hover:text-gray-700 transition-colors truncate">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-900 font-medium truncate">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>

            {/* Search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg text-sm transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Search…</span>
              <kbd className="hidden sm:flex items-center gap-0.5 text-xs text-gray-400 bg-white border border-gray-200 rounded px-1">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminLayout;
