/**
 * Header for admin detail pages — back link, optional avatar/icon, title,
 * subtitle, status badges and right-aligned actions.
 */
import * as React from "react";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/utils/cn";

export interface DetailHeaderProps {
  backTo: string;
  backLabel?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  /** Initials/avatar tile (overrides icon). */
  avatar?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  backTo,
  backLabel = "Back",
  title,
  subtitle,
  icon: Icon,
  avatar,
  badges,
  actions,
  className,
}) => (
  <div className={cn("space-y-4", className)}>
    <Link
      to={backTo}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {backLabel}
    </Link>

    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        {avatar ??
          (Icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Icon className="h-6 w-6" />
            </span>
          ))}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div>
          )}
          {badges && (
            <div className="mt-2 flex flex-wrap items-center gap-2">{badges}</div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  </div>
);
