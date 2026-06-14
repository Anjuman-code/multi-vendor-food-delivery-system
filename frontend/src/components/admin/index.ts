/**
 * Shared admin dashboard primitives. Import from "@/components/admin".
 *
 * The light "SaaS" primitive kit is shared with the vendor dashboard; we
 * re-export it here so admin pages have a single, semantically-named surface
 * (and `VendorEmptyState` is aliased to the neutral `EmptyState`).
 */
export {
  StatCard,
  SectionCard,
  PageHeader,
  StatusBadge,
  VendorEmptyState as EmptyState,
  DataTable,
  FilterBar,
  SegmentedTabs,
  ChartCard,
  CHART_COLORS,
  FormDialog,
} from "@/components/vendor";
export type {
  StatCardProps,
  SectionCardProps,
  PageHeaderProps,
  StatusBadgeProps,
  StatusTone,
  VendorEmptyStateProps as EmptyStateProps,
  DataTableProps,
  DataTableColumn,
  SortDir,
  FilterBarProps,
  SegmentedTabsProps,
  ChartCardProps,
  FormDialogProps,
} from "@/components/vendor";

// Admin-specific primitives
export { ConfirmDialog } from "@/components/admin/ConfirmDialog";
export type { ConfirmDialogProps } from "@/components/admin/ConfirmDialog";

export { DetailHeader } from "@/components/admin/DetailHeader";
export type { DetailHeaderProps } from "@/components/admin/DetailHeader";

export { KeyValueList } from "@/components/admin/KeyValue";
export type { KeyValueListProps, KeyValueItem } from "@/components/admin/KeyValue";

export { AuditTimeline } from "@/components/admin/AuditTimeline";
export type { AuditEntry, AuditChange, AuditTimelineProps } from "@/components/admin/AuditTimeline";

export { exportToCsv } from "@/components/admin/exportCsv";
export type { CsvColumn } from "@/components/admin/exportCsv";
