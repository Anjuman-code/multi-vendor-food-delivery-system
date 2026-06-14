import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  CreditCard,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CHART_COLORS,
  ChartCard,
  DataTable,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  VendorEmptyState,
  type DataTableColumn,
} from "@/components/vendor";
import { toast } from "@/lib/toast";
import vendorService from "@/services/vendorService";
import type {
  VendorEarnings,
  VendorPayout,
  VendorProfile,
} from "@/types/vendor";
import { formatCurrency, formatDate } from "@/utils/format";

const PERIOD_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
];

const PAYOUTS_PER_PAGE = 10;

const VendorEarningsPage = () => {
  const [period, setPeriod] = useState("30d");
  const [earnings, setEarnings] = useState<VendorEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  const [payouts, setPayouts] = useState<VendorPayout[]>([]);
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutPages, setPayoutPages] = useState(1);
  const [payoutTotal, setPayoutTotal] = useState(0);
  const [payoutsLoading, setPayoutsLoading] = useState(true);

  const [bank, setBank] = useState<Record<string, unknown> | null>(null);

  const loadEarnings = useCallback(
    async (p: string) => {
      setLoading(true);
      const res = await vendorService.getEarnings(p);
      if (res.success && res.data) {
        setEarnings(res.data);
      } else {
        toast.error("Error", {
          description: res.message || "Failed to load earnings",
        });
      }
      setLoading(false);
    },
    [],
  );

  const loadPayouts = useCallback(
    async (page: number) => {
      setPayoutsLoading(true);
      const res = await vendorService.getPayouts({ page, limit: PAYOUTS_PER_PAGE });
      if (res.success && res.data) {
        setPayouts(res.data.payouts);
        setPayoutPages(res.data.pagination.pages);
        setPayoutTotal(res.data.pagination.total);
      }
      setPayoutsLoading(false);
    },
    [],
  );

  useEffect(() => {
    loadEarnings(period);
  }, [period, loadEarnings]);

  useEffect(() => {
    loadPayouts(payoutPage);
  }, [payoutPage, loadPayouts]);

  useEffect(() => {
    (async () => {
      const res = await vendorService.getProfile();
      if (res.success && res.data) {
        const profile = res.data.vendorProfile as VendorProfile | undefined;
        setBank((profile?.bankDetails as Record<string, unknown>) ?? null);
      }
    })();
  }, []);

  const series = useMemo(
    () =>
      (earnings?.series ?? []).map((p) => ({
        date: p.date,
        net: p.net,
        gross: p.gross,
      })),
    [earnings],
  );

  const payoutColumns: DataTableColumn<VendorPayout>[] = [
    {
      key: "createdAt",
      header: "Date",
      render: (p) => (
        <span className="font-medium text-foreground">{formatDate(p.createdAt)}</span>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (p) => (
        <span className="text-muted-foreground">
          {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
        </span>
      ),
    },
    {
      key: "orderCount",
      header: "Orders",
      align: "right",
      render: (p) => p.orderCount || 0,
    },
    {
      key: "commissionTotal",
      header: "Commission",
      align: "right",
      render: (p) => (
        <span className="text-muted-foreground">{formatCurrency(p.commissionTotal)}</span>
      ),
    },
    {
      key: "amount",
      header: "Net payout",
      align: "right",
      render: (p) => (
        <span className="font-semibold text-foreground">{formatCurrency(p.amount)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: "transactionRef",
      header: "Reference",
      render: (p) =>
        p.transactionRef ? (
          <span className="font-mono text-xs text-muted-foreground">
            {p.transactionRef}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  const bankSummary = useMemo(() => {
    if (!bank) return null;
    const accountName = bank.accountName as string | undefined;
    const accountNumber = bank.accountNumber as string | undefined;
    const bankName = bank.bankName as string | undefined;
    const mobileProvider = bank.mobileMoneyProvider as string | undefined;
    const mobileNumber = bank.mobileMoneyNumber as string | undefined;
    if (accountNumber || bankName) {
      return {
        type: "Bank transfer",
        title: bankName || "Bank account",
        detail: accountNumber
          ? `${accountName ? `${accountName} · ` : ""}•••• ${accountNumber.slice(-4)}`
          : accountName || "",
      };
    }
    if (mobileNumber) {
      return {
        type: "Mobile money",
        title: mobileProvider || "Mobile wallet",
        detail: `•••• ${mobileNumber.slice(-4)}`,
      };
    }
    return null;
  }, [bank]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Earnings & Payouts"
        description="Track your revenue, commission and settlement history."
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]" aria-label="Select period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Available balance"
          value={formatCurrency(earnings?.availableBalance ?? 0)}
          icon={Wallet}
          accent="brand"
          loading={loading}
          hint="Ready for next payout"
        />
        <StatCard
          label="Net this period"
          value={formatCurrency(earnings?.periodNet ?? 0)}
          icon={TrendingUp}
          loading={loading}
          hint={`${earnings?.periodOrders ?? 0} orders`}
        />
        <StatCard
          label="Gross this period"
          value={formatCurrency(earnings?.periodGross ?? 0)}
          icon={Receipt}
          loading={loading}
          hint={`${earnings?.commissionRate ?? 0}% commission`}
        />
        <StatCard
          label="Lifetime earnings"
          value={formatCurrency(earnings?.totalEarnings ?? 0)}
          icon={Banknote}
          loading={loading}
          hint={`${earnings?.lifetimeOrders ?? 0} delivered`}
        />
      </div>

      {/* Earnings over time */}
      <ChartCard
        title="Net earnings over time"
        loading={loading}
        empty={!loading && series.length === 0}
        emptyLabel="No earnings recorded for this period yet"
        height={300}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.brand} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.brand} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: CHART_COLORS.axis }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCurrency(v)}
              width={70}
            />
            <RechartsTooltip
              formatter={(v) => [formatCurrency(v as number), "Net"] as [string, string]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="net"
              stroke={CHART_COLORS.brand}
              strokeWidth={2}
              fill="url(#earningsFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Payout method */}
      <SectionCard
        title="Payout method"
        description="Where your settlements are sent."
        icon={<CreditCard className="h-4 w-4" />}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/vendor/settings">Manage</Link>
          </Button>
        }
      >
        {bankSummary ? (
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {bankSummary.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {bankSummary.type}
                {bankSummary.detail ? ` · ${bankSummary.detail}` : ""}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No payout method on file.{" "}
            <Link to="/vendor/settings" className="font-medium text-primary hover:underline">
              Add your bank details
            </Link>{" "}
            to receive settlements.
          </p>
        )}
      </SectionCard>

      {/* Payout history */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Payout history</h2>
        <DataTable
          columns={payoutColumns}
          data={payouts}
          getRowId={(p) => p._id}
          loading={payoutsLoading}
          pagination={{
            page: payoutPage,
            pages: payoutPages,
            total: payoutTotal,
            onPageChange: setPayoutPage,
          }}
          emptyState={
            <VendorEmptyState
              icon={Wallet}
              title="No payouts yet"
              description="Your settlement history will appear here once your first payout is processed."
              className="border-0"
            />
          }
        />
      </div>
    </div>
  );
};

export default VendorEarningsPage;
