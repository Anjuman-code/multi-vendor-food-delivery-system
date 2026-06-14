import { Button } from "@/components/ui/button";
import {
  AvailabilityToggle,
  SectionCard,
  StatCard,
  StatusBadge,
} from "@/components/rider";
import { useRider } from "@/contexts/RiderContext";
import riderService, { type EarningsData } from "@/services/riderService";
import { formatCurrency } from "@/utils/format";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  ClipboardList,
  Clock,
  DollarSign,
  MapPin,
  Package,
  Star,
  Truck,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" });

const RiderDashboardPage: React.FC = () => {
  const { profile, activeOrder, loading, toggling, toggleAvailability } =
    useRider();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);

  useEffect(() => {
    let alive = true;
    riderService
      .getEarnings()
      .then((res) => {
        if (alive)
          setEarnings(
            (res as unknown as { data: { data: EarningsData } }).data.data ??
              null,
          );
      })
      .catch(() => void 0);
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  // Application not yet approved → gate the dashboard.
  if (profile && profile.applicationStatus !== "approved") {
    const pending = profile.applicationStatus === "pending";
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-sm space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent">
            <Truck className="h-8 w-8 text-brand-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {pending ? "Application under review" : "Application not approved"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {pending ? (
              "Our team is reviewing your application. You'll be notified once you're approved to start delivering."
            ) : (
              <>
                Reason: {profile.rejectionReason ?? "No reason provided"}. Please{" "}
                <Link
                  to="/rider/support"
                  className="font-medium text-brand-600 underline"
                >
                  contact support
                </Link>
                .
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <AvailabilityToggle
        variant="hero"
        online={!!profile?.isAvailable}
        onToggle={toggleAvailability}
        loading={toggling}
        lockedReason={
          activeOrder ? "Finish your active delivery to change this" : null
        }
      />

      {/* Active delivery callout */}
      {activeOrder && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="overflow-hidden rounded-xl bg-gradient-to-r from-brand-500 to-orange-600 p-5 text-white"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium opacity-80">Active delivery</p>
              <p className="mt-1 text-lg font-bold">
                Order #{activeOrder.orderNumber}
              </p>
              <p className="mt-0.5 truncate text-sm opacity-80">
                {typeof activeOrder.restaurantId === "object"
                  ? activeOrder.restaurantId.name
                  : ""}
              </p>
            </div>
            <Button
              asChild
              size="sm"
              className="shrink-0 bg-white text-brand-600 hover:bg-white/90"
            >
              <Link to="/rider/active">
                Continue <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </motion.div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Today"
          value={formatCurrency(earnings?.today.earnings ?? 0)}
          icon={DollarSign}
          accent="brand"
          hint={`${earnings?.today.deliveries ?? 0} deliveries`}
        />
        <StatCard
          label="This week"
          value={formatCurrency(earnings?.thisWeek.earnings ?? 0)}
          icon={Clock}
          hint={`${earnings?.thisWeek.deliveries ?? 0} deliveries`}
        />
        <StatCard
          label="Lifetime"
          value={formatCurrency(earnings?.allTime.earnings ?? 0)}
          icon={CheckCircle}
          hint={`${earnings?.allTime.deliveries ?? 0} total`}
        />
        <StatCard
          label="Rating"
          value={profile?.rating.count ? profile.rating.average.toFixed(1) : "—"}
          icon={Star}
          hint={`${profile?.rating.count ?? 0} ratings`}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          to="/rider/available"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-brand-300 hover:bg-accent/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-brand-600">
            <Package className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-foreground">
              Find deliveries
            </span>
            <span className="block text-sm text-muted-foreground">
              Browse orders ready for pickup
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/rider/earnings"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-brand-300 hover:bg-accent/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <DollarSign className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-foreground">Earnings</span>
            <span className="block text-sm text-muted-foreground">
              Track payouts &amp; cash collected
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Recent deliveries */}
      <SectionCard
        title="Recent deliveries"
        actions={
          <Link
            to="/rider/history"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View all
          </Link>
        }
        flush
      >
        {(earnings?.recentDeliveries?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No deliveries yet — go online to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {earnings!.recentDeliveries.slice(0, 5).map((order) => (
              <li key={order._id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    #{order.orderNumber}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {order.deliveryAddress?.area}
                    {order.actualDeliveryTime
                      ? ` • ${fmtTime(order.actualDeliveryTime)}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-emerald-600">
                  {formatCurrency(
                    (order.deliveryFee ?? 0) + (order.tipAmount ?? 0),
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Subtle helper when offline & idle */}
      {!profile?.isAvailable && !activeOrder && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <StatusBadge status="offline" />
          Go online to start receiving delivery requests.
        </div>
      )}
    </div>
  );
};

export default RiderDashboardPage;
