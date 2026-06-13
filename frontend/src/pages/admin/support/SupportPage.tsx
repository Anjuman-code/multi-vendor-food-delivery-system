import { AdminTable, Column } from "@/components/admin/AdminTable";
import httpClient from "@/lib/httpClient";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface SupportTicket {
  _id: string;
  ticketNumber?: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category?: string;
  createdAt: string;
  updatedAt: string;
  userId?: { firstName: string; lastName: string; email: string } | string;
}

const statusBadge = (t: SupportTicket) => {
  const map = {
    open: "bg-amber-50 text-amber-600",
    in_progress: "bg-blue-50 text-blue-600",
    resolved: "bg-emerald-50 text-emerald-600",
    closed: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${map[t.status]}`}>
      {t.status.replace(/_/g, " ")}
    </span>
  );
};

const priorityBadge = (t: SupportTicket) => {
  const map = {
    urgent: "bg-red-50 text-red-600",
    high: "bg-orange-50 text-orange-600",
    medium: "bg-amber-50 text-amber-600",
    low: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${map[t.priority]}`}>
      {t.priority}
    </span>
  );
};

export default function SupportPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const fetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (filterStatus) params.set("status", filterStatus);
      if (filterPriority) params.set("priority", filterPriority);
      const res = await httpClient.get(`/api/admin/tickets?${params}`);
      const d = (res.data as { data: { tickets: SupportTicket[]; pagination: { total: number; pages: number; page: number } } }).data;
      setTickets(d.tickets);
      setTotal(d.pagination.total);
      setTotalPages(d.pagination.pages);
      setPage(d.pagination.page);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority]);

  useEffect(() => { fetch(1); }, [filterStatus, filterPriority, fetch]);

  const customerName = (t: SupportTicket) =>
    typeof t.userId === "object" && t.userId
      ? `${t.userId.firstName} ${t.userId.lastName}`
      : "—";

  const columns: Column<SupportTicket>[] = [
    {
      key: "ticket",
      header: "Ticket",
      render: (t) => (
        <div>
          {t.ticketNumber && <p className="text-xs font-mono text-gray-400">{t.ticketNumber}</p>}
          <p className="text-sm font-medium text-gray-900">{t.subject}</p>
          {t.category && <p className="text-xs text-gray-400 capitalize">{t.category}</p>}
        </div>
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
    { key: "status", header: "Status", render: statusBadge },
    { key: "priority", header: "Priority", render: priorityBadge },
    {
      key: "updated",
      header: "Last Updated",
      render: (t) => <span className="text-xs text-gray-400">{new Date(t.updatedAt).toLocaleDateString()}</span>,
    },
    {
      key: "created",
      header: "Created",
      render: (t) => <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <button
          onClick={(e) => { e.preventDefault(); navigate(`/admin/support/${t._id}`); }}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-sm text-gray-500">{total} tickets</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white">
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white">
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </motion.div>

      <AdminTable columns={columns} data={tickets} loading={loading} page={page} totalPages={totalPages}
        onPageChange={(p) => fetch(p)} total={total} limit={20} emptyMessage="No support tickets found." />
    </div>
  );
}
