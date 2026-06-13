import * as React from "react";
import { type LucideIcon } from "lucide-react";

import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";

export interface VendorEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  secondaryAction?: { label: string; onClick: () => void };
  variant?: "default" | "error";
  className?: string;
}

/** Shared empty / error placeholder for vendor surfaces. */
export const VendorEmptyState: React.FC<VendorEmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center",
      className,
    )}
  >
    {Icon && (
      <span
        className={cn(
          "mb-4 flex h-12 w-12 items-center justify-center rounded-full",
          variant === "error"
            ? "bg-red-50 text-red-600"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
    )}
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    {description && (
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
    )}
    {(action || secondaryAction) && (
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {action && (
          <Button onClick={action.onClick} variant="brand">
            {action.icon && <action.icon className="mr-1.5 h-4 w-4" />}
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick} variant="outline">
            {secondaryAction.label}
          </Button>
        )}
      </div>
    )}
  </div>
);
