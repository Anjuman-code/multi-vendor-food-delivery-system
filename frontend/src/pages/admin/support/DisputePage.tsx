import { AdminTable, Column } from "@/components/admin/AdminTable";
import httpClient from "@/lib/httpClient";
import type { SupportTicket, TicketStatus, TicketPriority } from "@/types/support";
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS, TICKET_TYPE_LABELS } from "@/types/support";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const statusBadge = (t: SupportTicket) => {
  const map: Record<TicketStatus, string> = {
    open: "bg-amber-50 text-amber-600",
    in_progress: "bg-blue-50 text-blue-600",
    waiting_on_user: "bg-orange-50 text-orange-600",
    resolved: "bg-emerald-50 text-emerald-600",
    closed: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${map[t.status]}`}>
      {TICKET_STATUS_LABELS[t.status]}
    </span>
  );
};

const priorityBadge = (t: SupportTicket) => {
  const map: Record<TicketPriority, string> = {
    urgent: "bg-red-50 text-red-600",
    high: "bg-orange-50 text-orange-600",
    medium: "bg-amber-50 text-amber-600",
    low: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${map[t.priority]}`}>
      {TICKET_PRIORITY_LABELS[t.priority]}
    </span>
  );
};

export default function DisputePage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDisputes = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await httpClient.get(`/api/admin/orders/disputes?page=${p}&limit=20`);
      const d = (res.data as { data: { tickets: SupportTicket[]; pagination: { total: number; pages: number; page: number } } }).data;
      setTickets(d.tickets);
      setTotal(d.pagination.total);
      setTotalPages(d.pagination.pages);
      setPage(d.pagination.page);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes(1);
  }, [fetchDisputes]);

  const customerName = (t: SupportTicket) =>
    typeof t.userId === "object" && t.userId
      ? `${t.userId.firstName} ${t.userId.lastName}`
      : "—";

  const orderNum = (t: SupportTicket) => {
    if (!t.orderId) return "—";
    if (typeof t.orderId === "object") return t.orderId.orderNumber;
    return t.orderId;
  };

  const columns: Column<SupportTicket>[] = [
    {
      key: "ticket",
      header: "Ticket",
      render: (t) => (
        <div>
          {t.ticketNumber && <p className="text-xs font-mono text-gray-400">{t.ticketNumber}</p>}
          <p className="text-sm font-medium text-gray-900">{t.subject}</p>
        </div>
      ),
    },
    {
      key: "order",
      header: "Order",
      render: (t) => (
        <span className="text-sm font-mono text-gray-600">{orderNum(t)}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (t) => (
        <div>
          <p className="text-sm text-gray-700">{customerName(t)}</p>
          {typeof t.userId === "object" && t.userId && (
            <p className="text-xs text-gray-400">{t.userId.email}</p>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (t) => (
        <span className="text-xs text-gray-500">{TICKET_TYPE_LABELS[t.type]}</span>
      ),
    },
    { key: "status", header: "Status", render: statusBadge },
    { key: "priority", header: "Priority", render: priorityBadge },
    {
      key: "created",
      header: "Created",
      render: (t) => (
        <span className="text-xs text-gray-400">
          {new Date(t.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h1 className="text-xl font-bold text-gray-900">Order Disputes</h1>
        </div>
        <p className="text-sm text-gray-500">
          Support tickets related to specific orders that need attention.
        </p>
      </motion.div>

      <AdminTable
        columns={columns}
        data={tickets}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => fetchDisputes(p)}
        total={total}
        limit={20}
        emptyMessage="No open disputes."
      />
    </div>
  );
}
