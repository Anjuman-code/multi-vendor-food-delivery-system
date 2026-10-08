/**
 * Re-export the shared EmptyState primitive as VendorEmptyState.
 * Maintained for backward-compatibility with vendor/admin pages.
 */
import {
  EmptyState,
  type EmptyStateProps,
  type EmptyStateAction,
} from "@/components/ui/EmptyState";

export type VendorEmptyStateProps = EmptyStateProps;
export const VendorEmptyState = EmptyState;
export default VendorEmptyState;
export { EmptyState, type EmptyStateAction };
