import {
  DataTable,
  type DataTableColumn,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/admin";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import type { SupportTicket } from "@/types/support";
import { TICKET_TYPE_LABELS } from "@/types/support";
import { formatCurrency, formatRelativeTime } from "@/utils/format";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/** A dispute is a SupportTicket with `orderId` and `userId` populated. */
type Dispute = Omit<SupportTicket, "orderId"> & {
  orderId?: { _id: string; orderNumber: string; status: string; total: number; createdAt: string };
};

const customerOf = (d: Dispute) =>
  typeof d.userId === "object" && d.userId
    ? { name: `${d.userId.firstName} ${d.userId.lastName}`, email: d.userId.email }
    : { name: "—", email: "" };

export default function DisputePage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getDisputeQueue();
      const data = (res.data as { data: { disputes: Dispute[]; count: number } }).data;
      setDisputes(data.disputes);
    } catch {
      toast({ title: "Failed to load disputes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const columns: DataTableColumn<Dispute>[] = [
    {
      key: "ticket",
      header: "Dispute",
      render: (d) => (
        <div className="min-w-0">
          {d.ticketNumber && (
            <p className="font-mono text-[11px] text-muted-foreground">{d.ticketNumber}</p>
          )}
          <p className="truncate font-medium text-foreground">{d.subject}</p>
          <p className="truncate text-xs text-muted-foreground">{TICKET_TYPE_LABELS[d.type]}</p>
        </div>
      ),
    },
    {
      key: "order",
      header: "Order",
      render: (d) =>
        d.orderId && typeof d.orderId === "object" ? (
          <Link
            to={`/admin/orders/${d.orderId._id}`}
            onClick={(e) => e.stopPropagation()}
            className="group min-w-0"
          >
            <p className="font-mono text-xs font-semibold text-primary group-hover:underline">
              #{d.orderId.orderNumber}
            </p>
            <p className="text-xs text-muted-foreground">{formatCurrency(d.orderId.total)}</p>
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (d) => {
        const c = customerOf(d);
        return (
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{c.name}</p>
            {c.email && <p className="truncate text-xs text-muted-foreground">{c.email}</p>}
          </div>
        );
      },
    },
    { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
    {
      key: "priority",
      header: "Priority",
      render: (d) => <StatusBadge status={d.priority} size="sm" />,
    },
    {
      key: "created",
      header: "Opened",
      render: (d) => (
        <span className="text-muted-foreground">{formatRelativeTime(d.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Order Disputes
          </span>
        }
        description="Open support tickets tied to a specific order that need attention."
      />

      <DataTable
        columns={columns}
        data={disputes}
        getRowId={(d) => d._id}
        loading={loading}
        onRowClick={(d) => navigate(`/admin/support/${d._id}`)}
        emptyState={
          <EmptyState
            icon={ShieldCheck}
            title="No open disputes"
            description="There are no order-related tickets needing attention right now."
            className="border-0"
          />
        }
      />
    </div>
  );
}
