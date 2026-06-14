import {
  CHART_COLORS,
  ChartCard,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import { SegmentedTabs } from "@/components/vendor";
import { useToast } from "@/hooks/use-toast";
import adminService, { ChartRange, DashboardStats } from "@/services/adminService";
import { formatCurrency, formatCurrencyCompact, formatPercent } from "@/utils/format";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  RefreshCw,
  ShoppingBag,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = [
  CHART_COLORS.brand,
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  CHART_COLORS.brandDark,
];

interface ChartData {
  orderTimeSeries?: Array<{ date: string; orders: number; gmv: number }>;
  cuisineDistribution?: Array<{ name: string; count: number }>;
}

interface PendingItem {
  _id: string;
  orderNumber?: string;
  name?: string;
}
interface PendingActions {
  stuckOrders: PendingItem[];
  pendingRestaurants: PendingItem[];
  urgentTickets: PendingItem[];
}

const delta = (v: number | null) =>
  v === null || v === undefined ? undefined : { value: Number(v.toFixed(1)) };

export default function AdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [pending, setPending] = useState<PendingActions | null>(null);
  const [range, setRange] = useState<ChartRange>("30d");
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCore = useCallback(async () => {
    const [sRes, pRes] = await Promise.all([
      adminService.getDashboardStats(),
      adminService.getPendingActions(),
    ]);
    setStats((sRes.data as unknown as { data: DashboardStats }).data);
    setPending((pRes.data as { data: PendingActions }).data);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadCore()
      .catch(() => toast({ title: "Failed to load dashboard", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [loadCore, toast]);

  useEffect(() => {
    let active = true;
    setChartsLoading(true);
    adminService
      .getDashboardCharts(range)
      .then((res) => {
        if (active) setCharts((res.data as { data: ChartData }).data);
      })
      .catch(() => {
        if (active) setCharts(null);
      })
      .finally(() => active && setChartsLoading(false));
    return () => {
      active = false;
    };
  }, [range]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadCore();
      toast({ title: "Dashboard refreshed" });
    } catch {
      toast({ title: "Failed to refresh", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const liveStatuses = Object.entries(stats?.liveOperations.activeOrders ?? {}).filter(
    ([, v]) => (v as number) > 0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Overview"
        description="Today's marketplace performance and items that need attention."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="GMV (today)"
          value={stats ? formatCurrency(stats.today.gmv) : "—"}
          icon={TrendingUp}
          accent="brand"
          delta={stats ? delta(stats.changes.gmvPct) : undefined}
          loading={loading}
        />
        <StatCard
          label="Platform Revenue"
          value={stats ? formatCurrency(stats.today.revenue) : "—"}
          icon={Wallet}
          hint="commission"
          loading={loading}
        />
        <StatCard
          label="Orders (today)"
          value={stats ? stats.today.orders : "—"}
          icon={ShoppingBag}
          delta={stats ? delta(stats.changes.ordersPct) : undefined}
          hint={stats ? `${stats.today.deliveredOrders} delivered` : undefined}
          loading={loading}
        />
        <StatCard
          label="New Customers"
          value={stats ? stats.today.newCustomers : "—"}
          icon={Users}
          delta={stats ? delta(stats.changes.customersPct) : undefined}
          loading={loading}
        />
        <StatCard
          label="Avg Order Value"
          value={stats ? formatCurrency(stats.today.avgOrderValue) : "—"}
          icon={Package}
          loading={loading}
        />
        <StatCard
          label="Cancellation Rate"
          value={stats ? formatPercent(stats.today.cancellationRate) : "—"}
          icon={TrendingDown}
          hint={stats ? `${stats.today.cancelledOrders} cancelled` : undefined}
          loading={loading}
        />
      </div>

      {/* Live ops + pending actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live Operations
            </span>
          }
        >
          <div className="space-y-2.5">
            {liveStatuses.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">No active orders</p>
            ) : (
              liveStatuses.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">
                    {status.replace(/_/g, " ")}
                  </span>
                  <span className="font-semibold text-foreground">{count as number}</span>
                </div>
              ))
            )}
            {stats && stats.liveOperations.stuckPendingOrders > 0 && (
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                {stats.liveOperations.stuckPendingOrders} stuck orders (&gt;10 min)
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Requires Attention" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Restaurant Approvals",
                count: stats?.pendingActions.restaurantApprovals ?? 0,
                icon: Store,
                href: "/admin/restaurants/approval-queue",
              },
              {
                label: "Vendor Applications",
                count: stats?.pendingActions.vendorApplications ?? 0,
                icon: Users,
                href: "/admin/users/vendors?status=pending",
              },
              {
                label: "Support Tickets",
                count: stats?.pendingActions.openSupportTickets ?? 0,
                icon: AlertTriangle,
                href: "/admin/support",
              },
              {
                label: "Driver Applications",
                count: stats?.pendingActions.driverApplications ?? 0,
                icon: Package,
                href: "/admin/users/drivers?tab=applications",
              },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-brand-300 hover:bg-accent/40"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <item.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xl font-bold text-foreground">{item.count}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Orders & GMV"
          description="Daily order volume and gross merchandise value."
          loading={chartsLoading}
          empty={!charts?.orderTimeSeries?.length}
          action={
            <SegmentedTabs
              value={range}
              onChange={(v) => setRange(v as ChartRange)}
              options={[
                { value: "7d", label: "7d" },
                { value: "30d", label: "30d" },
                { value: "90d", label: "90d" },
              ]}
            />
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts?.orderTimeSeries ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
                tickFormatter={(v: number) => formatCurrencyCompact(v)}
              />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Orders" />
              <Line yAxisId="right" type="monotone" dataKey="gmv" stroke={CHART_COLORS.brand} strokeWidth={2} dot={false} name="GMV" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Cuisine Distribution"
          description="Active restaurants by cuisine."
          loading={chartsLoading}
          empty={!charts?.cuisineDistribution?.length}
        >
          <div className="flex h-full items-center gap-4">
            <ResponsiveContainer width={180} height="100%">
              <PieChart>
                <Pie
                  data={charts?.cuisineDistribution ?? []}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  strokeWidth={0}
                >
                  {(charts?.cuisineDistribution ?? []).map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="min-w-0 flex-1 space-y-1.5">
              {(charts?.cuisineDistribution ?? []).slice(0, 8).map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="truncate text-muted-foreground">{c.name}</span>
                  <span className="ml-auto font-semibold text-foreground">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Stuck orders + approval queue */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Stuck Orders
            </span>
          }
        >
          {!pending?.stuckOrders.length ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> No stuck orders — all good!
            </div>
          ) : (
            <div className="space-y-2">
              {pending.stuckOrders.map((o) => (
                <Link
                  key={o._id}
                  to={`/admin/orders/${o._id}`}
                  className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm transition-colors hover:bg-amber-50"
                >
                  <span className="font-mono font-medium text-foreground">#{o.orderNumber}</span>
                  <span className="text-xs text-amber-600">Pending &gt;10 min</span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Store className="h-4 w-4 text-brand-500" /> Approval Queue
            </span>
          }
          actions={
            <Link
              to="/admin/restaurants/approval-queue"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          }
        >
          {!pending?.pendingRestaurants.length ? (
            <EmptyState
              icon={CheckCircle2}
              title="No pending approvals"
              className="border-0 py-6"
            />
          ) : (
            <div className="space-y-2">
              {pending.pendingRestaurants.map((r) => (
                <Link
                  key={r._id}
                  to={`/admin/restaurants/${r._id}`}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm transition-colors hover:border-brand-300 hover:bg-accent/40"
                >
                  <span className="truncate font-medium text-foreground">{r.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-primary">Review →</span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
