import { AdminTable, Column } from "@/components/admin/AdminTable";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

interface AuditEntry {
  _id: string;
  actorId?: { firstName: string; lastName: string; email: string } | string;
  action: string;
  resourceType: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterAction, setFilterAction] = useState("");
  const [filterResource, setFilterResource] = useState("");

  const fetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: p, limit: 20 };
      if (filterAction) params.action = filterAction;
      if (filterResource) params.resourceType = filterResource;
      const res = await adminService.getAuditLog(params);
      const d = (res.data as { data: { logs: AuditEntry[]; pagination: { total: number; pages: number; page: number } } }).data;
      setEntries(d.logs);
      setTotal(d.pagination.total);
      setTotalPages(d.pagination.pages);
      setPage(d.pagination.page);
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterResource]);

  useEffect(() => { fetch(1); }, [filterAction, filterResource, fetch]);

  const actorName = (e: AuditEntry) =>
    typeof e.actorId === "object" && e.actorId
      ? `${e.actorId.firstName} ${e.actorId.lastName}`
      : (typeof e.actorId === "string" ? e.actorId : "System");

  const columns: Column<AuditEntry>[] = [
    {
      key: "actor",
      header: "Actor",
      render: (e) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{actorName(e)}</p>
          {typeof e.actorId === "object" && e.actorId && (
            <p className="text-xs text-gray-400">{e.actorId.email}</p>
          )}
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (e) => (
        <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded-md bg-indigo-50 text-indigo-700">
          {e.action}
        </span>
      ),
    },
    {
      key: "resource",
      header: "Resource",
      render: (e) => (
        <div>
          <p className="text-sm text-gray-700 capitalize">{e.resourceType}</p>
          {e.resourceId && <p className="text-xs text-gray-400 font-mono">{e.resourceId}</p>}
        </div>
      ),
    },
    {
      key: "ip",
      header: "IP",
      render: (e) => <span className="text-xs font-mono text-gray-400">{e.ipAddress ?? "—"}</span>,
    },
    {
      key: "date",
      header: "Date",
      render: (e) => <span className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleString()}</span>,
    },
  ];

  const resourceTypes = ["user", "restaurant", "order", "vendor", "driver", "payout", "settings", "review", "campaign"];
  const actions = ["login", "logout", "create", "update", "delete", "approve", "reject", "suspend", "ban", "refund", "override"];

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500">{total} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white">
            <option value="">All Actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterResource} onChange={(e) => setFilterResource(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white">
            <option value="">All Resources</option>
            {resourceTypes.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
          </select>
        </div>
      </motion.div>

      <AdminTable columns={columns} data={entries} loading={loading} page={page} totalPages={totalPages}
        onPageChange={(p) => fetch(p)} total={total} limit={20} emptyMessage="No audit log entries found." />
    </div>
  );
}
