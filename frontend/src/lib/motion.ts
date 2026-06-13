import type { Variants } from "framer-motion";

/**
 * Shared Framer Motion variants for public pages.
 *
 * These replace the per-page `containerVariants` / `itemVariants` blocks
 * that were copy-pasted across the site, so entrance animations stay
 * identical everywhere. Import these instead of redefining locally.
 */

const EASE_OUT = [0.25, 0.46, 0.45, 0.94] as const;

/** Parent that staggers children into view. Pair with `staggerItem`. */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

/** Child fade-and-rise. Pair with `staggerContainer`. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

/** Standalone fade-and-rise for `whileInView` reveals. */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

/** Default viewport config for scroll-triggered reveals. */
export const inViewport = { once: true, margin: "-100px" } as const;
