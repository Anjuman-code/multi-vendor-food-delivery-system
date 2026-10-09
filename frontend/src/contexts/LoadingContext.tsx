import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface BlockingLoaderOptions {
  message?: string;
  slowMessage?: string;
  minDurationMs?: number;
  delayMs?: number;
  timeoutMs?: number;
  allowCancel?: boolean;
  onCancel?: () => void;
}

export interface ActiveBlockingOperation {
  id: string;
  message: string;
  slowMessage?: string;
  startTime: number;
  minDurationMs: number;
  delayMs: number;
  timeoutMs: number;
  allowCancel: boolean;
  onCancel?: () => void;
  timerId?: ReturnType<typeof setTimeout>;
}

export interface LoadingContextValue {
  // Navigation progress bar API
  isNavigating: boolean;
  isNavigatingSlow: boolean;
  startNavigation: () => void;
  finishNavigation: () => void;
  resetNavigation: () => void;

  // Blocking rider loader API
  run: <T>(
    promiseOrFn: Promise<T> | (() => Promise<T>),
    options?: BlockingLoaderOptions,
  ) => Promise<T>;
  show: (options?: BlockingLoaderOptions) => string;
  hide: (id: string) => void;

  // State exposed to overlay component
  activeOperation: ActiveBlockingOperation | null;
  isBlockingVisible: boolean;
  isTakingLonger: boolean;
  cancelActiveOperation: () => void;
}

// ── Timing Constants (Configured in one place per §4) ────────────────
export const LOADING_TIMING = {
  // Navigation Progress Bar
  NAV_SHOW_DELAY_MS: 120,    // Only show bar if navigation takes > 120ms
  NAV_MIN_DURATION_MS: 300,  // Keep bar visible at least 300ms if shown
  NAV_SLOW_CUE_DELAY_MS: 400, // Show pending cue (dimming) if navigation > 400ms

  // Blocking Rider Loader
  BLOCKING_SHOW_DELAY_MS: 220,   // Fast actions (<220ms) never flash the overlay
  BLOCKING_MIN_DURATION_MS: 600, // Once visible, stay at least 600ms so animation reads
  BLOCKING_DEFAULT_TIMEOUT_MS: 30000, // 30s stuck guard timeout
} as const;

const LoadingContext = createContext<LoadingContextValue | null>(null);

