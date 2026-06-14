/**
 * Vertical timeline of audit-log entries. Used on detail pages (per-resource
 * history) and as the row renderer on the Audit Log page.
 */
import * as React from "react";
import { History } from "lucide-react";

import { cn } from "@/utils/cn";
import { formatDateTime } from "@/utils/format";

export interface AuditChange {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface AuditEntry {
  _id: string;
  action: string;
  actorId?: { firstName?: string; lastName?: string; email?: string; role?: string } | string | null;
  actorRole?: string;
  resourceType?: string;
  changes?: AuditChange[];
  metadata?: Record<string, unknown>;
  timestamp?: string;
  createdAt?: string;
}

const prettyAction = (action: string) =>
  action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const actorName = (actor: AuditEntry["actorId"]): string => {
  if (!actor || typeof actor === "string") return "System";
  const name = `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim();
  return name || actor.email || "System";
};

export interface AuditTimelineProps {
  entries: AuditEntry[];
  emptyLabel?: string;
  className?: string;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  entries,
  emptyLabel = "No activity recorded yet.",
  className,
}) => {
  if (!entries.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <ol className={cn("relative space-y-5 pl-6", className)}>
      <span
        aria-hidden
        className="absolute bottom-2 left-[7px] top-2 w-px bg-border"
      />
      {entries.map((entry) => {
        const when = entry.timestamp ?? entry.createdAt;
        const reason = entry.metadata?.reason as string | undefined;
        return (
          <li key={entry._id} className="relative">
            <span className="absolute -left-6 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card bg-brand-500 ring-1 ring-brand-600/30" />
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                {prettyAction(entry.action)}
              </p>
              <time className="text-xs text-muted-foreground">
                {formatDateTime(when)}
              </time>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              by {actorName(entry.actorId)}
              {entry.actorRole ? ` · ${entry.actorRole}` : ""}
            </p>
            {reason && (
              <p className="mt-1 text-sm text-foreground/80">“{reason}”</p>
            )}
            {entry.changes && entry.changes.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {entry.changes.map((c, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">{c.field}</span>
                    {c.oldValue !== undefined && (
                      <>
                        {": "}
                        <span className="line-through">{String(c.oldValue)}</span>
                        {" → "}
                      </>
                    )}
                    {c.newValue !== undefined && (
                      <span className="text-foreground">
                        {c.oldValue === undefined ? ": " : ""}
                        {String(c.newValue)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
};

export { prettyAction, History as AuditIcon };
