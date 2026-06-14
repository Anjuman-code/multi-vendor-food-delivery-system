import {
  CHART_COLORS,
  ChartCard,
  EmptyState,
  exportToCsv,
  PageHeader,
  SectionCard,
  SegmentedTabs,
  StatCard,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import adminService from "@/services/adminService";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
} from "@/utils/format";
import {
  Download,
  Receipt,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Range = "7d" | "30d" | "90d" | "365d";

interface RevenueStats {
  timeSeries: Array<{
    date: string;
    gmv: number;
    orders: number;
    revenue: number;
    refunded: number;
  }>;
  totals: {
    gmv: number;
    orders: number;
    platformRevenue: number;
    refunded: number;
    netRevenue: number;
    commissionRate: number;
  };
  byPaymentMethod: Array<{ method: string; count: number; total: number }>;
  topRestaurants: Array<{ _id: string; name: string; gmv: number; orders: number }>;
}

export default function RevenueReportsPage() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminService
      .getRevenue(range)
      .then((res) => {
        if (active) setData((res.data as { data: RevenueStats }).data);
      })
      .catch(() => {
        if (active) {
          setData(null);
          toast.error("Failed to load revenue report");
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range]);

  const totals = data?.totals;
  const maxMethodTotal = Math.max(1, ...(data?.byPaymentMethod ?? []).map((m) => m.total));
  const maxRestaurantGmv = Math.max(1, ...(data?.topRestaurants ?? []).map((r) => r.gmv));

  const exportCsv = () => {
    if (!data) return;
    exportToCsv("revenue-time-series", data.timeSeries, [
      { key: "date", header: "Date", value: (d) => d.date },
      { key: "gmv", header: "GMV", value: (d) => String(d.gmv) },
      { key: "orders", header: "Orders", value: (d) => String(d.orders) },
      { key: "revenue", header: "Platform Revenue", value: (d) => String(d.revenue) },
      { key: "refunded", header: "Refunded", value: (d) => String(d.refunded) },
    ]);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Revenue Reports"
        description="Platform financial performance and trends."
        actions={
          <>
            <SegmentedTabs
              value={range}
              onChange={(v) => setRange(v as Range)}
              options={[
                { value: "7d", label: "7d" },
                { value: "30d", label: "30d" },
                { value: "90d", label: "90d" },
                { value: "365d", label: "1y" },
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={!data?.timeSeries.length}
            >
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="GMV"
          value={totals ? formatCurrency(totals.gmv) : "—"}
          icon={TrendingUp}
          accent="brand"
          loading={loading}
        />
        <StatCard
          label="Orders"
          value={totals ? formatNumber(totals.orders) : "—"}
          icon={ShoppingBag}
          loading={loading}
        />
        <StatCard
          label="Platform Revenue"
          value={totals ? formatCurrency(totals.platformRevenue) : "—"}
          icon={Wallet}
          hint={totals ? `${formatPercent(totals.commissionRate)} commission` : undefined}
          loading={loading}
        />
        <StatCard
          label="Refunded"
          value={totals ? formatCurrency(totals.refunded) : "—"}
          icon={RotateCcw}
          loading={loading}
        />
        <StatCard
          label="Net Revenue"
          value={totals ? formatCurrency(totals.netRevenue) : "—"}
          icon={Receipt}
          loading={loading}
        />
      </div>

      <ChartCard
        title="Daily GMV, Revenue & Refunds"
        description="Gross merchandise value, platform revenue and refunds per day."
        loading={loading}
        empty={!data?.timeSeries.length}
        height={300}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data?.timeSeries ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
              tickFormatter={(d: string) => d.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
              tickFormatter={(v: number) => formatCurrencyCompact(v)}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
              formatter={(v) => formatCurrency(v as number)}
            />
            <Line
              type="monotone"
              dataKey="gmv"
              stroke={CHART_COLORS.brand}
              strokeWidth={2}
              dot={false}
              name="GMV"
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Revenue"
            />
            <Line
              type="monotone"
              dataKey="refunded"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="Refunded"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="By Payment Method"
          description="Order value split across payment methods."
        >
          {!data?.byPaymentMethod.length ? (
            <EmptyState
              icon={Wallet}
              title="No payment data"
              className="border-0 py-6"
            />
          ) : (
            <div className="space-y-3">
              {data.byPaymentMethod.map((m) => (
                <div key={m.method} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-foreground">
                      {m.method ? m.method.replace(/_/g, " ") : "Unknown"}
                    </span>
                    <span className="text-muted-foreground">
                      {formatNumber(m.count)} orders ·{" "}
                      <span className="font-medium text-foreground">{formatCurrency(m.total)}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${(m.total / maxMethodTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Top Restaurants"
          description="Highest revenue-generating restaurants this period."
        >
          {!data?.topRestaurants.length ? (
            <EmptyState
              icon={TrendingUp}
              title="No restaurant data"
              className="border-0 py-6"
            />
          ) : (
            <div className="space-y-3">
              {data.topRestaurants.map((r, i) => (
                <div key={r._id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                        {i + 1}
                      </span>
                      <span className="truncate text-foreground">{r.name}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatNumber(r.orders)} orders ·{" "}
                      <span className="font-medium text-foreground">{formatCurrency(r.gmv)}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${(r.gmv / maxRestaurantGmv) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
