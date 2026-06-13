import { cn } from "@/utils/cn";
import type { LucideIcon } from "lucide-react";
import React from "react";

interface StepHeaderProps {
  /** Optional eyebrow above the title. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Optional icon shown in a tinted badge beside the heading. */
  icon?: LucideIcon;
  className?: string;
}

/** Consistent title block for each onboarding step. */
const StepHeader: React.FC<StepHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  className,
}) => (
  <div className={cn("mb-7", className)}>
    {Icon && (
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="h-6 w-6" />
      </span>
    )}
    {eyebrow && (
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
        {eyebrow}
      </p>
    )}
    <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-[1.7rem]">
      {title}
    </h2>
    {subtitle && (
      <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
        {subtitle}
      </p>
    )}
  </div>
);

export default StepHeader;
