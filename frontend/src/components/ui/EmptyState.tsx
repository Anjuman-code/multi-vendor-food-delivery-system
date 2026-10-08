import * as React from "react";
import { AlertCircle, AlertTriangle, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: LucideIcon;
  loading?: boolean;
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  variant?: "default" | "error";
  className?: string;
}

/**
 * Shared empty and error placeholder for all roles (Customer, Vendor, Rider, Admin, Public).
 * Consistent border styling, spacing scale, icon treatment, and action CTA slots.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
}) => {
  const isError = variant === "error";
  const FallbackIcon = isError ? AlertCircle : undefined;
  const ActiveIcon = Icon ?? FallbackIcon;

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center",
        isError
          ? "border-red-200 bg-red-50/30"
          : "border-border bg-card",
        className
      )}
    >
      {ActiveIcon && (
        <span
          className={cn(
            "mb-4 flex h-12 w-12 items-center justify-center rounded-full",
            isError
              ? "bg-red-100 text-red-600"
              : "bg-muted text-muted-foreground"
          )}
        >
          <ActiveIcon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && (
            action.href ? (
              <Button asChild variant={isError ? "destructive" : "brand"}>
                <Link to={action.href}>
                  {action.icon && <action.icon className="mr-1.5 h-4 w-4" />}
                  {action.label}
                </Link>
              </Button>
            ) : (
              <Button
                onClick={action.onClick}
                loading={action.loading}
                variant={isError ? "destructive" : "brand"}
              >
                {action.icon && <action.icon className="mr-1.5 h-4 w-4" />}
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Button asChild variant="outline">
                <Link to={secondaryAction.href}>
                  {secondaryAction.icon && <secondaryAction.icon className="mr-1.5 h-4 w-4" />}
                  {secondaryAction.label}
                </Link>
              </Button>
            ) : (
              <Button
                onClick={secondaryAction.onClick}
                loading={secondaryAction.loading}
                variant="outline"
              >
                {secondaryAction.icon && <secondaryAction.icon className="mr-1.5 h-4 w-4" />}
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
};

export interface ErrorStateProps extends Omit<EmptyStateProps, "variant"> {
  onRetry?: () => void;
  retryLabel?: string;
  loading?: boolean;
}

/**
 * Dedicated ErrorState helper for failed queries, network issues, or 500 errors.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  icon = AlertTriangle,
  title = "Something went wrong",
  description = "An error occurred while loading this content. Please try again.",
  onRetry,
  retryLabel = "Try Again",
  loading,
  action,
  ...props
}) => {
  const resolvedAction: EmptyStateAction | undefined =
    action ?? (onRetry ? { label: retryLabel, onClick: onRetry, loading } : undefined);

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      variant="error"
      action={resolvedAction}
      {...props}
    />
  );
};

export default EmptyState;
