/**
 * Shared rider dashboard primitives. Import from "@/components/rider".
 *
 * Rider-specific building blocks live here; generic dashboard primitives
 * (cards, tables, badges) are re-exported from the shared dashboard set so
 * rider pages have a single, consistent import surface.
 */
export { AvailabilityToggle } from "./AvailabilityToggle";
export type { AvailabilityToggleProps } from "./AvailabilityToggle";

export { DeliveryMap } from "./DeliveryMap";
export type { DeliveryMapProps, LatLng } from "./DeliveryMap";

export {
  DeliveryStageStepper,
  STAGE_META,
  nextStageAction,
} from "./DeliveryStageStepper";
export type { DeliveryStageStepperProps } from "./DeliveryStageStepper";

// Re-exported shared dashboard primitives (token-driven, role-agnostic).
export {
  StatCard,
  SectionCard,
  PageHeader,
  StatusBadge,
  VendorEmptyState as EmptyState,
  DataTable,
} from "@/components/vendor";
export type {
  StatCardProps,
  SectionCardProps,
  PageHeaderProps,
  StatusBadgeProps,
  DataTableColumn,
} from "@/components/vendor";
