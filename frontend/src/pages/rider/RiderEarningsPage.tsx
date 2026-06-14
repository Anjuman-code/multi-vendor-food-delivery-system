import { PageHeader, SectionCard, StatCard } from "@/components/rider";
import { useRider } from "@/contexts/RiderContext";
import { useToast } from "@/hooks/use-toast";
import riderService, {
  type EarningsData,
  type EarningsPeriod,
} from "@/services/riderService";
import { formatCurrency } from "@/utils/format";
import { motion } from "framer-motion";
import { Banknote, Coins, Star, TrendingUp, Truck, Wallet } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
} from "recharts";

const PeriodCard: React.FC<{ label: string; data: EarningsPeriod }> = ({
  label,
  data,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-xl border border-border bg-card p-5 shadow-sm"
  >
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
      {formatCurrency(data.earnings)}
    </p>
    <p className="mt-0.5 text-sm text-muted-foreground">
      {data.deliveries} deliver{data.deliveries === 1 ? "y" : "ies"}
    </p>
    <div className="mt-3 flex gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
      <span>
        Fees{" "}
        <strong className="text-foreground">{formatCurrency(data.fees)}</strong>
      </span>
      <span>
        Tips{" "}
        <strong className="text-foreground">{formatCurrency(data.tips)}</strong>
      </span>
    </div>
  </motion.div>
);

const RiderEarningsPage: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useRider();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    riderService
      .getEarnings()
      .then((res) =>
        setEarnings(
          (res as unknown as { data: { data: EarningsData } }).data.data ??
            null,
        ),
      )
      .catch(() =>
        toast({ variant: "destructive", title: "Failed to load earnings" }),
      )
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!earnings) return null;

  const chartData = earnings.weeklyBreakdown.map((d) => ({
    ...d,
    day: new Date(d.date).toLocaleDateString("en-BD", { weekday: "short" }),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Earnings"
        subtitle="Your delivery income and cash reconciliation"
        actions={
          <Link
            to="/rider/history"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Delivery history
          </Link>
        }
      />

      {/* Period breakdown */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PeriodCard label="Today" data={earnings.today} />
        <PeriodCard label="This week" data={earnings.thisWeek} />
        <PeriodCard label="This month" data={earnings.thisMonth} />
      </div>

      {/* Lifetime + rating */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Lifetime earnings"
          value={formatCurrency(earnings.allTime.earnings)}
          icon={Wallet}
          accent="brand"
        />
        <StatCard
          label="Total deliveries"
          value={earnings.allTime.deliveries}
          icon={Truck}
        />
        <StatCard
          label="Rating"
          value={
            profile?.rating.count ? profile.rating.average.toFixed(1) : "—"
          }
          icon={Star}
          hint={`${profile?.rating.count ?? 0} ratings`}
        />
        <StatCard
          label="Cash today"
          value={formatCurrency(earnings.today.cashCollected)}
          icon={Coins}
          hint="COD to deposit"
        />
      </div>

      {/* Cash reconciliation */}
      {earnings.thisWeek.cashCollected > 0 && (
        <SectionCard
          title="Cash to deposit"
          icon={<Banknote className="h-4 w-4 text-amber-600" />}
          description="Cash you collected on COD orders that belongs to the platform."
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(earnings.thisWeek.cashCollected)}
              </p>
              <p className="text-sm text-muted-foreground">collected this week</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Today:{" "}
              <strong className="text-foreground">
                {formatCurrency(earnings.today.cashCollected)}
              </strong>
            </p>
          </div>
        </SectionCard>
      )}

      {/* Weekly chart */}
      <SectionCard
        title="This week"
        icon={<TrendingUp className="h-4 w-4 text-brand-500" />}
      >
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                dy={6}
              />
              <RechartsTooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                formatter={(value) => [formatCurrency(value), "Earnings"]}
                labelStyle={{ display: "none" }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                  padding: "6px 10px",
                }}
              />
              <Bar
                dataKey="earnings"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Payout method summary */}
      <SectionCard
        title="Payout method"
        actions={
          <Link
            to="/rider/profile"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Manage
          </Link>
        }
      >
        {profile?.bankDetails?.mobileMoneyNumber ? (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-brand-600">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                {profile.bankDetails.mobileMoneyProvider
                  ? profile.bankDetails.mobileMoneyProvider.toUpperCase()
                  : "Mobile money"}
              </p>
              <p className="text-sm text-muted-foreground">
                {profile.bankDetails.mobileMoneyNumber}
              </p>
            </div>
          </div>
        ) : profile?.bankDetails?.accountNumber ? (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-brand-600">
              <Banknote className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                {profile.bankDetails.bankName ?? "Bank account"}
              </p>
              <p className="text-sm text-muted-foreground">
                •••• {profile.bankDetails.accountNumber.slice(-4)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No payout method set.{" "}
            <Link to="/rider/profile" className="font-medium text-brand-600">
              Add one
            </Link>{" "}
            to get paid.
          </p>
        )}
      </SectionCard>
    </div>
  );
};

export default RiderEarningsPage;
