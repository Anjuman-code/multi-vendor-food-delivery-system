import { cn } from "@/utils/cn";
import React from "react";

interface GradientTextProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * The signature Food Rush brand gradient applied to text.
 * Centralizes `from-brand-500 to-red-500 bg-clip-text text-transparent`,
 * which was previously inlined 79 times across public pages.
 */
const GradientText: React.FC<GradientTextProps> = ({ className, children }) => (
  <span
    className={cn(
      "bg-gradient-to-r from-brand-500 to-red-500 bg-clip-text text-transparent",
      className,
    )}
  >
    {children}
  </span>
);

export default GradientText;
