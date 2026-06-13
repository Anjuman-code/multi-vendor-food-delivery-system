import { cn } from "@/utils/cn";
import React from "react";

type ContainerWidth = "default" | "narrow" | "prose";

const widths: Record<ContainerWidth, string> = {
  default: "max-w-7xl",
  narrow: "max-w-4xl",
  prose: "max-w-3xl",
};

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Max content width. `default` = 7xl, `narrow` = 4xl, `prose` = 3xl. */
  width?: ContainerWidth;
}

/**
 * Horizontal page gutter + max-width wrapper. Replaces the
 * `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` string repeated across the site.
 */
const Container: React.FC<ContainerProps> = ({
  width = "default",
  className,
  children,
  ...props
}) => (
  <div
    className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", widths[width], className)}
    {...props}
  >
    {children}
  </div>
);

export default Container;
