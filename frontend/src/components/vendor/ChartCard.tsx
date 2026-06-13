import * as React from "react";

import { cn } from "@/utils/cn";
import { Skeleton } from "@/components/ui/skeleton";

export interface ChartCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned control, e.g. a period selector. */
  action?: React.ReactNode;
  loading?: boolean;
  /** Render an empty fallback instead of the chart. */
  empty?: boolean;
  emptyLabel?: string;
  /** Fixed chart height; the children typically use a ResponsiveContainer. */
  height?: number;
  children: React.ReactNode;
  className?: string;
}

/** Card wrapper for recharts visualisations with loading/empty handling. */
export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  description,
  action,
  loading,
  empty,
  emptyLabel = "No data for this period",
  height = 280,
  children,
  className,
}) => (
  <section
    className={cn(
      "rounded-xl border border-border bg-card p-5 shadow-sm",
      className,
    )}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    <div className="mt-4" style={{ height }}>
      {loading ? (
        <Skeleton className="h-full w-full" />
      ) : empty ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        children
      )}
    </div>
  </section>
);

/** Shared recharts colour tokens (read from the CSS brand scale). */
export const CHART_COLORS = {
  brand: "#f97316", // --brand-500
  brandDark: "#ea580c", // --brand-600
  grid: "#e5e7eb",
  axis: "#9ca3af",
  muted: "#cbd5e1",
};
