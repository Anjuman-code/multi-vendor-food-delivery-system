import * as React from "react";

import { cn } from "@/utils/cn";

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned page-level actions (buttons, selects). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard page header. Each vendor page renders its own so it can supply
 * page-level `actions` (the shell no longer owns the title bar).
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
  actions,
  className,
}) => (
  <div
    className={cn(
      "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
      className,
    )}
  >
    <div className="min-w-0">
      <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {subtitle && (
        <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
          {subtitle}
        </div>
      )}
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    {actions && (
      <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
    )}
  </div>
);
