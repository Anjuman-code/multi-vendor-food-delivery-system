/**
 * Performance optimization utilities
 */

/**
 * Creates a debounced version of a function
 * @param func - Function to debounce
 * @param wait - Time to wait before executing (ms)
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Creates a throttled version of a function
 * @param func - Function to throttle
 * @param limit - Minimum time between executions (ms)
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Request Animation Frame scheduler for smooth animations
 */
export const rafScheduler = {
  queue: new Set<FrameRequestCallback>(),
  running: false,

  schedule(callback: FrameRequestCallback): void {
    this.queue.add(callback);
    if (!this.running) {
      this.running = true;
      this.tick();
    }
  },

  tick(): void {
    requestAnimationFrame((timestamp) => {
      const callbacks = Array.from(this.queue);
      this.queue.clear();
      callbacks.forEach((cb) => cb(timestamp));
      if (this.queue.size > 0) {
        this.tick();
      } else {
        this.running = false;
      }
    });
  },
};

/**
 * Check if element is in viewport (for lazy loading)
 */
export function isInViewport(
  element: Element,
  rootMargin: string = "0px",
): boolean {
  const rect = element.getBoundingClientRect();
  const margins = parseRootMargin(rootMargin);

  return (
    rect.top <=
      (window.innerHeight || document.documentElement.clientHeight) +
        margins.bottom &&
    rect.bottom >= -margins.top &&
    rect.left <=
      (window.innerWidth || document.documentElement.clientWidth) +
        margins.right &&
    rect.right >= -margins.left
  );
}

function parseRootMargin(rootMargin: string) {
  const [top, right, bottom, left] = rootMargin
    .split(" ")
    .map((val) => parseInt(val, 10) || 0);
  return { top, right, bottom, left };
}

/**
 * Memoize expensive computations
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  func: T,
  resolver?: (...args: Parameters<T>) => string,
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>;
    }
    const result = func(...args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Sleep utility for delaying execution
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Batch multiple state updates
 */
export function batchUpdates<T extends Record<string, unknown>>(
  currentState: T,
  updates: Partial<T>,
): T {
  return { ...currentState, ...updates };
}
