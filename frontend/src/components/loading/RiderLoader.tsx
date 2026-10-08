import React, { useEffect, useRef } from 'react';
import { useLoading } from '@/contexts/LoadingContext';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

/**
 * RiderLoader - Full-screen blocking loader featuring an animated delivery rider.
 *
 * Rules:
 * - Only used for critical, non-interruptible actions (order checkout, payment, auth finalization, onboarding submit).
 * - Focus trapped, scroll locked (100dvh safe), background made inert.
 * - Restores focus to previous element upon exit.
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
      className="fixed inset-0 z-[9990] flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-4 outline-none transition-opacity duration-150 animate-in fade-in"
      style={{
        paddingTop: 'env(safe-area-inset-top, 16px)',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
      }}
    >
      <div className="flex flex-col items-center max-w-sm w-full mx-auto text-center select-none">
        {/* ── Delivery Rider SVG Scene ── */}
        <div className="rider-scene relative w-60 sm:w-72 h-36 flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 240 140"
            className="w-full h-full"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Food Box Brand Gradient */}
              <linearGradient id="riderBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>

              {/* Headlight Glow */}
              <linearGradient id="lightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
              </linearGradient>

              {/* Seamless Road Dash Pattern */}
              <pattern
                id="roadDashes"
                width="40"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="4"
                  x2="24"
                  y2="4"
                  stroke="#94a3b8"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </pattern>
            </defs>

            {/* ── Background Speed Lines ── */}
            <g className="rider-speed-lines" opacity="0.6">
              <line x1="20" y1="35" x2="60" y2="35" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 6" />
              <line x1="10" y1="55" x2="45" y2="55" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="5 7" />
              <line x1="185" y1="42" x2="225" y2="42" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 8" />
            </g>

            {/* ── Headlight Beam ── */}
            <polygon
              points="198,82 240,70 240,94 198,84"
              fill="url(#lightBeam)"
              className="rider-light-beam"
            />

            {/* ── Ground / Scrolling Road ── */}
            <g className="rider-ground">
              {/* Main solid curb */}
              <line x1="0" y1="126" x2="240" y2="126" stroke="#64748b" strokeWidth="2" />
              {/* Scrolling Road Markings */}
              <g className="scrolling-road-strip">
                <rect x="-40" y="127" width="320" height="8" fill="url(#roadDashes)" />
              </g>
            </g>

            {/* ── Exhaust Dust Puffs ── */}
            <g className="rider-exhaust">
              <circle cx="34" cy="115" r="3.5" fill="#cbd5e1" opacity="0.8" />
              <circle cx="24" cy="112" r="2.5" fill="#cbd5e1" opacity="0.5" />
              <circle cx="15" cy="110" r="1.5" fill="#cbd5e1" opacity="0.3" />
            </g>

            {/* ── Rider and Scooter Body (Bobs vertically) ── */}
            <g className="rider-bike-body">
              {/* Rear Wheel */}
              <g className="wheel-group" transform="translate(62, 110)">
                {/* Tire & Rim */}
                <circle cx="0" cy="0" r="16" fill="none" stroke="#334155" strokeWidth="4" />
                <circle cx="0" cy="0" r="12" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
                {/* Hub */}
                <circle cx="0" cy="0" r="3.5" fill="#1e293b" />
                {/* Rotating Spokes */}
                <g className="spinning-spokes">
                  <line x1="-11" y1="0" x2="11" y2="0" stroke="#64748b" strokeWidth="1.5" />
                  <line x1="0" y1="-11" x2="0" y2="11" stroke="#64748b" strokeWidth="1.5" />
                  <line x1="-8" y1="-8" x2="8" y2="8" stroke="#64748b" strokeWidth="1.5" />
                  <line x1="-8" y1="8" x2="8" y2="-8" stroke="#64748b" strokeWidth="1.5" />
                </g>
              </g>

              {/* Front Wheel */}
              <g className="wheel-group" transform="translate(178, 110)">
                {/* Tire & Rim */}
                <circle cx="0" cy="0" r="16" fill="none" stroke="#334155" strokeWidth="4" />
                <circle cx="0" cy="0" r="12" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
                {/* Hub */}
                <circle cx="0" cy="0" r="3.5" fill="#1e293b" />
                {/* Rotating Spokes */}
                <g className="spinning-spokes">
                  <line x1="-11" y1="0" x2="11" y2="0" stroke="#64748b" strokeWidth="1.5" />
                  <line x1="0" y1="-11" x2="0" y2="11" stroke="#64748b" strokeWidth="1.5" />
                  <line x1="-8" y1="-8" x2="8" y2="8" stroke="#64748b" strokeWidth="1.5" />
                  <line x1="-8" y1="8" x2="8" y2="-8" stroke="#64748b" strokeWidth="1.5" />
                </g>
              </g>

              {/* Scooter Chassis & Floorboard */}
              <path
                d="M62,110 L90,110 L108,112 L138,112 L158,95 L178,110"
                fill="none"
                stroke="#475569"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Body Panels */}
              <path
                d="M80,105 Q100,75 125,98 L115,110 L82,110 Z"
                fill="#f97316"
              />

              {/* Front Cowl and Fork */}
              <path
                d="M152,98 L170,72 L182,75 L168,102 Z"
                fill="#ea580c"
              />
              <line x1="172" y1="74" x2="178" y2="110" stroke="#334155" strokeWidth="3" strokeLinecap="round" />

              {/* Handlebars */}
              <path
                d="M166,70 L174,68 L180,71"
                fill="none"
                stroke="#1e293b"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Headlight */}
              <path
                d="M182,75 L192,78 L192,84 L180,82 Z"
                fill="#fef08a"
                stroke="#eab308"
                strokeWidth="1"
              />

              {/* Rear Delivery Thermal Bag / Box */}
              <rect
                x="44"
                y="58"
                width="34"
                height="38"
                rx="6"
                fill="url(#riderBrandGrad)"
                stroke="#c2410c"
                strokeWidth="1.5"
              />
              {/* Delivery Bag Straps and Fasteners */}
              <line x1="44" y1="72" x2="78" y2="72" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
              <rect x="58" y="70" width="6" height="4" rx="1" fill="#1e293b" />
              {/* Food Delivery Icon on Box (Fork & Knife / Burger representation) */}
              <circle cx="61" cy="82" r="5" fill="#ffffff" opacity="0.9" />
              <path d="M59,80 L59,84 M63,80 L63,84 M58,82 L64,82" stroke="#ea580c" strokeWidth="1.2" strokeLinecap="round" />

              {/* Rider Body */}
              {/* Leg & Foot */}
              <path
                d="M112,85 L124,96 L134,110 L144,110"
                fill="none"
                stroke="#1e293b"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Torso & Jacket */}
              <path
                d="M95,84 C92,70 102,62 118,60 C128,66 130,76 122,86 Z"
                fill="#f97316"
              />

              {/* Arms extending forward to handlebar */}
              <path
                d="M114,66 L142,72 L168,70"
                fill="none"
                stroke="#ea580c"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Gloves */}
              <circle cx="170" cy="70" r="3.5" fill="#0f172a" />

              {/* Neck & Helmet */}
              <circle cx="120" cy="46" r="12" fill="#0f172a" />
              {/* Helmet Visor */}
              <path
                d="M124,42 Q134,44 133,52 L123,52 Z"
                fill="#38bdf8"
              />
              {/* Helmet Stripe */}
              <path
                d="M112,42 Q120,38 128,42"
                fill="none"
                stroke="#f97316"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>

        {/* ── Messages & Status Indicator ── */}
        <div className="mt-4 flex flex-col items-center">
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

      {/* ── Inline CSS Animations ── */}
      <style>{`
        /* Smooth vertical bob for rider & bike chassis */
        @keyframes rider-suspension-bob {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2.5px);
          }
        }

        /* Continuous rotation for wheels */
        @keyframes wheel-spoke-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Seamless scrolling road */
        @keyframes road-line-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-40px);
          }
        }

        /* Exhaust dust pulses */
        @keyframes exhaust-puff {
          0% {
            transform: translateX(0) scale(0.8);
            opacity: 0.8;
          }
          50% {
            transform: translateX(-8px) scale(1.1);
            opacity: 0.4;
          }
          100% {
            transform: translateX(-16px) scale(1.3);
            opacity: 0;
          }
        }

        .rider-bike-body {
          animation: rider-suspension-bob 0.6s ease-in-out infinite;
          transform-origin: center bottom;
          will-change: transform;
        }

        .spinning-spokes {
          animation: wheel-spoke-rotate 0.75s linear infinite;
          transform-origin: 0px 0px;
          will-change: transform;
        }

        .scrolling-road-strip {
          animation: road-line-scroll 0.5s linear infinite;
          will-change: transform;
        }

        .rider-exhaust {
          animation: exhaust-puff 0.7s ease-out infinite;
          transform-origin: 34px 115px;
          will-change: transform, opacity;
        }

        /* ── Reduced Motion Mode (§3) ── */
        @media (prefers-reduced-motion: reduce) {
          .rider-bike-body,
          .spinning-spokes,
          .scrolling-road-strip,
          .rider-exhaust {
            animation: none !important;
          }
          .rider-scene {
            opacity: 0.95;
          }
        }
      `}</style>
    </div>
  );
};

export default RiderLoader;
