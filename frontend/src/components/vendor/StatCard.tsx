import * as React from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { cn } from "@/utils/cn";
import { Skeleton } from "@/components/ui/skeleton";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  /** Trend vs a previous period. Positive value renders green/up by default. */
  delta?: { value: number; direction?: "up" | "down"; label?: string };
  hint?: React.ReactNode;
  loading?: boolean;
  accent?: "brand" | "neutral";
  onClick?: () => void;
  className?: string;
}

/**
 * KPI tile used across Dashboard / Analytics / Earnings / Customers.
 * Replaces the per-page `.kpi-card` markup.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  loading,
  accent = "neutral",
  onClick,
  className,
}) => {
  const interactive = !!onClick;
  const dir = delta
    ? (delta.direction ?? (delta.value >= 0 ? "up" : "down"))
    : undefined;
  const positive = dir === "up";

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              accent === "brand"
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {value}
        </p>
      )}
      <div className="mt-1.5 flex items-center gap-1.5">
        {delta && !loading && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              positive ? "text-emerald-600" : "text-red-600",
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {Math.abs(delta.value)}%
          </span>
        )}
        {hint && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
        {delta?.label && (
          <span className="text-xs text-muted-foreground">{delta.label}</span>
        )}
      </div>
    </>
  );

  const base =
    "rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-colors";

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(base, "hover:border-brand-300 hover:bg-accent/40", className)}
      >
        {content}
      </button>
    );
  }
  return <div className={cn(base, className)}>{content}</div>;
};
