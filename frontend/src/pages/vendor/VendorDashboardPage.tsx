import React, { useEffect, useState, useMemo } from "react";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  CHART_COLORS,
  ChartCard,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  VendorEmptyState,
} from "@/components/vendor";
import { useVendor } from "@/contexts/VendorContext";
import { toast } from "@/lib/toast";
import vendorService from "@/services/vendorService";
import type {
  RevenueDataPoint,
  VendorAnalytics,
  VendorDashboardStats,
  VendorOrder,
} from "@/types/vendor";
import { formatCurrency } from "@/utils/format";

// ── Helpers (data logic preserved verbatim) ──────────────────────

const toSafeNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object" && "$numberDecimal" in value) {
    const parsed = Number((value as { $numberDecimal?: string }).$numberDecimal);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toIsoDate = (value: unknown): string => {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().split("T")[0];
  }
  return "";
};

const buildSevenDaySeries = (
  analytics: VendorAnalytics | null,
  todayRevenue: number,
  todayOrders: number,
): RevenueDataPoint[] => {
  const synthesizeToday = (): RevenueDataPoint[] => {
    if (todayRevenue <= 0 && todayOrders <= 0) return [];
    const series: RevenueDataPoint[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const isoDate = date.toISOString().split("T")[0];
      series.push({
        date: isoDate,
        revenue: i === 0 ? todayRevenue : 0,
        orders: i === 0 ? todayOrders : 0,
      });
    }
    return series;
  };

  if (!analytics) return synthesizeToday();

  const rawRevenue =
    analytics.revenueOverTime && analytics.revenueOverTime.length > 0
      ? analytics.revenueOverTime
      : (analytics.revenueByDay ?? []);

  if (rawRevenue.length === 0) return synthesizeToday();

  const normalized = rawRevenue
    .map((point) => ({
      date: toIsoDate(point.date),
      revenue: toSafeNumber((point as { revenue?: unknown }).revenue),
      orders: toSafeNumber(
        (point as { orders?: unknown; count?: unknown }).orders ??
          (point as { count?: unknown }).count ??
          0,
      ),
    }))
    .filter((point) => point.date);

  if (normalized.length === 0) return [];

  const byDate = new Map(normalized.map((point) => [point.date, point]));
  const series: RevenueDataPoint[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const isoDate = date.toISOString().split("T")[0];
    series.push(byDate.get(isoDate) ?? { date: isoDate, revenue: 0, orders: 0 });
  }
  return series;
};

const computePercentChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
};

// ── Main ─────────────────────────────────────────────────────────

