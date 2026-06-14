/**
 * Application Toaster — mounts the sonner toast viewport once at the app root.
 *
 * Production-grade defaults:
 *  - top-right on desktop, auto-centred at the top on mobile (sonner default)
 *  - stacked/expandable so multiple toasts are visible (no "one at a time" loss)
 *  - rich semantic colours, close button, pause-on-hover, swipe-to-dismiss
 *  - subtle scale/fade motion (sonner built-in) + brand-tuned styling
 *  - accessible: sonner renders an aria-live region and is keyboard reachable
 */
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      expand
      gap={12}
      visibleToasts={4}
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "group rounded-xl border shadow-lg backdrop-blur-sm " +
            "data-[type=default]:bg-white data-[type=default]:text-gray-900 data-[type=default]:border-gray-200",
          title: "text-sm font-semibold",
          description: "text-sm opacity-90",
          actionButton:
            "rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700",
          cancelButton:
            "rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200",
          closeButton:
            "border-gray-200 bg-white text-gray-500 hover:text-gray-900",
        },
      }}
      {...props}
    />
  );
}
