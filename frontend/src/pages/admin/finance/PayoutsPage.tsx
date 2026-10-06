import {
  DataTable,
  type DataTableColumn,
  EmptyState,
  exportToCsv,
  FormDialog,
  PageHeader,
  SectionCard,
  SegmentedTabs,
  StatCard,
  StatusBadge,
} from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import adminService from "@/services/adminService";
import paymentService, { type CodReconciliationData } from "@/services/paymentService";
import { formatCurrency, formatDate } from "@/utils/format";
import {
  AlertTriangle,
  Banknote,
  Bike,
  CheckCircle2,
  Download,
  RefreshCw,
  Store,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Payout {
  _id: string;
  recipientRole?: "vendor" | "driver";
  vendorId?: { _id?: string; firstName: string; lastName: string; email: string } | string;
  driverId?: { _id?: string; firstName: string; lastName: string; email: string; phone?: string } | string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  method?: string;
  createdAt: string;
  processedAt?: string;
  transactionRef?: string;
}

interface PendingVendor {
  _id: string;
  businessName?: string;
  pendingPayout: number;
  totalEarnings: number;
  userId: { _id: string; firstName: string; lastName: string; email: string } | string;
}

interface PendingDriver {
  _id: string;
  pendingPayout: number;
  totalEarnings: number;
  rating?: number;
  userId: { _id: string; firstName: string; lastName: string; email: string; phone?: string } | string;
}

interface ApiResponse {
  data: {
    payouts: Payout[];
    pagination: { page: number; pages: number; total: number; limit: number };
    pendingVendors: PendingVendor[];
    pendingDrivers?: PendingDriver[];
    pendingTotal: number;
    pendingVendorTotal?: number;
    pendingDriverTotal?: number;
  };
}

const PAYOUT_STATUSES = ["pending", "processing", "completed", "failed"];

const payoutRecipient = (p: Payout) => {
  const isDriver = p.recipientRole === "driver" || (p.driverId && !p.vendorId);
  if (isDriver) {
    const d = typeof p.driverId === "object" && p.driverId ? p.driverId : null;
    return {
      role: "driver" as const,
      roleLabel: "Rider",
      name: d ? `${d.firstName} ${d.lastName}`.trim() : "Rider",
      contact: d?.phone || d?.email || "",
      id: d?._id ?? (typeof p.driverId === "string" ? p.driverId : ""),
    };
  }
  const v = typeof p.vendorId === "object" && p.vendorId ? p.vendorId : null;
  return {
    role: "vendor" as const,
    roleLabel: "Vendor",
    name: v ? `${v.firstName} ${v.lastName}`.trim() : "Vendor",
    contact: v?.email || "",
    id: v?._id ?? (typeof p.vendorId === "string" ? p.vendorId : ""),
  };
};

const pendingVendorInfo = (v: PendingVendor) => {
  const user = typeof v.userId === "object" && v.userId ? v.userId : null;
  return {
    id: user?._id ?? (typeof v.userId === "string" ? v.userId : ""),
    name:
      v.businessName ||
      (user ? `${user.firstName} ${user.lastName}`.trim() : "Unknown vendor"),
    email: user?.email ?? "",
  };
};

const pendingDriverInfo = (d: PendingDriver) => {
  const user = typeof d.userId === "object" && d.userId ? d.userId : null;
  return {
    id: user?._id ?? (typeof d.userId === "string" ? d.userId : ""),
    name: user ? `${user.firstName} ${user.lastName}`.trim() : "Unknown rider",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  };
};

export default function PayoutsPage() {
  const [activeTab, setActiveTab] = useState<"payouts" | "cod">("payouts");
  const [pendingSubTab, setPendingSubTab] = useState<"vendors" | "drivers">("vendors");

  // Payouts state
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingVendors, setPendingVendors] = useState<PendingVendor[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<PendingDriver[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingVendorTotal, setPendingVendorTotal] = useState(0);
  const [pendingDriverTotal, setPendingDriverTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "vendor" | "driver">("all");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [initiatingId, setInitiatingId] = useState<string | null>(null);

  // Single-process dialog
  const [processTarget, setProcessTarget] = useState<Payout | null>(null);
  const [processRef, setProcessRef] = useState("");

  // Batch-process dialog
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchRef, setBatchRef] = useState("");

  // COD Reconciliation state
  const [codData, setCodData] = useState<CodReconciliationData | null>(null);
  const [codLoading, setCodLoading] = useState(false);

  const fetchPayouts = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page: p, limit: 20 };
        if (status !== "all") params.status = status;
        if (roleFilter !== "all") params.recipientRole = roleFilter;
        const res = await adminService.listPayouts(params);
        const d = (res.data as ApiResponse).data;
        setPayouts(d.payouts);
        setTotal(d.pagination.total);
        setTotalPages(d.pagination.pages);
        setPage(d.pagination.page);
        setPendingVendors(d.pendingVendors ?? []);
        setPendingDrivers(d.pendingDrivers ?? []);
        setPendingTotal(d.pendingTotal ?? 0);
        setPendingVendorTotal(d.pendingVendorTotal ?? 0);
        setPendingDriverTotal(d.pendingDriverTotal ?? 0);
        setSelectedIds(new Set());
      } catch {
        toast.error("Failed to load payouts");
      } finally {
        setLoading(false);
      }
    },
    [status, roleFilter],
  );

  const fetchCodReconciliation = useCallback(async () => {
    setCodLoading(true);
    try {
      const res = await paymentService.getCodReconciliation();
      if (res.success && res.data) {
        setCodData(res.data);
      } else {
        toast.error(res.message || "Failed to load COD reconciliation");
      }
    } catch {
      toast.error("Failed to load COD reconciliation");
    } finally {
      setCodLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "payouts") {
      fetchPayouts(1);
    } else {
      fetchCodReconciliation();
    }
  }, [activeTab, fetchPayouts, fetchCodReconciliation]);

  const initiateVendorPayout = async (vendorId: string) => {
    if (!vendorId) return;
    setInitiatingId(vendorId);
    try {
      await adminService.createPayout({ vendorId, recipientRole: "vendor" });
      toast.success("Vendor payout initiated");
      await fetchPayouts(page);
    } catch {
      toast.error("Failed to initiate vendor payout");
    } finally {
      setInitiatingId(null);
    }
  };

  const initiateDriverPayout = async (driverId: string) => {
    if (!driverId) return;
    setInitiatingId(driverId);
    try {
      await adminService.createPayout({ driverId, recipientRole: "driver" });
      toast.success("Rider cashout initiated");
      await fetchPayouts(page);
    } catch {
      toast.error("Failed to initiate rider cashout");
    } finally {
      setInitiatingId(null);
    }
  };

  const submitProcess = async () => {
    if (!processTarget) return;
    setBusy(true);
    try {
      await adminService.processPayout(processTarget._id, {
        transactionRef: processRef.trim() || undefined,
      });
      toast.success("Payout processed");
      setProcessTarget(null);
      setProcessRef("");
      await fetchPayouts(page);
    } catch {
      toast.error("Failed to process payout");
    } finally {
      setBusy(false);
    }
  };

  const submitBatch = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBusy(true);
    try {
      await adminService.batchProcessPayouts({
        ids,
        transactionRef: batchRef.trim() || undefined,
      });
      toast.success(`${ids.length} payouts processed`);
      setBatchOpen(false);
      setBatchRef("");
      await fetchPayouts(page);
    } catch {
      toast.error("Failed to process payouts");
    } finally {
      setBusy(false);
    }
  };

  const selectableIds = payouts.filter((p) => p.status !== "completed").map((p) => p._id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const toggleAll = (checked: boolean) =>
    setSelectedIds(checked ? new Set(selectableIds) : new Set());

  const toggleOne = (id: string, checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const exportCsv = () =>
    exportToCsv("payouts", payouts, [
      { key: "role", header: "Role", value: (p) => payoutRecipient(p).roleLabel },
      { key: "recipient", header: "Recipient", value: (p) => payoutRecipient(p).name },
      { key: "contact", header: "Contact", value: (p) => payoutRecipient(p).contact },
      { key: "amount", header: "Amount", value: (p) => String(p.amount) },
      { key: "status", header: "Status", value: (p) => p.status },
      { key: "method", header: "Method", value: (p) => p.method ?? "" },
      { key: "created", header: "Requested", value: (p) => formatDate(p.createdAt) },
      { key: "processed", header: "Processed", value: (p) => (p.processedAt ? formatDate(p.processedAt) : "") },
      { key: "ref", header: "Transaction Ref", value: (p) => p.transactionRef ?? "" },
    ]);

  const columns: DataTableColumn<Payout>[] = [
    {
      key: "select",
      header: (
        <Checkbox
          checked={allSelected}
          onCheckedChange={(c) => toggleAll(Boolean(c))}
          aria-label="Select all payouts"
        />
      ),
      render: (p) =>
        p.status === "completed" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedIds.has(p._id)}
              onCheckedChange={(c) => toggleOne(p._id, Boolean(c))}
              aria-label="Select payout"
            />
          </div>
        ),
    },
    {
      key: "recipient",
      header: "Recipient",
      render: (p) => {
        const r = payoutRecipient(p);
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                r.role === "driver"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
              }`}
              title={r.roleLabel}
            >
              {r.role === "driver" ? (
                <Bike className="h-3.5 w-3.5" />
              ) : (
                <Store className="h-3.5 w-3.5" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate font-medium text-foreground">{r.name}</p>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-semibold px-1 py-0 h-4"
                >
                  {r.roleLabel}
                </Badge>
              </div>
              {r.contact && (
                <p className="truncate text-xs text-muted-foreground">{r.contact}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (p) => (
        <span className="font-semibold text-foreground">{formatCurrency(p.amount)}</span>
      ),
    },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "method",
      header: "Method",
      render: (p) => (
        <span className="text-xs capitalize text-muted-foreground">
          {p.method ? p.method.replace(/_/g, " ") : "—"}
        </span>
      ),
    },
    {
      key: "created",
      header: "Requested",
      render: (p) => (
        <span className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</span>
      ),
    },
    {
      key: "ref",
      header: "Ref",
      render: (p) => (
        <span className="font-mono text-xs text-muted-foreground">{p.transactionRef ?? "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) =>
        p.status !== "completed" ? (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setProcessTarget(p);
                setProcessRef("");
              }}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Process
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Finance & Disbursements"
        description="Manage vendor payouts, rider cashouts, and cash-on-delivery reconciliation."
        actions={
          activeTab === "payouts" ? (
            <>
              {selectedIds.size > 0 && (
                <Button variant="brand" size="sm" onClick={() => setBatchOpen(true)}>
                  Process selected ({selectedIds.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!payouts.length}>
                <Download className="mr-1.5 h-4 w-4" /> Export CSV
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCodReconciliation}
              disabled={codLoading}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${codLoading ? "animate-spin" : ""}`} /> Refresh COD
            </Button>
          )
        }
      />

      {/* Primary Switcher: Payouts vs COD Reconciliation */}
      <SegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: "payouts", label: "Payouts & Disbursements", count: total },
          {
            value: "cod",
            label: "COD Cash Reconciliation",
            count: codData?.summary.outstandingCod ? 1 : undefined,
          },
        ]}
      />

      {activeTab === "payouts" ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard
              label="Total Pending Balances"
              value={formatCurrency(pendingTotal)}
              icon={Wallet}
              accent="brand"
              loading={loading}
            />
            <StatCard
              label="Pending Vendor Payouts"
              value={formatCurrency(pendingVendorTotal)}
              icon={Store}
              loading={loading}
            />
            <StatCard
              label="Pending Rider Cashouts"
              value={formatCurrency(pendingDriverTotal)}
              icon={Bike}
              loading={loading}
            />
            <StatCard
              label="Disbursement Records"
              value={total}
              icon={CheckCircle2}
              loading={loading}
            />
          </div>

          {/* Pending Balances Section with Tabs for Vendors vs Riders */}
          <SectionCard
            title="Awaiting Disbursement"
            description="Initiate a payout or cashout for pending partner balances."
          >
            <div className="mb-4">
              <SegmentedTabs
                value={pendingSubTab}
                onChange={setPendingSubTab}
                options={[
                  {
                    value: "vendors",
                    label: "Vendors Awaiting Payout",
                    count: pendingVendors.length,
                  },
                  {
                    value: "drivers",
                    label: "Riders Awaiting Cashout",
                    count: pendingDrivers.length,
                  },
                ]}
              />
            </div>

            {pendingSubTab === "vendors" ? (
              pendingVendors.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No pending vendor balances"
                  description="All eligible vendor balances have been settled."
                  className="border-0 py-6"
                />
              ) : (
                <div className="divide-y divide-border">
                  {pendingVendors.map((v) => {
                    const info = pendingVendorInfo(v);
                    return (
                      <div
                        key={v._id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                            <Store className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{info.name}</p>
                            {info.email && (
                              <p className="truncate text-xs text-muted-foreground">{info.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {formatCurrency(v.pendingPayout)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(v.totalEarnings)} earned
                            </p>
                          </div>
                          <Button
                            variant="brand"
                            size="sm"
                            disabled={!info.id || initiatingId === info.id}
                            onClick={() => initiateVendorPayout(info.id)}
                          >
                            {initiatingId === info.id ? "Initiating…" : "Initiate payout"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              pendingDrivers.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No pending rider cashouts"
                  description="All rider delivery earnings and tips have been settled."
                  className="border-0 py-6"
                />
              ) : (
                <div className="divide-y divide-border">
                  {pendingDrivers.map((d) => {
                    const info = pendingDriverInfo(d);
                    return (
                      <div
                        key={d._id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                            <Bike className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{info.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {info.phone || info.email || "Rider Partner"}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {formatCurrency(d.pendingPayout)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(d.totalEarnings)} earned
                            </p>
                          </div>
                          <Button
                            variant="brand"
                            size="sm"
                            disabled={!info.id || initiatingId === info.id}
                            onClick={() => initiateDriverPayout(info.id)}
                          >
                            {initiatingId === info.id ? "Initiating…" : "Initiate cashout"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </SectionCard>

          {/* Payout History Section */}
          <SectionCard title="Disbursement History" flush>
            <div className="border-b border-border px-5 py-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Role:</span>
                <Select
                  value={roleFilter}
                  onValueChange={(v) => setRoleFilter(v as "all" | "vendor" | "driver")}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="vendor">Vendors only</SelectItem>
                    <SelectItem value="driver">Riders only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {PAYOUT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DataTable
              columns={columns}
              data={payouts}
              getRowId={(p) => p._id}
              loading={loading}
              emptyState={
                <EmptyState
                  icon={Wallet}
                  title="No disbursements found"
                  description="No payout or cashout records match this filter."
                  className="border-0"
                />
              }
              pagination={{ page, pages: totalPages, total, onPageChange: (p) => fetchPayouts(p) }}
            />
          </SectionCard>
        </>
      ) : (
        /* COD Reconciliation View */
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard
              label="Delivered COD Orders"
              value={codData?.summary.totalOrders ?? 0}
              icon={Banknote}
              loading={codLoading}
            />
            <StatCard
              label="Cash Collected by Riders"
              value={formatCurrency(codData?.summary.totalCollected ?? 0)}
              icon={Wallet}
              accent="brand"
              loading={codLoading}
            />
            <StatCard
              label="Total Remitted Online"
              value={formatCurrency(codData?.summary.totalRemitted ?? 0)}
              icon={CheckCircle2}
              loading={codLoading}
            />
            <StatCard
              label="Outstanding Cash in Hand"
              value={formatCurrency(codData?.summary.outstandingCod ?? 0)}
              icon={AlertTriangle}
              accent={codData?.summary.outstandingCod ? "brand" : undefined}
              loading={codLoading}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* COD Delivered Orders Table */}
            <SectionCard
              title="Recent COD Deliveries"
              description="Orders delivered with Cash on Delivery payment"
              flush
            >
              <div className="divide-y divide-border overflow-x-auto max-h-[480px]">
                {!codData?.codOrders.length ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No COD deliveries recorded yet.
                  </div>
                ) : (
                  codData.codOrders.map((order) => (
                    <div
                      key={order._id}
                      className="flex items-center justify-between p-3.5 text-sm hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            #{order.orderNumber}
                          </span>
                          <Badge
                            variant={order.codCollected ? "default" : "destructive"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {order.codCollected ? "Cash Collected" : "Pending Collection"}
                          </Badge>
                          {order.codRemitted && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300"
                            >
                              Remitted
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Rider: {order.driverId?.firstName} {order.driverId?.lastName}
                          {order.driverId?.phone ? ` (${order.driverId.phone})` : ""}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(order.actualDeliveryTime || order.createdAt)}
                        </p>
                      </div>
                      <span className="font-bold text-foreground shrink-0">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>

            {/* Online Remittances Table */}
            <SectionCard
              title="Rider Cash Remittances"
              description="Rider-to-platform digital settlement transactions"
              flush
            >
              <div className="divide-y divide-border overflow-x-auto max-h-[480px]">
                {!codData?.remittances.length ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No remittance deposits received yet.
                  </div>
                ) : (
                  codData.remittances.map((remit) => (
                    <div
                      key={remit._id}
                      className="flex items-center justify-between p-3.5 text-sm hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {remit.transactionId}
                          </span>
                          <StatusBadge status={remit.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Rider: {remit.payerId?.firstName} {remit.payerId?.lastName}
                          {remit.payerId?.phone ? ` (${remit.payerId.phone})` : ""}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Method: {remit.paymentMethod} • {formatDate(remit.createdAt)}
                        </p>
                      </div>
                      <span className="font-bold text-emerald-600 shrink-0">
                        +{formatCurrency(remit.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Single process modal */}
      <FormDialog
        open={!!processTarget}
        onOpenChange={(o) => !o && setProcessTarget(null)}
        title="Process Disbursement"
        description={
          processTarget
            ? `Mark ${formatCurrency(processTarget.amount)} for ${
                payoutRecipient(processTarget).name
              } (${payoutRecipient(processTarget).roleLabel}) as completed. Ensure payment transfer has been verified.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setProcessTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="brand" onClick={submitProcess} disabled={busy}>
              {busy ? "Processing…" : "Mark as Processed"}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="process-ref">Transaction reference (optional)</Label>
          <Input
            id="process-ref"
            value={processRef}
            onChange={(e) => setProcessRef(e.target.value)}
            placeholder="e.g. Bank Ref / bKash TrxID / Cash Voucher"
          />
        </div>
      </FormDialog>

      {/* Batch process modal */}
      <FormDialog
        open={batchOpen}
        onOpenChange={(o) => !o && setBatchOpen(false)}
        title={`Process ${selectedIds.size} Disbursements`}
        description="Mark all selected payouts and cashouts as completed. The transaction reference is applied to each."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setBatchOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="brand" onClick={submitBatch} disabled={busy}>
              {busy ? "Processing…" : "Process selected"}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="batch-ref">Transaction reference (optional)</Label>
          <Input
            id="batch-ref"
            value={batchRef}
            onChange={(e) => setBatchRef(e.target.value)}
            placeholder="Applied to all selected records"
          />
        </div>
      </FormDialog>
    </div>
  );
}