const VendorDashboardPage: React.FC = () => {
  const { selectedRestaurantId, restaurants } = useVendor();
  const navigate = useNavigate();

  const [stats, setStats] = useState<VendorDashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [liveOrders, setLiveOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedRestaurant = restaurants.find((r) => r._id === selectedRestaurantId);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = selectedRestaurantId
          ? { limit: 5, status: "preparing,ready", restaurantId: selectedRestaurantId }
          : { limit: 5, status: "preparing,ready" };

        const [statsRes, analyticsRes, ordersRes] = await Promise.all([
          vendorService.getDashboardStats(),
          vendorService.getAnalytics("7d"),
          vendorService.getOrders(params),
        ]);

        if (cancelled) return;

        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        } else {
          toast.error("Error", {
            description: statsRes.message || "Failed to load dashboard statistics.",
          });
        }
        if (analyticsRes.success && analyticsRes.data) setAnalytics(analyticsRes.data);
        if (ordersRes.success && ordersRes.data) setLiveOrders(ordersRes.data.orders);
      } catch {
        if (!cancelled) {
          setError("Failed to load dashboard data. Please try again.");
          toast.error("Error", {
            description: "An unexpected error occurred while loading the dashboard.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [selectedRestaurantId]);

  const kpis = useMemo(() => {
    if (!stats) {
      return {
        todayRevenue: 0,
        todayRevenueTrend: null as number | null,
        activeOrders: 0,
        pendingOrders: 0,
        avgOrderValue: 0,
        avgOrderValueTrend: null as number | null,
        revenueOverTime: [] as RevenueDataPoint[],
      };
    }

    const revenueData = buildSevenDaySeries(
      analytics,
      toSafeNumber(stats.todayRevenue),
      toSafeNumber(stats.todayOrders),
    );
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const yesterdayPoint = revenueData.find((d) => d.date === yesterdayStr);
    const yesterdayRevenue = toSafeNumber(yesterdayPoint?.revenue);
    const yesterdayOrders = toSafeNumber(yesterdayPoint?.orders);

    const preparingCount =
      stats.ordersByStatus?.find((s) => s.status === "preparing")?.count ?? 0;
    const readyCount =
      stats.ordersByStatus?.find(
        (s) => s.status === "ready" || s.status === "ready_for_pickup",
      )?.count ?? 0;

    const yesterdayAov = yesterdayOrders > 0 ? yesterdayRevenue / yesterdayOrders : 0;

    return {
      todayRevenue: toSafeNumber(stats.todayRevenue),
      todayRevenueTrend: computePercentChange(toSafeNumber(stats.todayRevenue), yesterdayRevenue),
      activeOrders: preparingCount + readyCount,
      pendingOrders: toSafeNumber(stats.pendingOrders),
      avgOrderValue: toSafeNumber(stats.avgOrderValue),
      avgOrderValueTrend:
        yesterdayAov > 0
          ? computePercentChange(toSafeNumber(stats.avgOrderValue), yesterdayAov)
          : null,
      revenueOverTime: revenueData,
    };
  }, [stats, analytics]);

  const topItems = (stats?.popularItems ?? []).slice(0, 5);
  const hasLiveOrders = liveOrders.length > 0;

  const chartData = useMemo(
    () =>
      kpis.revenueOverTime.map((point) => ({
        date: new Date(point.date).toLocaleDateString("en-US", { weekday: "short" }),
        revenue: toSafeNumber(point.revenue),
      })),
    [kpis.revenueOverTime],
  );

  const header = (
    <PageHeader
      title="Dashboard"
      subtitle={
        selectedRestaurant ? (
          <span className="flex items-center gap-2">
            {selectedRestaurant.name}
            {selectedRestaurant.isTemporarilyClosed && (
              <StatusBadge label="Temporarily closed" tone="warning" />
            )}
          </span>
        ) : undefined
      }
      actions={
        <Button asChild variant="brand">
          <Link to="/vendor/orders">View live orders</Link>
        </Button>
      }
    />
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <VendorEmptyState
          icon={AlertCircle}
          variant="error"
          title="Couldn't load the dashboard"
          description={error}
          action={{ label: "Retry", onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(kpis.todayRevenue)}
          icon={DollarSign}
          accent="brand"
          loading={loading}
          delta={
            kpis.todayRevenueTrend != null
              ? { value: kpis.todayRevenueTrend, label: "vs yesterday" }
              : undefined
          }
          onClick={() => navigate("/vendor/analytics")}
        />
        <StatCard
          label="Active Orders"
          value={kpis.activeOrders}
          icon={ShoppingBag}
          loading={loading}
          hint="Preparing & ready"
          onClick={() => navigate("/vendor/orders")}
        />
        <StatCard
          label="Pending Orders"
          value={kpis.pendingOrders}
          icon={Clock}
          loading={loading}
          hint="Awaiting confirmation"
          onClick={() => navigate("/vendor/orders")}
        />
        <StatCard
          label="Avg. Order Value"
          value={formatCurrency(kpis.avgOrderValue)}
          icon={TrendingUp}
          loading={loading}
          delta={
            kpis.avgOrderValueTrend != null
              ? { value: kpis.avgOrderValueTrend, label: "vs yesterday" }
              : undefined
          }
          onClick={() => navigate("/vendor/analytics")}
        />
      </div>

      {/* 7-day revenue */}
      <ChartCard
        title="7-Day Revenue"
        description="Daily revenue for the past week"
        loading={loading}
        empty={!loading && chartData.length === 0}
        emptyLabel="No revenue data available for the past week"
        height={180}
        action={
          <Link
            to="/vendor/analytics"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Analytics <ChevronRight className="h-4 w-4" />
          </Link>
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <RechartsTooltip
              formatter={(value) => [formatCurrency(value as number), "Revenue"] as [string, string]}
              labelStyle={{ display: "none" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                fontSize: 12,
                padding: "8px 12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={CHART_COLORS.brandDark}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: CHART_COLORS.brandDark }}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
              dy={8}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Live orders + popular items */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              Live Orders
              {hasLiveOrders && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
              )}
            </span>
          }
          actions={
            <Link to="/vendor/orders" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : hasLiveOrders ? (
            <div className="space-y-1">
              {liveOrders.map((order) => (
                <Link
                  key={order._id}
                  to={`/vendor/orders/${order._id}`}
                  className="group flex items-center justify-between rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      #{order.orderNumber?.slice(-4) || "—"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {order.customer?.name || "Guest"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.items?.length || 0} item
                        {(order.items?.length ?? 0) !== 1 ? "s" : ""} · {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={order.status} size="sm" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <VendorEmptyState
              icon={ShoppingBag}
              title="No live orders"
              description="All orders have been processed."
              className="border-0 py-8"
            />
          )}
        </SectionCard>

        <SectionCard
          title="Popular Items"
          actions={
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              This week
            </span>
          }
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : topItems.length > 0 ? (
            <div className="space-y-0.5">
              {topItems.map((item, idx) => (
                <div
                  key={item._id || item.name}
                  className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/60"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0
                        ? "bg-primary text-primary-foreground"
                        : idx < 3
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    {item.totalRevenue !== undefined && item.totalRevenue > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.totalRevenue)}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                    <UtensilsCrossed className="h-3 w-3" />
                    {(item.orderCount ?? item.totalOrdered) || 0}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <VendorEmptyState
              icon={Wallet}
              title="No data yet"
              description="Popular items will appear once orders come in."
              className="border-0 py-8"
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default VendorDashboardPage;
