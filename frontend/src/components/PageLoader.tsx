import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoading } from '@/contexts/LoadingContext';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Route Suspense Fallback (PageLoader)
 *
 * Responsibilities:
 * - Hooks into LoadingContext to drive the top RouteProgressBar during lazy chunk fetches.
 * - Prevents harsh blank screens or jarring ad-hoc spinners.
 * - Renders a layout-preserving, role-aware skeleton shell while the route component loads.
 */
export const PageLoader: React.FC = () => {
  const { startNavigation, finishNavigation } = useLoading();
  const location = useLocation();

  useEffect(() => {
    startNavigation();
    return () => {
      finishNavigation();
    };
  }, [startNavigation, finishNavigation]);

  const pathname = location.pathname;
  const isVendor = pathname.startsWith('/vendor');
  const isRider = pathname.startsWith('/rider');
  const isAdmin = pathname.startsWith('/admin');

  return (
    <div
      role="status"
      aria-label="Loading page"
      className="w-full flex-1 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200"
    >
      {/* Role-aware layout skeleton */}
      {isAdmin || isVendor ? (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 sm:w-64" />
              <Skeleton className="h-4 w-32 sm:w-40" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>

          {/* Metric cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>

          {/* Table / Content area skeleton */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex justify-between items-center pb-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-8 w-48" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2 border-b border-border/50 last:border-none">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : isRider ? (
        <div className="max-w-md mx-auto space-y-4 pt-4">
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Customer & Public Pages */
        <div className="max-w-7xl mx-auto space-y-6 pt-4">
          {/* Hero / Banner skeleton */}
          <div className="w-full h-40 sm:h-56 rounded-2xl bg-muted/60 animate-pulse p-6 flex flex-col justify-end space-y-2">
            <Skeleton className="h-7 w-64 max-w-full" />
            <Skeleton className="h-4 w-48 max-w-full" />
          </div>

          {/* Cards grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <Skeleton className="h-36 w-full rounded-none" />
                <div className="p-4 space-y-2.5">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PageLoader;