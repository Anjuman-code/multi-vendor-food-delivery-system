import {
  DataTable,
  type DataTableColumn,
  EmptyState,
  exportToCsv,
  FilterBar,
  PageHeader,
  SegmentedTabs,
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
import supportService from "@/services/supportService";
import type { SupportTicket } from "@/types/support";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_TYPE_LABELS,
} from "@/types/support";
import { formatDate, formatRelativeTime } from "@/utils/format";
import { Download, LifeBuoy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_on_user", label: "Waiting on User" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const customerOf = (t: SupportTicket) =>
  typeof t.userId === "object" && t.userId
    ? { name: `${t.userId.firstName} ${t.userId.lastName}`, email: t.userId.email }
    : { name: "—", email: "" };

const assignedOf = (t: SupportTicket) =>
  typeof t.assignedTo === "object" && t.assignedTo
    ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}`
    : null;

export default function SupportPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "all");
  const [priority, setPriority] = useState("all");

  const fetchTickets = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await supportService.getAllTickets({
          page: p,
          limit: 20,
          status: status === "all" ? undefined : status,
          priority: priority === "all" ? undefined : priority,
        });
        if (res.success && res.data) {
          setTickets(res.data.tickets);
          setTotal(res.data.pagination.total);
          setTotalPages(res.data.pagination.pages);
          setPage(res.data.pagination.page);
        } else {
          toast.error("Failed to load tickets");
        }
      } catch {
        toast.error("Failed to load tickets");
      } finally {
        setLoading(false);
      }
    },
    [status, priority],
  );

  useEffect(() => {
    fetchTickets(1);
  }, [status, priority]);

  const onStatusChange = (v: string) => {
    setStatus(v);
    if (v === "all") params.delete("status");
    else params.set("status", v);
    setParams(params, { replace: true });
  };

  // Client-side search across subject / customer (backend list has no search param).
  const filtered = search.trim()
    ? tickets.filter((t) => {
        const q = search.trim().toLowerCase();
        const c = customerOf(t);
        return (
          t.subject.toLowerCase().includes(q) ||
          (t.ticketNumber ?? "").toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      })
    : tickets;

  const exportCsv = () =>
    exportToCsv("support-tickets", filtered, [
      { key: "ticket", header: "Ticket #", value: (t) => t.ticketNumber ?? t._id },
      { key: "subject", header: "Subject", value: (t) => t.subject },
      { key: "type", header: "Type", value: (t) => TICKET_TYPE_LABELS[t.type] },
      { key: "customer", header: "Customer", value: (t) => customerOf(t).name },
      { key: "email", header: "Email", value: (t) => customerOf(t).email },
      { key: "status", header: "Status", value: (t) => t.status },
      { key: "priority", header: "Priority", value: (t) => TICKET_PRIORITY_LABELS[t.priority] },
      { key: "assigned", header: "Assigned To", value: (t) => assignedOf(t) ?? "Unassigned" },
      { key: "created", header: "Created", value: (t) => formatDate(t.createdAt) },
    ]);

  const columns: DataTableColumn<SupportTicket>[] = [
    {
      key: "ticket",
      header: "Ticket",
      render: (t) => (
        <div className="min-w-0">
          {t.ticketNumber && (
            <p className="font-mono text-[11px] text-muted-foreground">{t.ticketNumber}</p>
          )}
          <p className="truncate font-medium text-foreground">{t.subject}</p>
          <p className="truncate text-xs text-muted-foreground">{TICKET_TYPE_LABELS[t.type]}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (t) => {
        const c = customerOf(t);
        return (
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{c.name}</p>
            {c.email && <p className="truncate text-xs text-muted-foreground">{c.email}</p>}
          </div>
        );
      },
    },
    { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
    {
      key: "priority",
      header: "Priority",
      render: (t) => <StatusBadge status={t.priority} size="sm" />,
    },
    {
      key: "assigned",
      header: "Assigned",
      render: (t) => {
        const a = assignedOf(t);
        return a ? (
          <span className="text-sm text-foreground">{a}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        );
      },
    },
    {
      key: "updated",
      header: "Updated",
      render: (t) => (
        <span className="text-muted-foreground">{formatRelativeTime(t.updatedAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Support Tickets"
        description={`${total} total tickets`}
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <SegmentedTabs value={status} onChange={onStatusChange} options={STATUS_TABS} />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search subject, customer or ticket #…"
      >
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(t) => t._id}
        loading={loading}
        onRowClick={(t) => navigate(`/admin/support/${t._id}`)}
        emptyState={
          <EmptyState
            icon={LifeBuoy}
            title="No support tickets found"
            description="Try adjusting your search or filters."
            className="border-0"
          />
        }
        pagination={
          search.trim()
            ? undefined
            : { page, pages: totalPages, total, onPageChange: (p) => fetchTickets(p) }
        }
      />
    </div>
  );
}
