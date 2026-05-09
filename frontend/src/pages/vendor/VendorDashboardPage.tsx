import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  ChevronRight,
  UtensilsCrossed,
} from "lucide-react";
import { Link } from "react-router-dom";
import vendorService from "@/services/vendorService";
import { useVendor } from "@/contexts/VendorContext";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
} from "recharts";
import type {
  VendorDashboardStats,
  VendorAnalytics,
  VendorOrder,
  RevenueDataPoint,
} from "@/types/vendor";

// ── Helpers ──────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  `৳${amount.toLocaleString("en-BD", { minimumFractionDigits: 0 })}`;

const toSafeNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object" && "$numberDecimal" in value) {
    const parsed = Number(
      (value as { $numberDecimal?: string }).$numberDecimal,
    );
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toIsoDate = (value: unknown): string => {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toISOString().split("T")[0];
  }
  return "";
};

const buildSevenDaySeries = (
  analytics: VendorAnalytics | null,
  todayRevenue: number,
  todayOrders: number,
): RevenueDataPoint[] => {
  if (!analytics) {
    if (todayRevenue > 0 || todayOrders > 0) {
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
    }
    return [];
  }

  const rawRevenue =
    analytics.revenueOverTime && analytics.revenueOverTime.length > 0
      ? analytics.revenueOverTime
      : (analytics.revenueByDay ?? []);

  if (rawRevenue.length === 0) {
    if (todayRevenue > 0 || todayOrders > 0) {
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
    }
    return [];
  }

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
    series.push(
      byDate.get(isoDate) ?? {
        date: isoDate,
        revenue: 0,
        orders: 0,
      },
    );
  }

  return series;
};

const computePercentChange = (
  current: number,
  previous: number,
): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
};

const statusPillClass = (status: string): string => {
  switch (status) {
    case "preparing":
      return "status-pill status-pill-warning";
    case "ready":
    case "ready_for_pickup":
      return "status-pill status-pill-success";
    case "pending":
      return "status-pill status-pill-info";
    case "delivered":
      return "status-pill status-pill-success";
    case "cancelled":
      return "status-pill status-pill-danger";
    default:
      return "status-pill status-pill-neutral";
  }
};

// ── KPI Card Component ───────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number | null;
  iconColor: string;
  subtitle?: string;
  to?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  iconColor,
  subtitle,
  to,
}) => {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`kpi-card ${to ? "cursor-pointer hover:shadow-md" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-xl ${iconColor}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== null && trend !== undefined && (
          <span
            className={`kpi-card-delta ${
              trend >= 0 ? "text-green-600" : "text-red-500"
            }`}
          >
            {trend >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" />
            )}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="kpi-card-value">{value}</p>
      <p className="kpi-card-label">{title}</p>
      {subtitle && <p className="text-2xs text-gray-400 mt-0.5">{subtitle}</p>}
    </motion.div>
  );

  if (!to) return content;

  return (
    <Link to={to} className="block" aria-label={`${title} details`}>
      {content}
    </Link>
  );
};

// ── 7-Day Revenue Sparkline (Converted to Line Chart) ──

interface SparklineProps {
  data: RevenueDataPoint[];
}

const RevenueSparkline: React.FC<SparklineProps> = ({ data }) => {
  const chartData = data.map((point) => ({
    date: new Date(point.date).toLocaleDateString("en-US", {
      weekday: "short",
    }),
    revenue: Number.isFinite(point.revenue)
      ? point.revenue
      : toSafeNumber(point.revenue),
  }));

  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <RechartsTooltip
            formatter={(value: number) => [formatCurrency(value), "Revenue"]}
            labelStyle={{ display: "none" }}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              fontSize: 12,
              padding: "8px 12px",
            }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#ea580c"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "#ea580c" }}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            dy={8}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Live Order Row ───────────────────────────────────────────────

interface LiveOrderRowProps {
  order: VendorOrder;
}

const LiveOrderRow: React.FC<LiveOrderRowProps> = ({ order }) => (
  <Link
    to={`/vendor/orders/${order._id}`}
    className="flex items-center justify-between p-3 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-100 transition-all group"
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">
        #{order.orderNumber?.slice(-4) || "—"}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {order.customer?.name || "Guest"}
        </p>
        <p className="text-xs text-gray-500">
          {order.items?.length || 0} item
          {(order.items?.length ?? 0) !== 1 ? "s" : ""} —{" "}
          {formatCurrency(order.total)}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <span className={statusPillClass(order.status)}>
        {order.status === "ready_for_pickup"
          ? "Ready"
          : order.status.replace(/_/g, " ")}
      </span>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
    </div>
  </Link>
);

// ── Popular Item Row ─────────────────────────────────────────────

interface PopularItemRowProps {
  item: NonNullable<VendorDashboardStats["popularItems"]>[number];
  rank: number;
}

const PopularItemRow: React.FC<PopularItemRowProps> = ({ item, rank }) => {
  const rankColors = [
    "bg-orange-500 text-white",
    "bg-orange-200 text-orange-700",
    "bg-orange-100 text-orange-600",
    "bg-gray-100 text-gray-500",
    "bg-gray-50 text-gray-400",
  ];

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
      <span
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          rankColors[rank] ?? rankColors[4]
        }`}
      >
        {rank + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {item.name}
        </p>
        {item.totalRevenue !== undefined && item.totalRevenue > 0 && (
          <p className="text-xs text-gray-400">
            {formatCurrency(item.totalRevenue)}
          </p>
        )}
      </div>
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-medium">
        <UtensilsCrossed className="w-3 h-3" />
        {(item.orderCount ?? item.totalOrdered) || 0}
      </span>
    </div>
  );
};

