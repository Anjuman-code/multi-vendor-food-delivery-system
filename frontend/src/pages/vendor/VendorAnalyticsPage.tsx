import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Loader2,
  BarChart3,
  Percent,
  Tag,
  Award,
  CheckCircle2,
  Utensils,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import vendorService from "@/services/vendorService";
import type { VendorAnalytics, VendorCoupon } from "@/types/vendor";

// ── Period Options ─────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: "7d", label: "Day" },
  { value: "30d", label: "Week" },
  { value: "90d", label: "Month" },
  { value: "12m", label: "Year" },
];

// ── Status Constants ───────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// ── KPI Card Component ─────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  trend?: number | null;
  subtitle?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor,
  trend,
  subtitle,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="kpi-card"
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

// ── Section Header ─────────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}> = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-2 mb-5">
    <div className="p-1.5 rounded-lg bg-orange-50">
      <Icon className="w-4 h-4 text-orange-500" />
    </div>
    <div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  </div>
);

// ── Skeleton ───────────────────────────────────────────────────────

const AnalyticsSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="kpi-card">
          <div className="h-11 w-11 bg-gray-200 rounded-xl mb-4" />
          <div className="h-7 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
      <div className="h-5 w-40 bg-gray-200 rounded mb-6" />
      <div className="flex items-end gap-1 h-48">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-100 rounded-t"
            style={{ height: `${20 + Math.random() * 80}%` }}
          />
        ))}
      </div>
    </div>
  </div>
);

// ── Helpers ────────────────────────────────────────────────────────

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

const formatCurrency = (amount: unknown): string =>
  `৳${toSafeNumber(amount).toLocaleString("en-BD")}`;

const formatPercent = (value: number): string =>
  `${(Math.round(value * 100) / 100).toFixed(1)}%`;

// ── Main Page ──────────────────────────────────────────────────────

const VendorAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [coupons, setCoupons] = useState<VendorCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  // ── Data Loading ────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await vendorService.getAnalytics(period);
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
      setLoading(false);
    };
    load();
  }, [period]);

  useEffect(() => {
    const loadCoupons = async () => {
      setCouponsLoading(true);
      const res = await vendorService.getCoupons();
      if (res.success && res.data) {
        setCoupons(res.data.coupons ?? []);
      }
      setCouponsLoading(false);
    };
    loadCoupons();
  }, []);

  // ── Derived Analytics ───────────────────────────────────────────

  const {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    completionRate,
    deliveredOrders,
    cancelledOrders,
    revenueOverTime,
    topSellingItems,
  } = useMemo(() => {
    if (!analytics) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        completionRate: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        revenueOverTime: [] as {
          date: string;
          revenue: number;
          orders: number;
        }[],
        topSellingItems: [] as {
          name: string;
          quantity: number;
          revenue: number;
        }[],
      };
    }
    return {
      totalRevenue: toSafeNumber(analytics.totalRevenue),
      totalOrders: toSafeNumber(analytics.totalOrders),
      averageOrderValue: toSafeNumber(analytics.averageOrderValue),
      completionRate: toSafeNumber(analytics.completionRate),
      deliveredOrders: toSafeNumber(analytics.deliveredOrders),
      cancelledOrders: toSafeNumber(analytics.cancelledOrders),
      revenueOverTime:
        analytics.revenueOverTime?.map((pt) => ({
          date: pt.date,
          revenue: toSafeNumber(pt.revenue),
          orders: toSafeNumber(pt.orders),
        })) ?? [],
      topSellingItems: analytics.topSellingItems
        ? analytics.topSellingItems.map((item) => ({
            name: item.name,
            quantity: toSafeNumber(item.quantity),
            revenue: toSafeNumber(item.revenue),
          }))
        : (analytics.topItems?.map((item) => ({
            name: item.name,
            quantity: toSafeNumber(item.orderCount),
            revenue: toSafeNumber(item.revenue),
          })) ?? []),
    };
  }, [analytics]);

  // ── Revenue Chart Limits ────────────────────────────────────────

  const maxRevenue = Math.max(...revenueOverTime.map((d) => d.revenue), 1);

  // ── Status Breakdown (derived from delivered/cancelled counts) ──

  const statusBreakdown = useMemo(() => {
    const inProgress = Math.max(
      0,
      totalOrders - deliveredOrders - cancelledOrders,
    );
    const groups = [
      { status: "delivered", count: deliveredOrders },
      { status: "cancelled", count: cancelledOrders },
    ];
    if (inProgress > 0) {
      groups.push({ status: "in_progress" as const, count: inProgress });
    }
    return groups.filter((g) => g.count > 0);
  }, [totalOrders, deliveredOrders, cancelledOrders]);

  // ── Top Items (sorted by revenue / by quantity) ─────────────────

  const itemsSortedByRevenue = useMemo(
    () =>
      [...topSellingItems].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    [topSellingItems],
  );

  const itemsSortedByQuantity = useMemo(
    () =>
      [...topSellingItems].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
    [topSellingItems],
  );

  const maxItemRevenue = Math.max(
    ...itemsSortedByRevenue.map((i) => i.revenue),
    1,
  );
  const maxItemQuantity = Math.max(
    ...itemsSortedByQuantity.map((i) => i.quantity),
    1,
  );

  // ── Coupon Stats ────────────────────────────────────────────────

  const activeCouponsWithUsage = useMemo(
    () =>
      coupons
        .filter((c) => c.isActive)
        .map((c) => {
          const used = toSafeNumber(c.usedCount);
          const limit = toSafeNumber(c.usageLimit);
          const redemptionRate = limit > 0 ? (used / limit) * 100 : 0;

          // Compute estimated average discount per use
          let avgDiscount = 0;
          let maxDisc = 0;
          if (c.type === "fixed") {
            avgDiscount = toSafeNumber(c.value);
          } else if (c.type === "percentage") {
            const minOrder = toSafeNumber(
              c.minOrderAmount ?? c.minimumOrderAmount ?? 0,
            );
            maxDisc = toSafeNumber(c.maxDiscount ?? 0);
            const pctValue = toSafeNumber(c.value);
            if (maxDisc > 0) {
              avgDiscount = Math.min(minOrder * (pctValue / 100), maxDisc);
            } else {
              avgDiscount = minOrder * (pctValue / 100);
            }
          }

          // Estimated revenue attributed: assume that each coupon use drives
          // an order roughly 2x the average discount
          const estimatedRevenueAttributed =
            used > 0 ? used * avgDiscount * 2 : 0;

          return {
            _id: c._id,
            code: c.code,
            type: c.type,
            value: toSafeNumber(c.value),
            usedCount: used,
            usageLimit: limit,
            redemptionRate,
            avgDiscount,
            estimatedRevenueAttributed,
            minOrder: toSafeNumber(
              c.minOrderAmount ?? c.minimumOrderAmount ?? 0,
            ),
            maxDisc,
          };
        })
        .sort((a, b) => b.usedCount - a.usedCount)
        .slice(0, 10),
    [coupons],
  );

  // ── Loading State ───────────────────────────────────────────────

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  if (!analytics) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Failed to load analytics data.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-orange-500 hover:text-orange-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your business performance
          </p>
        </div>

        {/* Pill-style period toggle */}
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 gap-0">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                period === opt.value
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 6. Summary KPI Row ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          iconColor="bg-green-500"
        />
        <KpiCard
          title="Total Orders"
          value={totalOrders}
          icon={ShoppingBag}
          iconColor="bg-blue-500"
        />
        <KpiCard
          title="Avg Order Value"
          value={formatCurrency(averageOrderValue)}
          icon={TrendingUp}
          iconColor="bg-orange-500"
        />
        <KpiCard
          title="Completion Rate"
          value={formatPercent(completionRate)}
          icon={Percent}
          iconColor="bg-purple-500"
          subtitle={`${deliveredOrders} delivered · ${cancelledOrders} cancelled`}
        />
      </div>

      {/* ── 2. Revenue Over Time Bar Chart ────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-100 p-5 shadow-card"
      >
        <SectionHeader icon={BarChart3} title="Revenue Over Time" />
        {revenueOverTime.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-sm">
            No revenue data available for this period.
          </p>
        ) : (
          <div className="h-48 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueOverTime}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E5E7EB"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(val) => `৳${val}`}
                />
                <RechartsTooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Revenue",
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    fontSize: 12,
                    padding: "8px 12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#ea580c" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* ── 3. Orders by Status + 4. Top Items (quick) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status — stacked horizontal + legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-gray-100 p-5 shadow-card"
        >
          <SectionHeader icon={CheckCircle2} title="Orders by Status" />
          {statusBreakdown.length === 0 ||
          statusBreakdown.every((s) => s.count === 0) ? (
            <p className="text-gray-400 text-center py-8 text-sm">
              No order data available.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Stacked bar converted to Line Graph */}
              <div className="h-40 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={statusBreakdown}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E5E7EB"
                    />
                    <XAxis
                      dataKey="status"
                      tickFormatter={(status: string) =>
                        STATUS_LABELS[status] ||
                        (status === "in_progress" ? "In Progress" : status)
                      }
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      formatter={(value: number) => [value, "Orders"]}
                      labelFormatter={(label) =>
                        STATUS_LABELS[label as string] ||
                        (label === "in_progress" ? "In Progress" : label)
                      }
                      contentStyle={{
                        borderRadius: 8,
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        fontSize: 12,
                        padding: "8px 12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#7c3aed" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick Top Items (top 5 by revenue) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-100 p-5 shadow-card"
        >
          <SectionHeader icon={Utensils} title="Top Items by Revenue" />
          {itemsSortedByRevenue.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">
              No item data available.
            </p>
          ) : (
            <div className="space-y-3">
              {itemsSortedByRevenue.slice(0, 5).map((item, idx) => {
                const pct = (item.revenue / maxItemRevenue) * 100;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-gray-400 text-right flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-red-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-20 text-right flex-shrink-0">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── 4. Top Items: Revenue vs Quantity (side-by-side) ─ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-xl border border-gray-100 p-5 shadow-card"
      >
        <SectionHeader
          icon={Award}
          title="Top Items: Revenue vs Quantity"
          subtitle="Comparing top 10 items by revenue and by units sold"
        />
        {topSellingItems.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-sm">
            No item data available.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Revenue column — orange bars */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                By Revenue
              </h4>
              <div className="space-y-2">
                {itemsSortedByRevenue.slice(0, 8).map((item, idx) => {
                  const pct = (item.revenue / maxItemRevenue) * 100;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-gray-700 truncate flex-1 min-w-0">
                        {item.name}
                      </span>
                      <div className="w-24 h-3 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-red-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-orange-600 font-medium w-16 text-right flex-shrink-0">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quantity column — gray bars */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                By Quantity
              </h4>
              <div className="space-y-2">
                {itemsSortedByQuantity.slice(0, 8).map((item, idx) => {
                  const pct = (item.quantity / maxItemQuantity) * 100;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-gray-700 truncate flex-1 min-w-0">
                        {item.name}
                      </span>
                      <div className="w-24 h-3 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className="h-full bg-gradient-to-r from-gray-300 to-gray-500 rounded-full"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 font-medium w-10 text-right flex-shrink-0">
                        {item.quantity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── 5. Coupon Performance Table ───────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border border-gray-100 p-5 shadow-card"
      >
        <SectionHeader
          icon={Tag}
          title="Coupon Performance"
          subtitle="Active coupons sorted by usage"
        />
        {couponsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          </div>
        ) : activeCouponsWithUsage.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-sm">
            No active coupons to display.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 pr-4">
                    Code
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 pr-4">
                    Discount
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 pr-4">
                    Uses
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 pr-4">
                    Redemption Rate
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 pr-4">
                    Avg Discount
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">
                    Est. Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeCouponsWithUsage.map((c) => (
                  <tr
                    key={c._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <span className="font-mono text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {c.type === "percentage"
                        ? `${c.value}% off`
                        : `${formatCurrency(c.value)} off`}
                      {c.minOrder > 0 && ` (min ${formatCurrency(c.minOrder)})`}
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-900 font-medium">
                      {c.usedCount}
                      <span className="text-gray-400 font-normal">
                        {c.usageLimit > 0 ? `/${c.usageLimit}` : "/∞"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span
                        className={`text-xs font-semibold ${
                          c.redemptionRate > 75
                            ? "text-green-600"
                            : c.redemptionRate > 50
                              ? "text-orange-500"
                              : "text-gray-500"
                        }`}
                      >
                        {c.redemptionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-700">
                      {formatCurrency(c.avgDiscount)}
                    </td>
                    <td className="py-3 text-right text-gray-700">
                      {formatCurrency(c.estimatedRevenueAttributed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VendorAnalyticsPage;
