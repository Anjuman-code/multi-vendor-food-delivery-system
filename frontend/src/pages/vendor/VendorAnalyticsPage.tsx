import React, { useEffect, useState, useMemo } from "react";
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
  BarChart3,
  Percent,
  Tag,
  Award,
  Utensils,
} from "lucide-react";
import vendorService from "@/services/vendorService";
import type { VendorAnalytics, VendorCoupon } from "@/types/vendor";
import {
  PageHeader,
  StatCard,
  ChartCard,
  DataTable,
  VendorEmptyState,
  CHART_COLORS,
  type DataTableColumn,
} from "@/components/vendor";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/format";

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

// ── Coupon row type (for the DataTable) ────────────────────────────

interface CouponRow {
  _id: string;
  code: string;
  type: VendorCoupon["type"];
  value: number;
  usedCount: number;
  usageLimit: number;
  redemptionRate: number;
  avgDiscount: number;
  estimatedRevenueAttributed: number;
  minOrder: number;
  maxDisc: number;
}

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

  const activeCouponsWithUsage = useMemo<CouponRow[]>(
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

  // ── Period Selector (rendered in the header) ────────────────────

  const periodSelector = (
    <Select value={period} onValueChange={setPeriod}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Period" />
      </SelectTrigger>
      <SelectContent>
        {PERIOD_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // ── Failed-to-load State ────────────────────────────────────────

  if (!loading && !analytics) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="Track your business performance"
          actions={periodSelector}
        />
        <VendorEmptyState
          variant="error"
          icon={BarChart3}
          title="Failed to load analytics"
          description="We couldn't load analytics data for this period."
          action={{
            label: "Try again",
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  // ── Coupon table columns ────────────────────────────────────────

  const couponColumns: DataTableColumn<CouponRow>[] = [
    {
      key: "code",
      header: "Code",
      render: (c) => (
        <span className="rounded bg-accent px-2 py-0.5 font-mono text-xs font-semibold text-primary">
          {c.code}
        </span>
      ),
    },
    {
      key: "discount",
      header: "Discount",
      render: (c) => (
        <span className="text-foreground">
          {c.type === "percentage"
            ? `${c.value}% off`
            : `${formatCurrency(c.value)} off`}
          {c.minOrder > 0 && ` (min ${formatCurrency(c.minOrder)})`}
        </span>
      ),
    },
    {
      key: "uses",
      header: "Uses",
      align: "right",
      render: (c) => (
        <span className="font-medium text-foreground">
          {c.usedCount}
          <span className="font-normal text-muted-foreground">
            {c.usageLimit > 0 ? `/${c.usageLimit}` : "/∞"}
          </span>
        </span>
      ),
    },
    {
      key: "redemptionRate",
      header: "Redemption Rate",
      align: "right",
      render: (c) => (
        <span
          className={
            c.redemptionRate > 75
              ? "text-xs font-semibold text-emerald-600"
              : c.redemptionRate > 50
                ? "text-xs font-semibold text-primary"
                : "text-xs font-semibold text-muted-foreground"
          }
        >
          {c.redemptionRate.toFixed(1)}%
        </span>
      ),
    },
    {
      key: "avgDiscount",
      header: "Avg Discount",
      align: "right",
      render: (c) => (
        <span className="text-foreground">{formatCurrency(c.avgDiscount)}</span>
      ),
    },
    {
      key: "estimatedRevenueAttributed",
      header: "Est. Revenue",
      align: "right",
      render: (c) => (
        <span className="text-foreground">
          {formatCurrency(c.estimatedRevenueAttributed)}
        </span>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────── */}
      <PageHeader
        title="Analytics"
        description="Track your business performance"
        actions={periodSelector}
      />

      {/* ── Summary KPI Row ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          accent="brand"
          loading={loading}
        />
        <StatCard
          label="Total Orders"
          value={formatNumber(totalOrders)}
          icon={ShoppingBag}
          loading={loading}
        />
        <StatCard
          label="Avg Order Value"
          value={formatCurrency(averageOrderValue)}
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          label="Completion Rate"
          value={formatPercent(completionRate)}
          icon={Percent}
          hint={`${deliveredOrders} delivered · ${cancelledOrders} cancelled`}
          loading={loading}
        />
      </div>

      {/* ── Revenue Over Time ─────────────────────────────── */}
      <ChartCard
        title="Revenue Over Time"
        description="Daily revenue across the selected period"
        loading={loading}
        empty={revenueOverTime.length === 0}
        emptyLabel="No revenue data available for this period."
        height={220}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenueOverTime}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={CHART_COLORS.grid}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
              tickFormatter={(val) => formatCurrency(val)}
            />
            <RechartsTooltip
              formatter={(value) =>
                [formatCurrency(value as number), "Revenue"] as [string, string]
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
              dataKey="revenue"
              stroke={CHART_COLORS.brand}
              strokeWidth={3}
              dot={{ r: 3, fill: CHART_COLORS.brand, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: CHART_COLORS.brandDark }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Orders by Status + Quick Top Items ────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Orders by Status */}
        <ChartCard
          title="Orders by Status"
          loading={loading}
          empty={
            statusBreakdown.length === 0 ||
            statusBreakdown.every((s) => s.count === 0)
          }
          emptyLabel="No order data available."
          height={180}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={statusBreakdown}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={CHART_COLORS.grid}
              />
              <XAxis
                dataKey="status"
                tickFormatter={(status: string) =>
                  STATUS_LABELS[status] ||
                  (status === "in_progress" ? "In Progress" : status)
                }
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
                allowDecimals={false}
              />
              <RechartsTooltip
                formatter={(value) =>
                  [value as number, "Orders"] as [number, string]
                }
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
                stroke={CHART_COLORS.brand}
                strokeWidth={3}
                dot={{ r: 4, fill: CHART_COLORS.brand, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: CHART_COLORS.brandDark }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Quick Top Items (top 5 by revenue) */}
        <ChartCard
          title="Top Items by Revenue"
          loading={loading}
          empty={itemsSortedByRevenue.length === 0}
          emptyLabel="No item data available."
          height={180}
        >
          <div className="space-y-3">
            {itemsSortedByRevenue.slice(0, 5).map((item, idx) => {
              const pct = (item.revenue / maxItemRevenue) * 100;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-5 flex-shrink-0 text-right text-xs font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate font-medium text-foreground">
                        {item.name}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-20 flex-shrink-0 text-right text-xs text-muted-foreground">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* ── Top Items: Revenue vs Quantity ────────────────── */}
      <ChartCard
        title="Top Items: Revenue vs Quantity"
        description="Comparing top 10 items by revenue and by units sold"
        loading={loading}
        empty={topSellingItems.length === 0}
        emptyLabel="No item data available."
        height={320}
      >
        <div className="grid h-full grid-cols-1 gap-8 md:grid-cols-2">
          {/* Revenue column */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                By Revenue
              </h4>
            </div>
            <div className="space-y-2">
              {itemsSortedByRevenue.slice(0, 8).map((item, idx) => {
                const pct = (item.revenue / maxItemRevenue) * 100;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-4 flex-shrink-0 text-right text-xs text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                      {item.name}
                    </span>
                    <div className="h-3 w-24 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 flex-shrink-0 text-right text-xs font-medium text-primary">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quantity column */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Utensils className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                By Quantity
              </h4>
            </div>
            <div className="space-y-2">
              {itemsSortedByQuantity.slice(0, 8).map((item, idx) => {
                const pct = (item.quantity / maxItemQuantity) * 100;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-4 flex-shrink-0 text-right text-xs text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                      {item.name}
                    </span>
                    <div className="h-3 w-24 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-muted-foreground/60"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="w-10 flex-shrink-0 text-right text-xs font-medium text-muted-foreground">
                      {item.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ChartCard>

      {/* ── Coupon Performance Table ──────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary">
            <Tag className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Coupon Performance
            </h2>
            <p className="text-xs text-muted-foreground">
              Active coupons sorted by usage
            </p>
          </div>
        </div>
        <DataTable<CouponRow>
          columns={couponColumns}
          data={activeCouponsWithUsage}
          getRowId={(c) => c._id}
          loading={couponsLoading}
          emptyState={
            <p className="py-10 text-center text-sm text-muted-foreground">
              No active coupons to display.
            </p>
          }
        />
      </section>
    </div>
  );
};

export default VendorAnalyticsPage;
