import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * 2px top progress bar that fires on every route change.
 * Color follows --brand-500 design token. No spinners.
 */
export function RouteProgressBar() {
  const location = useLocation();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const ids = useRef<number[]>([]);

  const clearAll = () => {
    ids.current.forEach(window.clearTimeout);
    ids.current = [];
  };

  const after = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    ids.current.push(id);
  };

  useEffect(() => {
    clearAll();

    // Reset state and kick off indeterminate ramp
    setFading(false);
    setWidth(0);
    setVisible(true);

    // Non-linear advance to ~82% — decelerates as it approaches the cap
    after(() => setWidth(12), 20);
    after(() => setWidth(40), 130);
    after(() => setWidth(64), 360);
    after(() => setWidth(82), 620);

    // Complete: snap to 100%, then fade out
    after(() => setWidth(100), 760);
    after(() => setFading(true), 880);
    after(() => {
      setVisible(false);
      setFading(false);
      setWidth(0);
    }, 1160);

    return clearAll;
    // location.key changes on every navigation (even same-path pushes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '2px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: 'var(--brand-500)',
          // Subtle glow using brand-400 (#fb923c)
          boxShadow: '0 0 10px 1px #fb923c',
          opacity: fading ? 0 : 1,
          transition: fading
            ? 'opacity 0.26s ease'
            : 'width 0.36s cubic-bezier(0.05, 0.6, 0.4, 0.9)',
          willChange: 'width, opacity',
        }}
      />
    </div>
  );
}