// ── Skeleton Components ──────────────────────────────────────────

const KpiSkeleton: React.FC = () => (
  <div className="kpi-card animate-pulse">
    <div className="h-11 w-11 bg-gray-200 rounded-xl mb-4" />
    <div className="h-7 w-24 bg-gray-200 rounded mb-2" />
    <div className="h-4 w-32 bg-gray-200 rounded" />
  </div>
);

const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
    <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-10 bg-gray-100 rounded mb-2" />
    ))}
  </div>
);

// ── Main Dashboard Component ─────────────────────────────────────

const VendorDashboardPage: React.FC = () => {
  const { selectedRestaurantId } = useVendor();
  const { toast } = useToast();

  const [stats, setStats] = useState<VendorDashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [liveOrders, setLiveOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = selectedRestaurantId
          ? {
              limit: 5,
              status: "preparing,ready",
              restaurantId: selectedRestaurantId,
            }
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
          toast({
            title: "Error",
            description:
              statsRes.message || "Failed to load dashboard statistics.",
            variant: "destructive",
          });
        }

        if (analyticsRes.success && analyticsRes.data) {
          setAnalytics(analyticsRes.data);
        }

        if (ordersRes.success && ordersRes.data) {
          setLiveOrders(ordersRes.data.orders);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load dashboard data. Please try again.");
          toast({
            title: "Error",
            description:
              "An unexpected error occurred while loading the dashboard.",
            variant: "destructive",
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
  }, [selectedRestaurantId, toast]);

  // ── Compute KPI data including trends vs yesterday ──────────

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
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayStr = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    // Try to find yesterday's data point in revenueOverTime
    const yesterdayPoint = revenueData.find((d) => d.date === yesterdayStr);
    const yesterdayRevenue = toSafeNumber(yesterdayPoint?.revenue);
    const yesterdayOrders = toSafeNumber(yesterdayPoint?.orders);

    // Count active orders: PREPARING + READY / READY_FOR_PICKUP
    const preparingCount =
      stats.ordersByStatus?.find((s) => s.status === "preparing")?.count ?? 0;
    const readyCount =
      stats.ordersByStatus?.find(
        (s) => s.status === "ready" || s.status === "ready_for_pickup",
      )?.count ?? 0;

    // Average order value trend: compare today's AOV vs yesterday's AOV
    const yesterdayAov =
      yesterdayOrders > 0 ? yesterdayRevenue / yesterdayOrders : 0;

    return {
      todayRevenue: toSafeNumber(stats.todayRevenue),
      todayRevenueTrend: computePercentChange(
        toSafeNumber(stats.todayRevenue),
        yesterdayRevenue,
      ),
      activeOrders: preparingCount + readyCount,
      pendingOrders: toSafeNumber(stats.pendingOrders),
      avgOrderValue: toSafeNumber(stats.avgOrderValue),
      avgOrderValueTrend:
        yesterdayAov > 0
          ? computePercentChange(
              toSafeNumber(stats.avgOrderValue),
              yesterdayAov,
            )
          : null,
      revenueOverTime: revenueData,
    };
  }, [stats, analytics]);

  // ── Derived data ────────────────────────────────────────────

  const topItems = (stats?.popularItems ?? []).slice(0, 5);
  const hasLiveOrders = liveOrders.length > 0;

  // ── Loading State ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
          <div className="h-28 bg-gray-100 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
        </div>
      </div>
    );
  }

  // ── Error State ─────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <AlertCircle className="w-14 h-14 text-red-300 mb-4" />
        <p className="text-lg font-semibold text-gray-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 px-5 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm font-medium shadow-card"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty / No-data State ───────────────────────────────────

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <AlertCircle className="w-14 h-14 text-gray-300 mb-4" />
        <p className="text-lg font-semibold text-gray-700">
          No dashboard data available.
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Data will appear once you start receiving orders.
        </p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ═══ KPI Cards Row ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          title="Today's Revenue"
          value={formatCurrency(kpis.todayRevenue)}
          icon={DollarSign}
          trend={kpis.todayRevenueTrend}
          iconColor="bg-gradient-to-r from-green-500 to-emerald-500"
          to="/vendor/analytics"
        />
        <KpiCard
          title="Active Orders"
          value={kpis.activeOrders}
          icon={ShoppingBag}
          iconColor="bg-gradient-to-r from-blue-500 to-indigo-500"
          subtitle="Preparing &amp; Ready"
          to="/vendor/orders"
        />
        <KpiCard
          title="Pending Orders"
          value={kpis.pendingOrders}
          icon={Clock}
          iconColor="bg-gradient-to-r from-orange-500 to-red-500"
          to="/vendor/orders"
        />
        <KpiCard
          title="Avg. Order Value"
          value={formatCurrency(kpis.avgOrderValue)}
          icon={TrendingUp}
          trend={kpis.avgOrderValueTrend}
          iconColor="bg-gradient-to-r from-purple-500 to-pink-500"
          to="/vendor/analytics"
        />
      </div>

      {/* ═══ 7-Day Revenue Sparkline ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-gray-200 p-6 shadow-card"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              7-Day Revenue
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Daily revenue for the past week
            </p>
          </div>
          <Link
            to="/vendor/analytics"
            className="text-sm text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-1 transition-colors"
          >
            Analytics
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {kpis.revenueOverTime.length > 0 ? (
          <RevenueSparkline data={kpis.revenueOverTime} />
        ) : (
          <div className="h-28 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
            No revenue data available for the past week.
          </div>
        )}
      </motion.div>

      {/* ═══ Two-column: Live Orders + Popular Items ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Live Orders Widget ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-card"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-gray-900">
                Live Orders
              </h3>
              {hasLiveOrders && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
              )}
            </div>
            <Link
              to="/vendor/orders"
              className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
            >
              View all
            </Link>
          </div>

          {hasLiveOrders ? (
            <div className="space-y-1">
              {liveOrders.map((order) => (
                <LiveOrderRow key={order._id} order={order} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-gray-500">
                No live orders
              </p>
              <p className="text-xs text-gray-400 mt-1">
                All orders have been processed.
              </p>
            </div>
          )}
        </motion.div>

        {/* ── Top 5 Popular Items ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-gray-200 p-6 shadow-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Popular Items
            </h3>
            <span className="text-2xs font-medium text-gray-400 uppercase tracking-wide">
              This week
            </span>
          </div>

          {topItems.length > 0 ? (
            <div className="space-y-0.5">
              {topItems.map((item, idx) => (
                <PopularItemRow
                  key={item._id || item.name}
                  item={item}
                  rank={idx}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-gray-500">No data yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Popular items will appear once orders come in.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VendorDashboardPage;
