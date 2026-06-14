import NotificationPopover from "@/components/NotificationPopover";
import { AvailabilityToggle } from "@/components/rider";
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
import { RiderProvider, useRider } from "@/contexts/RiderContext";
import { useToast } from "@/hooks/use-toast";
import authService from "@/services/authService";
import { cn } from "@/utils/cn";
import {
  Bike,
  DollarSign,
  HelpCircle,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  User,
} from "lucide-react";
import React from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

// ── Navigation model ─────────────────────────────────────────────

interface NavItem {
  name: string;
  short: string;
  path: string;
  icon: React.ElementType;
  end?: boolean;
}

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Deliveries",
    items: [
      { name: "Dashboard", short: "Home", path: "/rider", icon: LayoutDashboard, end: true },
      { name: "Available Orders", short: "Orders", path: "/rider/available", icon: Package },
      { name: "Active Delivery", short: "Active", path: "/rider/active", icon: MapPin },
    ],
  },
  {
    label: "Earnings",
    items: [
      { name: "Earnings", short: "Earnings", path: "/rider/earnings", icon: DollarSign },
      { name: "History", short: "History", path: "/rider/history", icon: History },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "Profile", short: "Profile", path: "/rider/profile", icon: User },
      { name: "Help & Support", short: "Support", path: "/rider/support", icon: HelpCircle },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);
// Primary destinations shown in the mobile bottom bar.
const MOBILE_TABS: NavItem[] = [
  ALL_ITEMS[0], // Dashboard
  ALL_ITEMS[1], // Available
  ALL_ITEMS[2], // Active
  ALL_ITEMS[3], // Earnings
  ALL_ITEMS[5], // Profile
];

// ── Shell ────────────────────────────────────────────────────────

const RiderShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout: logoutContext } = useAuth();
  const confirm = useConfirm();
  const { toast } = useToast();
  const { profile, activeOrder, toggling, toggleAvailability } = useRider();

  const isActive = (path: string, end?: boolean) =>
    end ? location.pathname === path : location.pathname.startsWith(path);

  const activePage = [...ALL_ITEMS]
    .sort((a, b) => b.path.length - a.path.length)
    .find((i) => isActive(i.path, i.end));

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Log out",
      description: "Are you sure you want to log out?",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await authService.logout();
    } catch {
      /* ignore */
    }
    logoutContext();
    navigate("/login");
    toast({ title: "Logged out", description: "Ride safe!" });
  };

  const initials = (user?.firstName?.[0] ?? "R").toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* ── Desktop sidebar ──────────────────────────────────── */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
            <Bike className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Rider Portal
          </span>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path, item.end);
                  const showDot = item.path === "/rider/active" && !!activeOrder;
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.name}</span>
                        {showDot && (
                          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    Rider
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>My account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/rider/profile">
                  <User className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/rider/support">
                  <HelpCircle className="mr-2 h-4 w-4" /> Help &amp; Support
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Main column ──────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
          {/* Mobile brand */}
          <span className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
              <Bike className="h-4 w-4" />
            </span>
          </span>
          <h1 className="flex-1 truncate text-base font-semibold text-foreground">
            {activePage?.name ?? "Rider"}
          </h1>
          {profile?.applicationStatus === "approved" && (
            <AvailabilityToggle
              variant="compact"
              online={!!profile?.isAvailable}
              onToggle={toggleAvailability}
              loading={toggling}
              lockedReason={activeOrder ? "On a delivery" : null}
            />
          )}
          <NotificationPopover />
        </header>

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-border bg-card lg:hidden">
        {MOBILE_TABS.map((item) => {
          const Icon = item.icon;
          const showDot = item.path === "/rider/active" && !!activeOrder;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive: active }) =>
                cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active ? "text-brand-600" : "text-muted-foreground",
                )
              }
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {showDot && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                )}
              </span>
              {item.short}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

const RiderLayout: React.FC = () => (
  <RiderProvider>
    <RiderShell />
  </RiderProvider>
);

export default RiderLayout;
