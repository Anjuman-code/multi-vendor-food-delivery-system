import React, { forwardRef, useCallback } from 'react';
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  type LinkProps as RouterLinkProps,
  type NavLinkProps as RouterNavLinkProps,
} from 'react-router-dom';
import { prefetchRoute } from '@/utils/routePrefetch';

export interface LinkProps extends Omit<RouterLinkProps, 'prefetch'> {
  prefetch?: RouterLinkProps['prefetch'] | boolean;
  autoPrefetch?: boolean;
}

export interface NavLinkProps extends Omit<RouterNavLinkProps, 'prefetch'> {
  prefetch?: RouterNavLinkProps['prefetch'] | boolean;
  autoPrefetch?: boolean;
}

/**
 * Enhanced Link with automatic route chunk prefetching.
 *
 * Pre-warms the destination route chunk on:
 * - Desktop: mouse enter / keyboard focus
 * - Mobile: touch start / pointer down
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, autoPrefetch = true, prefetch, onMouseEnter, onFocus, onTouchStart, ...props }, ref) => {
    const handlePrefetch = useCallback(() => {
      const shouldPrefetch = autoPrefetch && prefetch !== 'none' && prefetch !== false;
      if (shouldPrefetch && typeof to === 'string') {
        prefetchRoute(to);
      } else if (shouldPrefetch && typeof to === 'object' && to.pathname) {
        prefetchRoute(to.pathname);
      }
    }, [autoPrefetch, prefetch, to]);

    const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
      handlePrefetch();
      onMouseEnter?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
      handlePrefetch();
      onFocus?.(e);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLAnchorElement>) => {
      handlePrefetch();
      onTouchStart?.(e);
    };

    return (
      <RouterLink
        ref={ref}
        to={to}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        onTouchStart={handleTouchStart}
        {...props}
      />
    );
  },
);
Link.displayName = 'Link';

/**
 * Enhanced NavLink with automatic route chunk prefetching.
 */
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ to, autoPrefetch = true, prefetch, onMouseEnter, onFocus, onTouchStart, ...props }, ref) => {
    const handlePrefetch = useCallback(() => {
      const shouldPrefetch = autoPrefetch && prefetch !== 'none' && prefetch !== false;
      if (shouldPrefetch && typeof to === 'string') {
        prefetchRoute(to);
      } else if (shouldPrefetch && typeof to === 'object' && to.pathname) {
        prefetchRoute(to.pathname);
      }
    }, [autoPrefetch, prefetch, to]);

    const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
      handlePrefetch();
      onMouseEnter?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
      handlePrefetch();
      onFocus?.(e);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLAnchorElement>) => {
      handlePrefetch();
      onTouchStart?.(e);
    };

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        onTouchStart={handleTouchStart}
        {...props}
      />
    );
  },
);
NavLink.displayName = 'NavLink';
