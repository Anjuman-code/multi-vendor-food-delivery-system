import * as React from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/utils/cn";

export interface InteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
}

/**
 * Outer container for a card that serves as a clickable link while safely
 * housing secondary interactive elements (buttons, favorites, steppers, badges).
 *
 * Implements the "stretched link" CSS pattern to avoid invalid nested <a>/<button> DOM
 * hierarchies and ensure pristine keyboard accessibility.
 */
export const InteractiveCard = React.forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ className, as: Component = "div", children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
InteractiveCard.displayName = "InteractiveCard";

export interface InteractiveCardLinkProps extends LinkProps {
  external?: boolean;
}

/**
 * Primary navigation target within an InteractiveCard.
 *
 * Uses a pseudo-element overlay (`after:absolute after:inset-0 after:z-0`) to
 * expand its clickable area across the entire card boundary without wrapping children.
 */
export const InteractiveCardLink = React.forwardRef<
  HTMLAnchorElement,
  InteractiveCardLinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, children, external, to, href, ...props }, ref) => {
  const commonClasses = cn(
    "outline-none after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:underline",
    className
  );

  if (external && typeof href === "string") {
    return (
      <a
        ref={ref}
        href={href}
        className={commonClasses}
        target="_blank"
        rel="noreferrer noopener"
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link ref={ref} to={to} className={commonClasses} {...props}>
      {children}
    </Link>
  );
});
InteractiveCardLink.displayName = "InteractiveCardLink";

export interface InteractiveCardActionProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  /** Stop click and keyboard bubbling to the card navigation link. Defaults to true. */
  stopBubbling?: boolean;
}

/**
 * Secondary interactive zone elevated above the stretched link (`z-10`).
 * Clicks, touches, and keyboard activations inside this wrapper do not trigger
 * parent card navigation.
 */
export const InteractiveCardAction = React.forwardRef<HTMLDivElement, InteractiveCardActionProps>(
  ({ className, as: Component = "div", stopBubbling = true, onClick, onKeyDown, children, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (stopBubbling) {
        e.stopPropagation();
      }
      onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (stopBubbling && (e.key === "Enter" || e.key === " " || e.key === "Spacebar")) {
        e.stopPropagation();
      }
      onKeyDown?.(e);
    };

    return (
      <Component
        ref={ref}
        className={cn("relative z-10", className)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
InteractiveCardAction.displayName = "InteractiveCardAction";

/**
 * Utility helper to prevent mouse/touch clicks from bubbling to a parent stretched link.
 */
export const stopPropagation = (e: React.SyntheticEvent) => {
  e.stopPropagation();
};