let operationIdCounter = 0;
const generateId = () => `blocking_op_${++operationIdCounter}_${Date.now()}`;

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // ── 1. Navigation Progress Bar State ────────────────────────────────
  const navCountRef = useRef(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isNavigatingSlow, setIsNavigatingSlow] = useState(false);
  const navDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navSlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navShownAtRef = useRef<number | null>(null);

  const resetNavigation = useCallback(() => {
    navCountRef.current = 0;
    if (navDelayTimerRef.current) {
      clearTimeout(navDelayTimerRef.current);
      navDelayTimerRef.current = null;
    }
    if (navSlowTimerRef.current) {
      clearTimeout(navSlowTimerRef.current);
      navSlowTimerRef.current = null;
    }
    navShownAtRef.current = null;
    setIsNavigating(false);
    setIsNavigatingSlow(false);
  }, []);

  const startNavigation = useCallback(() => {
    navCountRef.current += 1;
    if (navCountRef.current === 1) {
      if (navDelayTimerRef.current) clearTimeout(navDelayTimerRef.current);
      navDelayTimerRef.current = setTimeout(() => {
        setIsNavigating(true);
        navShownAtRef.current = Date.now();
      }, LOADING_TIMING.NAV_SHOW_DELAY_MS);

      if (navSlowTimerRef.current) clearTimeout(navSlowTimerRef.current);
      navSlowTimerRef.current = setTimeout(() => {
        setIsNavigatingSlow(true);
      }, LOADING_TIMING.NAV_SLOW_CUE_DELAY_MS);
    }
  }, []);

  const finishNavigation = useCallback(() => {
    navCountRef.current = Math.max(0, navCountRef.current - 1);
    if (navCountRef.current === 0) {
      if (navDelayTimerRef.current) {
        clearTimeout(navDelayTimerRef.current);
        navDelayTimerRef.current = null;
      }
      if (navSlowTimerRef.current) {
        clearTimeout(navSlowTimerRef.current);
        navSlowTimerRef.current = null;
      }
      setIsNavigatingSlow(false);

      if (navShownAtRef.current !== null) {
        const elapsed = Date.now() - navShownAtRef.current;
        const remaining = Math.max(0, LOADING_TIMING.NAV_MIN_DURATION_MS - elapsed);
        setTimeout(() => {
          setIsNavigating(false);
          navShownAtRef.current = null;
        }, remaining);
      } else {
        setIsNavigating(false);
      }
    }
  }, []);

  // Listen to browser navigation intent (pushState, replaceState, popstate)
  useEffect(() => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const handleNavigationIntent = (targetUrl?: string | URL | null) => {
      if (!targetUrl) return;
      try {
        const currentPath = window.location.pathname + window.location.search;
        const urlObj = new URL(targetUrl.toString(), window.location.origin);
        if (urlObj.origin === window.location.origin) {
          const newPath = urlObj.pathname + urlObj.search;
          if (newPath !== currentPath) {
            startNavigation();
          }
        }
      } catch {
        // Fallback: don't block navigation on URL parsing errors
      }
    };

    window.history.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
      handleNavigationIntent(url);
      return originalPushState.apply(this, [data, unused, url]);
    };

    window.history.replaceState = function (data: unknown, unused: string, url?: string | URL | null) {
      handleNavigationIntent(url);
      return originalReplaceState.apply(this, [data, unused, url]);
    };

    const handlePopState = () => {
      startNavigation();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [startNavigation]);

  // ── 2. Blocking Rider Loader State ─────────────────────────────────
  const [operations, setOperations] = useState<ActiveBlockingOperation[]>([]);
  const [isBlockingVisible, setIsBlockingVisible] = useState(false);
  const [isTakingLonger, setIsTakingLonger] = useState(false);

  const activeOpRef = useRef<ActiveBlockingOperation | null>(null);
  const blockingShownAtRef = useRef<number | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive most recent active operation
  const currentActiveOp = operations.length > 0 ? operations[operations.length - 1] : null;
  activeOpRef.current = currentActiveOp;

  const show = useCallback((options?: BlockingLoaderOptions): string => {
    const id = generateId();
    const delay = options?.delayMs ?? LOADING_TIMING.BLOCKING_SHOW_DELAY_MS;
    const minDur = options?.minDurationMs ?? LOADING_TIMING.BLOCKING_MIN_DURATION_MS;
    const timeout = options?.timeoutMs ?? LOADING_TIMING.BLOCKING_DEFAULT_TIMEOUT_MS;

    const newOp: ActiveBlockingOperation = {
      id,
      message: options?.message ?? 'Just a moment…',
      slowMessage: options?.slowMessage ?? 'Taking a little longer than usual…',
      startTime: Date.now(),
      delayMs: delay,
      minDurationMs: minDur,
      timeoutMs: timeout,
      allowCancel: options?.allowCancel ?? false,
      onCancel: options?.onCancel,
    };

    setOperations((prev) => [...prev, newOp]);
    return id;
  }, []);

  const hide = useCallback((id: string) => {
    setOperations((prev) => prev.filter((op) => op.id !== id));
  }, []);

  const run = useCallback(
    async <T,>(
      promiseOrFn: Promise<T> | (() => Promise<T>),
      options?: BlockingLoaderOptions,
    ): Promise<T> => {
      const id = show(options);
      try {
        const promise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
        return await promise;
      } finally {
        hide(id);
      }
    },
    [show, hide],
  );

  const cancelActiveOperation = useCallback(() => {
    const op = activeOpRef.current;
    if (op && op.allowCancel) {
      if (op.onCancel) op.onCancel();
      hide(op.id);
    }
  }, [hide]);

  // Synchronize overlay display with anti-flicker delay and minimum visible duration
  useEffect(() => {
    if (operations.length > 0) {
      const op = operations[operations.length - 1];

      // Schedule display after delay if not already visible
      if (!isBlockingVisible && !showTimerRef.current) {
        showTimerRef.current = setTimeout(() => {
          setIsBlockingVisible(true);
          blockingShownAtRef.current = Date.now();
          showTimerRef.current = null;
        }, op.delayMs);
      }

      // Schedule stuck guard timeout
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = setTimeout(() => {
        setIsTakingLonger(true);
      }, op.timeoutMs);
    } else {
      // Clear timers
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
      setIsTakingLonger(false);

      if (blockingShownAtRef.current !== null) {
        // Enforce minimum display duration so animation is never cut abruptly
        const elapsed = Date.now() - blockingShownAtRef.current;
        const opMin = activeOpRef.current?.minDurationMs ?? LOADING_TIMING.BLOCKING_MIN_DURATION_MS;
        const remaining = Math.max(0, opMin - elapsed);

        const hideTimer = setTimeout(() => {
          setIsBlockingVisible(false);
          blockingShownAtRef.current = null;
        }, remaining);

        return () => clearTimeout(hideTimer);
      } else {
        setIsBlockingVisible(false);
      }
    }
  }, [operations, isBlockingVisible]);

  const value = useMemo<LoadingContextValue>(
    () => ({
      isNavigating,
      isNavigatingSlow,
      startNavigation,
      finishNavigation,
      resetNavigation,
      run,
      show,
      hide,
      activeOperation: currentActiveOp,
      isBlockingVisible,
      isTakingLonger,
      cancelActiveOperation,
    }),
    [
      isNavigating,
      isNavigatingSlow,
      startNavigation,
      finishNavigation,
      resetNavigation,
      run,
      show,
      hide,
      currentActiveOp,
      isBlockingVisible,
      isTakingLonger,
      cancelActiveOperation,
    ],
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

export const useLoading = (): LoadingContextValue => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const useBlockingLoader = () => {
  const { run, show, hide, isBlockingVisible, activeOperation } = useLoading();
  return { run, show, hide, isBlockingVisible, activeOperation };
};
