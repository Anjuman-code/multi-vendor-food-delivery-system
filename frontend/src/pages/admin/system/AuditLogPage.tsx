import {
  type AuditEntry,
  AuditTimeline,
  DataTable,
  type DataTableColumn,
  EmptyState,
  FilterBar,
  FormDialog,
  PageHeader,
  StatusBadge,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import adminService from "@/services/adminService";
import { formatDateTime } from "@/utils/format";
import { History, ScrollText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/** Exact PascalCase resourceType values the backend stores. */
const RESOURCE_TYPES = [
  "User",
  "VendorProfile",
  "DriverProfile",
  "Restaurant",
  "Order",
  "Payout",
  "Review",
  "CuisineType",
  "Tag",
  "ContentBlock",
  "MenuItem",
  "PlatformSettings",
] as const;

const prettyAction = (action: string) =>
  action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const actorName = (actor: AuditEntry["actorId"]): string => {
  if (!actor || typeof actor === "string") return "System";
  const name = `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim();
  return name || actor.email || "System";
};

const actorEmail = (actor: AuditEntry["actorId"]): string | undefined =>
  actor && typeof actor === "object" ? actor.email : undefined;

interface AuditPagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actionSearch, setActionSearch] = useState("");
  const [resourceType, setResourceType] = useState("all");
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLog = useCallback(
    async (p = 1, action = actionSearch, resource = resourceType) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page: p, limit: 30 };
        if (action.trim()) params.action = action.trim();
        if (resource !== "all") params.resourceType = resource;
        const res = await adminService.getAuditLog(params);
        const d = (
          res.data as { data: { logs: AuditEntry[]; pagination: AuditPagination } }
        ).data;
        setEntries(d.logs);
        setTotal(d.pagination.total);
        setTotalPages(d.pagination.pages);
        setPage(d.pagination.page);
      } catch {
        toast.error("Failed to load audit log");
      } finally {
        setLoading(false);
      }
    },
    [actionSearch, resourceType],
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchLog(1), 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [actionSearch, resourceType, fetchLog]);

  const columns: DataTableColumn<AuditEntry>[] = [
    {
      key: "actor",
      header: "Actor",
      render: (e) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{actorName(e.actorId)}</p>
          {actorEmail(e.actorId) && (
            <p className="truncate text-xs text-muted-foreground">{actorEmail(e.actorId)}</p>
          )}
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (e) => <StatusBadge label={prettyAction(e.action)} tone="neutral" icon={false} />,
    },
    {
      key: "resource",
      header: "Resource",
      render: (e) => (
        <span className="text-sm text-foreground">{e.resourceType ?? "—"}</span>
      ),
    },
    {
      key: "changes",
      header: "Changes",
      align: "center",
      render: (e) => (
        <span className="text-muted-foreground">{e.changes?.length ?? 0}</span>
      ),
    },
    {
      key: "timestamp",
      header: "When",
      render: (e) => (
        <span className="text-muted-foreground">
          {formatDateTime(e.timestamp ?? e.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Log" description={`${total} entries`} />

      <FilterBar
        search={actionSearch}
        onSearchChange={setActionSearch}
        searchPlaceholder="Search by action (e.g. order.refunded)…"
      >
        <Select value={resourceType} onValueChange={setResourceType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All resources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All resources</SelectItem>
            {RESOURCE_TYPES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={entries}
        getRowId={(e) => e._id}
        loading={loading}
        onRowClick={(e) => setSelected(e)}
        emptyState={
          <EmptyState
            icon={ScrollText}
            title="No audit entries found"
            description="Try adjusting your filters."
            className="border-0"
          />
        }
        pagination={{
          page,
          pages: totalPages,
          total,
          onPageChange: (p) => fetchLog(p),
        }}
      />

      <FormDialog
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        title="Audit Entry"
        description={
          selected
            ? `${prettyAction(selected.action)} · ${selected.resourceType ?? "—"}`
            : undefined
        }
        size="md"
        footer={
          <Button variant="outline" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected && (
          <div className="space-y-5">
            <AuditTimeline entries={[selected]} />

            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <History className="h-3.5 w-3.5" /> Metadata
                </h3>
                <pre className="overflow-x-auto rounded-xl bg-muted p-3 text-xs text-foreground">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </FormDialog>
    </div>
  );
}
