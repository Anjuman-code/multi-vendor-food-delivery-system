import {
  ConfirmDialog,
  EmptyState,
  PageHeader,
  SectionCard,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { formatRelativeTime } from "@/utils/format";
import {
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  Store,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface OperatingHour {
  day: string;
  openTime: string;
  closeTime: string;
  isOpen?: boolean;
}

interface QueueItem {
  _id: string;
  name: string;
  cuisineType: string[];
  address: { street?: string; area: string; district: string };
  contactInfo?: { phone?: string; email?: string; website?: string };
  images?: { logo?: string; coverPhoto?: string };
  operatingHours?: OperatingHour[];
  createdAt: string;
}

const daysSince = (d: string) =>
  Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);

export default function ApprovalQueuePage() {
  const { toast } = useToast();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<QueueItem | null>(null);
  const [dialog, setDialog] = useState<"approve" | "reject" | "bulk" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.getApprovalQueue();
      setItems((res.data as { data: { restaurants: QueueItem[] } }).data.restaurants);
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Failed to load approval queue", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSelect = (id: string, checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const toggleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? new Set(items.map((i) => i._id)) : new Set());

  const handleApprove = async () => {
    if (!target) return;
    try {
      await adminService.approveRestaurant(target._id);
      toast({ title: "Approved", description: `${target.name} is now live.` });
      await load();
    } catch {
      toast({ title: "Approval failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleReject = async (reason?: string) => {
    if (!target) return;
    try {
      await adminService.rejectRestaurant(target._id, { reason: reason! });
      toast({ title: "Rejected", description: "Application rejected." });
      await load();
    } catch {
      toast({ title: "Rejection failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleBulkApprove = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBusy(true);
    let ok = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await adminService.approveRestaurant(id);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    setBusy(false);
    setDialog(null);
    toast({
      title: `Approved ${ok} of ${ids.length}`,
      description: failed ? `${failed} could not be approved.` : undefined,
      variant: failed ? "destructive" : undefined,
    });
    await load();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Restaurant Approval Queue"
        description={`${items.length} application${items.length === 1 ? "" : "s"} pending review`}
        actions={
          items.length > 0 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSelectAll(!allSelected)}
                disabled={loading}
              >
                {allSelected ? "Clear selection" : "Select all"}
              </Button>
              <Button
                variant="brand"
                size="sm"
                onClick={() => setDialog("bulk")}
                disabled={selectedIds.size === 0}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Approve selected ({selectedIds.size})
              </Button>
            </>
          ) : undefined
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up!"
          description="No pending restaurant applications."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const age = daysSince(item.createdAt);
            const checked = selectedIds.has(item._id);
            return (
              <SectionCard key={item._id} className={checked ? "ring-2 ring-brand-500" : undefined}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => toggleSelect(item._id, c === true)}
                    aria-label={`Select ${item.name}`}
                    className="mt-1"
                  />
                  {item.images?.logo ? (
                    <img
                      src={item.images.logo}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-xl border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <Store className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/admin/restaurants/${item._id}`}
                      className="truncate text-sm font-bold text-foreground hover:text-brand-500"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {item.address?.area}
                        {item.address?.district ? `, ${item.address.district}` : ""}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      age > 3 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                    }`}
                    title={`Submitted ${formatRelativeTime(item.createdAt)}`}
                  >
                    <Clock className="h-3 w-3" />
                    {age}d
                  </span>
                </div>

                {item.cuisineType?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {item.cuisineType.slice(0, 4).map((c) => (
                      <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {item.contactInfo?.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 shrink-0" />
                      {item.contactInfo.phone}
                    </p>
                  )}
                  {item.contactInfo?.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.contactInfo.email}</span>
                    </p>
                  )}
                  {item.operatingHours && item.operatingHours.length > 0 && (
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 shrink-0" />
                      {item.operatingHours.length} day
                      {item.operatingHours.length === 1 ? "" : "s"} of hours set
                    </p>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => { setTarget(item); setDialog("approve"); }}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => { setTarget(item); setDialog("reject"); }}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" /> Reject
                  </Button>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
        onConfirm={handleApprove}
        title={`Approve ${target?.name}?`}
        description="The restaurant will go live and customers can place orders."
        confirmLabel="Approve Restaurant"
        destructive={false}
      />
      <ConfirmDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        onConfirm={handleReject}
        title={`Reject ${target?.name}?`}
        description="Please provide a reason that will be communicated to the vendor."
        confirmLabel="Reject"
        requireReason
        reasonPlaceholder="Reason for rejection…"
        destructive
      />
      <ConfirmDialog
        open={dialog === "bulk"}
        onClose={() => !busy && setDialog(null)}
        onConfirm={handleBulkApprove}
        title={`Approve ${selectedIds.size} restaurant${selectedIds.size === 1 ? "" : "s"}?`}
        description="Each selected application will go live and customers can place orders."
        confirmLabel={busy ? "Approving…" : "Approve all"}
        destructive={false}
      />
    </div>
  );
}
