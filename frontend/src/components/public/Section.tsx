import { cn } from "@/utils/cn";
import React from "react";

type SectionTone = "default" | "muted" | "brand" | "dark";

const tones: Record<SectionTone, string> = {
  default: "",
  muted: "bg-gray-50",
  brand: "bg-brand-50",
  dark: "bg-gray-900 text-white",
};

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  tone?: SectionTone;
}

/**
 * Vertical-rhythm section wrapper. Standardizes `py-16` block spacing and
 * the handful of background tones used across public pages.
 */
const Section: React.FC<SectionProps> = ({
  tone = "default",
  className,
  children,
  ...props
}) => (
  <section className={cn("py-16", tones[tone], className)} {...props}>
    {children}
  </section>
);

export default Section;
