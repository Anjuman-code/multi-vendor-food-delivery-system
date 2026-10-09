import React, { useEffect, useRef } from 'react';
import { useLoading } from '@/contexts/LoadingContext';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { DeliveryRiderScene } from '@/components/loading/DeliveryRiderScene';

/**
 * RiderLoader - Full-screen blocking loader featuring the delivery.svg scene.
 *
 * Rules:
 * - Only used for critical, non-interruptible actions (order checkout, payment, auth finalization, onboarding submit).
 * - Focus trapped, scroll locked (100dvh safe), background made inert.
 * - Restores focus to previous element upon exit.
 * - Translucent scrim allows background page to be faintly visible while keeping text legible.
 * - Hardware-accelerated CSS transform/opacity animations with prefers-reduced-motion support.
 */
export const RiderLoader: React.FC = () => {
  const {
    isBlockingVisible,
    activeOperation,
    isTakingLonger,
    cancelActiveOperation,
  } = useLoading();

  const overlayRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Focus parking, trap, and scroll lock
  useEffect(() => {
    if (isBlockingVisible) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

      // Trap focus in overlay
      overlayRef.current?.focus();

      // Scroll lock
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }

      // Mark main root as inert for assistive technology and pointer events
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.setAttribute('aria-busy', 'true');
        rootEl.setAttribute('inert', '');
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
        if (rootEl) {
          rootEl.removeAttribute('aria-busy');
          rootEl.removeAttribute('inert');
        }
        // Restore focus
        if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
          previouslyFocusedElementRef.current.focus();
        }
      };
    }
  }, [isBlockingVisible]);

  if (!isBlockingVisible || !activeOperation) {
    return null;
  }

  const primaryMessage = activeOperation.message || 'Just a moment…';
  const secondaryMessage = isTakingLonger
    ? activeOperation.slowMessage || 'Taking longer than expected. Please wait…'
    : null;

  return (
    <div
      ref={overlayRef}
      role="status"
      aria-live="polite"
      tabIndex={-1}
      className="fixed inset-0 z-[9990] flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background/75 p-4 outline-none transition-opacity duration-150 animate-in fade-in"
      style={{
        paddingTop: 'env(safe-area-inset-top, 16px)',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
      }}
    >
      <div className="flex flex-col items-center max-w-sm w-full mx-auto text-center select-none">
        {/* ── Delivery Rider SVG Scene (from delivery.svg) ── */}
        <div className="relative w-64 sm:w-72 h-36 sm:h-40 flex items-center justify-center overflow-hidden">
          <DeliveryRiderScene />
        </div>

        {/* ── Accessible Status Message ── */}
        <div className="mt-4 flex flex-col items-center px-4">
          <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
            {primaryMessage}
          </h2>

          {secondaryMessage ? (
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground animate-in fade-in duration-200">
              {secondaryMessage}
            </p>
          ) : (
            <div className="mt-2 flex items-center space-x-1.5 opacity-70">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse delay-150" />
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse delay-300" />
            </div>
          )}

          {/* ── Stuck Guard / Dismiss Button (if permitted and taking longer) ── */}
          {isTakingLonger && activeOperation.allowCancel && (
            <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelActiveOperation}
                className="text-xs border-border bg-card/80 hover:bg-card shadow-sm"
              >
                <AlertCircle className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                Cancel operation
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiderLoader;
