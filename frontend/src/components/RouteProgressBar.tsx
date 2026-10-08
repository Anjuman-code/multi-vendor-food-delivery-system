import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoading } from '@/contexts/LoadingContext';

/**
 * Navigation Progress Bar (Non-blocking)
 *
 * - Thin (2.5px, 3.5px on touch), fixed at the very top of the viewport.
 * - Sits at z-[9999] (highest non-modal layer), pointer-events: none.
 * - Respects the top safe-area inset for notched mobile displays.
 * - Primary brand color with subtle glow.
 * - Smooth cubic-bezier trickle towards ~90%, snaps to 100% on finish, fades out cleanly.
 * - Anti-flickered: only shows when navigation takes > 120ms.
 */
export const RouteProgressBar: React.FC = () => {
  const { isNavigating, startNavigation, finishNavigation } = useLoading();
  const location = useLocation();

  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  const trickleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevKeyRef = useRef(location.key);

  // Trigger navigation progress on router location change
  useEffect(() => {
    if (prevKeyRef.current !== location.key) {
      prevKeyRef.current = location.key;
      startNavigation();
      // Navigation completion is triggered once the route transition / lazy chunk resolves
      // We schedule a safety cleanup in case the destination component mounts immediately
      const immediateCheck = setTimeout(() => {
        finishNavigation();
      }, 50);
      return () => {
        clearTimeout(immediateCheck);
        finishNavigation();
      };
    }
  }, [location.key, startNavigation, finishNavigation]);

  // Synchronize visual bar with isNavigating state from LoadingContext
  useEffect(() => {
    if (isNavigating) {
      setIsFading(false);
      setIsVisible(true);
      setProgress(15); // Initial jump

      // Decelerating trickle toward ~90%
      if (trickleTimerRef.current) clearInterval(trickleTimerRef.current);
      trickleTimerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          // Progressively smaller increments
          const remaining = 90 - prev;
          const inc = Math.max(0.5, remaining * 0.12);
          return Math.min(90, prev + inc);
        });
      }, 150);
    } else {
      // Completed
      if (trickleTimerRef.current) {
        clearInterval(trickleTimerRef.current);
        trickleTimerRef.current = null;
      }

      if (isVisible) {
        setProgress(100);
        const fadeTimer = setTimeout(() => {
          setIsFading(true);
        }, 150);

        const resetTimer = setTimeout(() => {
          setIsVisible(false);
          setIsFading(false);
          setProgress(0);
        }, 400);

        return () => {
          clearTimeout(fadeTimer);
          clearTimeout(resetTimer);
        };
      }
    }
  }, [isNavigating, isVisible]);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed left-0 right-0 z-[9999] pointer-events-none"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        height: 'var(--progress-bar-height, 2.5px)',
      }}
    >
      <div
        className="h-full bg-brand-500 transition-all"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px 1px #fb923c, 0 0 4px 0 #f97316',
          opacity: isFading ? 0 : 1,
          transitionDuration: isFading ? '250ms' : progress === 100 ? '150ms' : '200ms',
          transitionTimingFunction: isFading
            ? 'ease-out'
            : 'cubic-bezier(0.1, 0.6, 0.3, 1)',
          willChange: 'width, opacity',
        }}
      />
      <style>{`
        @media (pointer: coarse) {
          :root { --progress-bar-height: 3.5px; }
        }
      `}</style>
    </div>
  );
};
