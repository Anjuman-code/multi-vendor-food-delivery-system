import type { LucideIcon } from "lucide-react";

import { cn } from "@/utils/cn";

interface AuthHeadingProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Optional brand icon badge shown above the title. */
  icon?: LucideIcon;
  /** Optional small pill (e.g. "Vendor application"). */
  eyebrow?: string;
  className?: string;
}

/**
 * Consistent heading block for auth screens: optional icon badge, optional
 * eyebrow pill, title and subtitle. Replaces the ad-hoc per-page headers.
 */
export function AuthHeading({
  title,
  subtitle,
  icon: Icon,
  eyebrow,
  className,
}: AuthHeadingProps) {
  return (
    <div className={cn("mb-6", className)}>
      {(Icon || eyebrow) && (
        <div className="mb-4 flex items-center gap-3">
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-red-500 text-white shadow-sm shadow-brand-500/25">
              <Icon className="h-5 w-5" />
            </span>
          )}
          {eyebrow && (
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
              {eyebrow}
            </span>
          )}
        </div>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}
