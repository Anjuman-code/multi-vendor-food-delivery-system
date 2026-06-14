/**
 * Label/value pair list used inside detail-page SectionCards.
 */
import * as React from "react";

import { cn } from "@/utils/cn";

export interface KeyValueItem {
  label: React.ReactNode;
  value: React.ReactNode;
}

export interface KeyValueListProps {
  items: KeyValueItem[];
  /** Number of columns on >=sm screens. */
  columns?: 1 | 2 | 3;
  className?: string;
}

export const KeyValueList: React.FC<KeyValueListProps> = ({
  items,
  columns = 2,
  className,
}) => (
  <dl
    className={cn(
      "grid gap-x-6 gap-y-4",
      columns === 1 && "sm:grid-cols-1",
      columns === 2 && "sm:grid-cols-2",
      columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
      className,
    )}
  >
    {items.map((item, i) => (
      <div key={i} className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {item.label}
        </dt>
        <dd className="mt-1 break-words text-sm font-medium text-foreground">
          {item.value ?? "—"}
        </dd>
      </div>
    ))}
  </dl>
);
