import * as React from "react";
import { cn } from "@/utils/cn";

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  /** Breadcrumb navigation rendered above the title */
  breadcrumbs?: React.ReactNode;
  /** Right-aligned page-level actions (buttons, selects, filters). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Universal page header standard for Customer, Vendor, Rider, and Admin views.
 * Establishes consistent typography, spacing, and responsive action layout.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
  breadcrumbs,
  actions,
  className,
}) => (
  <div className={cn("space-y-2", className)}>
    {breadcrumbs && (
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        {breadcrumbs}
      </nav>
    )}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
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
  </div>
);

export default PageHeader;
