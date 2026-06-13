import { cn } from "@/utils/cn";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import React from "react";

interface OptionCardProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  /** Small pill shown top-right (e.g. "Default", "Recommended"). */
  badge?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A large, tappable selection card used across onboarding flows for payment
 * methods, payout options, address labels, etc. Single consistent look so the
 * three role flows feel like one product.
 */
const OptionCard: React.FC<OptionCardProps> = ({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
  badge,
  disabled = false,
  className,
}) => (
  <button
    type="button"
    onClick={onSelect}
    disabled={disabled}
    aria-pressed={selected}
    className={cn(
      "group relative flex w-full items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition-all duration-200",
      selected
        ? "border-brand-500 bg-brand-50/70 shadow-sm shadow-brand-500/10"
        : "border-border bg-card hover:border-brand-200 hover:bg-muted/40",
      disabled && "cursor-not-allowed opacity-50",
      className,
    )}
  >
    {Icon && (
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
          selected
            ? "bg-gradient-to-br from-brand-500 to-red-500 text-white"
            : "bg-muted text-muted-foreground group-hover:text-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
    )}

    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="font-semibold text-foreground">{title}</span>
        {badge && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            {badge}
          </span>
        )}
      </span>
      {description && (
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {description}
        </span>
      )}
    </span>

    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
        selected
          ? "border-brand-500 bg-brand-500 text-white"
          : "border-muted-foreground/30 text-transparent",
      )}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
  </button>
);

export default OptionCard;
