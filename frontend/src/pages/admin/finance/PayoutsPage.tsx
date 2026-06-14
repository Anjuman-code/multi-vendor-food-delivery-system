import {
  DataTable,
  type DataTableColumn,
  EmptyState,
  exportToCsv,
  FormDialog,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
} from "@/components/admin";
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
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { formatCurrency, formatDate } from "@/utils/format";
import { Banknote, CheckCircle2, Download, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Payout {
  _id: string;
  vendorId: { _id?: string; firstName: string; lastName: string; email: string } | string;
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

interface ApiResponse {
  data: {
    payouts: Payout[];
    pagination: { page: number; pages: number; total: number; limit: number };
    pendingVendors: PendingVendor[];
    pendingTotal: number;
  };
}

const PAYOUT_STATUSES = ["pending", "processing", "completed", "failed"];

const payoutVendor = (p: Payout) =>
  typeof p.vendorId === "object" && p.vendorId
    ? {
        name: `${p.vendorId.firstName} ${p.vendorId.lastName}`.trim(),
        email: p.vendorId.email,
      }
    : { name: "—", email: "" };

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

export default function PayoutsPage() {
  const { toast } = useToast();

  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingVendors, setPendingVendors] = useState<PendingVendor[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("all");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [initiatingId, setInitiatingId] = useState<string | null>(null);

  // Single-process dialog
  const [processTarget, setProcessTarget] = useState<Payout | null>(null);
  const [processRef, setProcessRef] = useState("");

  // Batch-process dialog
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchRef, setBatchRef] = useState("");

  const fetchPayouts = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page: p, limit: 20 };
        if (status !== "all") params.status = status;
        const res = await adminService.listPayouts(params);
        const d = (res.data as ApiResponse).data;
        setPayouts(d.payouts);
        setTotal(d.pagination.total);
        setTotalPages(d.pagination.pages);
        setPage(d.pagination.page);
        setPendingVendors(d.pendingVendors ?? []);
        setPendingTotal(d.pendingTotal ?? 0);
        setSelectedIds(new Set());
      } catch {
        toast({ title: "Failed to load payouts", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [status, toast],
  );

  useEffect(() => {
    fetchPayouts(1);
  }, [fetchPayouts]);

  const initiatePayout = async (vendorId: string) => {
    if (!vendorId) return;
    setInitiatingId(vendorId);
    try {
      await adminService.createPayout({ vendorId });
      toast({ title: "Payout initiated" });
      await fetchPayouts(page);
    } catch {
      toast({ title: "Failed to initiate payout", variant: "destructive" });
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
      toast({ title: "Payout processed" });
      setProcessTarget(null);
      setProcessRef("");
      await fetchPayouts(page);
    } catch {
      toast({ title: "Failed to process payout", variant: "destructive" });
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
      toast({ title: `${ids.length} payouts processed` });
      setBatchOpen(false);
      setBatchRef("");
      await fetchPayouts(page);
    } catch {
      toast({ title: "Failed to process payouts", variant: "destructive" });
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
      { key: "vendor", header: "Vendor", value: (p) => payoutVendor(p).name },
      { key: "email", header: "Email", value: (p) => payoutVendor(p).email },
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
      key: "vendor",
      header: "Vendor",
      render: (p) => {
        const v = payoutVendor(p);
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{v.name}</p>
            {v.email && <p className="truncate text-xs text-muted-foreground">{v.email}</p>}
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
        title="Vendor Payouts"
        description={`${total} payout records`}
        actions={
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
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending Payout Total"
          value={formatCurrency(pendingTotal)}
          icon={Wallet}
          accent="brand"
          loading={loading}
        />
        <StatCard
          label="Vendors Awaiting Payout"
          value={pendingVendors.length}
          icon={Banknote}
          loading={loading}
        />
        <StatCard
          label="Payout Records"
          value={total}
          icon={CheckCircle2}
          loading={loading}
        />
      </div>

      <SectionCard
        title="Vendors awaiting payout"
        description="Initiate a payout for a vendor's pending balance."
      >
        {pendingVendors.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No pending balances"
            description="Every vendor balance has been paid out."
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
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{info.name}</p>
                    {info.email && (
                      <p className="truncate text-xs text-muted-foreground">{info.email}</p>
                    )}
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
                      onClick={() => initiatePayout(info.id)}
                    >
                      {initiatingId === info.id ? "Initiating…" : "Initiate payout"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Payout history" flush>
        <div className="border-b border-border px-5 py-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]">
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
        <DataTable
          columns={columns}
          data={payouts}
          getRowId={(p) => p._id}
          loading={loading}
          emptyState={
            <EmptyState
              icon={Wallet}
              title="No payouts found"
              description="No payout records match this filter."
              className="border-0"
            />
          }
          pagination={{ page, pages: totalPages, total, onPageChange: (p) => fetchPayouts(p) }}
        />
      </SectionCard>

      {/* Single process */}
      <FormDialog
        open={!!processTarget}
        onOpenChange={(o) => !o && setProcessTarget(null)}
        title="Process payout"
        description={
          processTarget
            ? `Mark ${formatCurrency(processTarget.amount)} for ${payoutVendor(processTarget).name} as completed. Ensure the transfer has been made.`
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
            placeholder="e.g. bank transfer / bKash TrxID"
          />
        </div>
      </FormDialog>

      {/* Batch process */}
      <FormDialog
        open={batchOpen}
        onOpenChange={(o) => !o && setBatchOpen(false)}
        title={`Process ${selectedIds.size} payouts`}
        description="Mark all selected payouts as completed. The transaction reference is applied to each."
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
            placeholder="Applied to all selected payouts"
          />
        </div>
      </FormDialog>
    </div>
  );
}
