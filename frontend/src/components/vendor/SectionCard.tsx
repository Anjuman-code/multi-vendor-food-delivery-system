import * as React from "react";

import { cn } from "@/utils/cn";

export interface SectionCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned controls in the header. */
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Remove the default content padding (e.g. when embedding a table). */
  flush?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * Titled card container. Replaces the ad-hoc
 * `bg-white rounded-2xl border ... p-5` blocks scattered across pages.
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  actions,
  icon,
  footer,
  children,
  flush,
  className,
  contentClassName,
}) => {
  const hasHeader = title || description || actions;
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
            <div>
              {title && (
                <h2 className="text-sm font-semibold text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(!flush && "p-5", contentClassName)}>{children}</div>
      {footer && (
        <div className="border-t border-border px-5 py-3">{footer}</div>
      )}
    </section>
  );
};
