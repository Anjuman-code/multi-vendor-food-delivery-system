import { cn } from "@/utils/cn";
import type { LucideIcon } from "lucide-react";
import React from "react";

type EyebrowTone = "brand" | "onDark";

const tones: Record<EyebrowTone, string> = {
  brand: "bg-brand-100 text-brand-600",
  onDark: "bg-white/10 text-white backdrop-blur-sm",
};

interface EyebrowProps {
  icon?: LucideIcon;
  tone?: EyebrowTone;
  className?: string;
  children: React.ReactNode;
}

/**
 * Pill-shaped eyebrow/badge used above page and section headings.
 * Centralizes the `bg-brand-100 text-brand-600 rounded-full` pattern.
 */
const Eyebrow: React.FC<EyebrowProps> = ({
  icon: Icon,
  tone = "brand",
  className,
  children,
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
      tones[tone],
      className,
    )}
  >
    {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
    {children}
  </span>
);

export default Eyebrow;
