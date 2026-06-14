import {
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  DetailHeader,
  EmptyState,
  KeyValueList,
  SectionCard,
  SegmentedTabs,
  StatCard,
  StatusBadge,
  type StatusTone,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/format";
import { Bike, CheckCircle2, Package, ShieldCheck, Star, UserX, Wallet, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface DriverDetail {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  isActive: boolean;
  isSuspended: boolean;
  suspendedReason?: string;
  createdAt: string;
  driverProfile?: {
    vehicleType?: string;
    vehicleNumber?: string;
    licenseNumber?: string;
    applicationStatus?: string;
    rejectionReason?: string;
    totalDeliveries?: number;
    completedDeliveries?: number;
    cancelledDeliveries?: number;
    rating?: { average: number; count: number } | number;
    reviewCount?: number;
    totalEarnings?: number;
    pendingEarnings?: number;
    isAvailable?: boolean;
    lastActive?: string;
  };
}

interface Rating {
  _id: string;
  rating: number;
  comment?: string;
  orderId?: { orderNumber?: string } | string | null;
  customerId?: { firstName?: string; lastName?: string } | string | null;
  createdAt: string;
}

type Tab = "info" | "ratings";
type DialogType = "approve" | "reject" | "suspend" | "unsuspend";

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("info");
  const [dialog, setDialog] = useState<DialogType | null>(null);

  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingsPage, setRatingsPage] = useState(1);
  const [ratingsPages, setRatingsPages] = useState(1);
  const [ratingsTotal, setRatingsTotal] = useState(0);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminService.getDriver(id);
      const d = (res.data as { data: { user: DriverDetail; driverProfile: DriverDetail["driverProfile"] } }).data;
      setDriver({ ...d.user, driverProfile: d.driverProfile ?? undefined });
    } catch {
      toast({ title: "Failed to load driver", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const fetchRatings = useCallback(
    async (p = 1) => {
      if (!id) return;
      setRatingsLoading(true);
      try {
        const res = await adminService.getDriverRatings(id, { page: p, limit: 10 });
        const d = (res.data as { data: { ratings: Rating[]; pagination: { total: number; pages: number; page: number } } }).data;
        setRatings(d.ratings);
        setRatingsTotal(d.pagination.total);
        setRatingsPages(d.pagination.pages);
        setRatingsPage(d.pagination.page);
      } catch {
        toast({ title: "Failed to load ratings", variant: "destructive" });
      } finally {
        setRatingsLoading(false);
      }
    },
    [id, toast],
  );

  useEffect(() => {
    if (tab === "ratings") fetchRatings(1);
  }, [tab, fetchRatings]);

  const handleApprove = async () => {
    if (!id) return;
    try {
      await adminService.approveDriver(id);
      toast({ title: "Application approved" });
      await load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleReject = async (reason?: string) => {
    if (!id) return;
    try {
      await adminService.rejectDriver(id, { reason: reason! });
      toast({ title: "Application rejected" });
      await load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleSuspend = async (reason?: string) => {
    if (!id) return;
    try {
      await adminService.suspendDriver(id, { reason: reason! });
      toast({ title: "Driver suspended" });
      await load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleUnsuspend = async (reason?: string) => {
    if (!id) return;
    try {
      await adminService.unsuspendDriver(id, { reason: reason! });
      toast({ title: "Driver unsuspended" });
      await load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!driver) {
    return (
      <EmptyState
        icon={Bike}
        title="Driver not found"
        description="This driver may have been removed."
        action={{ label: "Back to drivers", onClick: () => history.back() }}
      />
    );
  }

  const dp = driver.driverProfile;
  const appStatus = dp?.applicationStatus;
  const isPending = appStatus === "pending";
  const ratingValue = dp?.rating && typeof dp.rating === "object" ? dp.rating.average : (dp?.rating as number | undefined);
  const ratingCount = dp?.rating && typeof dp.rating === "object" ? dp.rating.count : dp?.reviewCount;

  const status: { label: string; tone: StatusTone } = driver.isSuspended
    ? { label: "Suspended", tone: "warning" }
    : isPending
      ? { label: "Pending Application", tone: "neutral" }
      : appStatus === "rejected"
        ? { label: "Rejected", tone: "danger" }
        : dp?.isAvailable
          ? { label: "Available", tone: "success" }
          : { label: "Offline", tone: "neutral" };

  const fullName = `${driver.firstName} ${driver.lastName}`;

  const ratingColumns: DataTableColumn<Rating>[] = [
    {
      key: "stars",
      header: "Rating",
      render: (r) => (
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
          ))}
        </span>
      ),
    },
    {
      key: "comment",
      header: "Comment",
      render: (r) => <span className="text-foreground">{r.comment || <span className="text-muted-foreground">—</span>}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (r) =>
        r.customerId && typeof r.customerId === "object" ? (
          <span className="text-muted-foreground">
            {r.customerId.firstName} {r.customerId.lastName}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "order",
      header: "Order",
      render: (r) =>
        r.orderId && typeof r.orderId === "object" && r.orderId.orderNumber ? (
          <span className="font-mono text-xs text-muted-foreground">#{r.orderId.orderNumber}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "date",
      header: "Date",
      align: "right",
      render: (r) => <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <DetailHeader
        backTo="/admin/users/drivers"
        backLabel="Drivers"
        title={fullName}
        subtitle={driver.email}
        icon={Bike}
        badges={
          <>
            <StatusBadge label={status.label} tone={status.tone} />
            {dp?.vehicleType && <StatusBadge label={dp.vehicleType} tone="info" size="sm" />}
          </>
        }
        actions={
          <>
            {isPending && (
              <>
                <Button variant="brand" size="sm" onClick={() => setDialog("approve")}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDialog("reject")}>
                  <XCircle className="mr-1.5 h-4 w-4" /> Reject
                </Button>
              </>
            )}
            {!isPending &&
              (driver.isSuspended ? (
                <Button variant="outline" size="sm" onClick={() => setDialog("unsuspend")}>
                  <ShieldCheck className="mr-1.5 h-4 w-4" /> Unsuspend
                </Button>
              ) : (
                <Button variant="destructive" size="sm" onClick={() => setDialog("suspend")}>
                  <UserX className="mr-1.5 h-4 w-4" /> Suspend
                </Button>
              ))}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Rating"
          value={
            ratingValue ? (
              <span className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                {ratingValue.toFixed(1)}
                {ratingCount ? <span className="text-sm font-normal text-muted-foreground">({ratingCount})</span> : null}
              </span>
            ) : (
              "—"
            )
          }
          icon={Star}
          accent="brand"
        />
        <StatCard label="Total Deliveries" value={dp?.totalDeliveries ?? 0} icon={Package} />
        <StatCard label="Total Earnings" value={formatCurrency(dp?.totalEarnings ?? 0)} icon={Wallet} />
        <StatCard label="Pending Earnings" value={formatCurrency(dp?.pendingEarnings ?? 0)} icon={Wallet} />
      </div>

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "info", label: "Info" },
          { value: "ratings", label: "Ratings", count: ratingsTotal || undefined },
        ]}
      />

      {tab === "info" ? (
        <SectionCard title="Driver Info">
          <KeyValueList
            items={[
              { label: "Email", value: driver.email },
              { label: "Phone", value: driver.phoneNumber ?? "—" },
              { label: "Vehicle", value: dp?.vehicleType ? <span className="capitalize">{dp.vehicleType}</span> : "—" },
              { label: "Plate", value: dp?.vehicleNumber ?? "—" },
              { label: "License", value: dp?.licenseNumber ?? "—" },
              { label: "Completed", value: dp?.completedDeliveries ?? "—" },
              { label: "Cancelled", value: dp?.cancelledDeliveries ?? "—" },
              { label: "Joined", value: formatDate(driver.createdAt) },
              { label: "Last active", value: dp?.lastActive ? formatDateTime(dp.lastActive) : "—" },
            ]}
          />
          {driver.isSuspended && driver.suspendedReason && (
            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
              <p className="mb-1 font-bold">Suspension reason</p>
              <p>{driver.suspendedReason}</p>
            </div>
          )}
          {appStatus === "rejected" && dp?.rejectionReason && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">
              <p className="mb-1 font-bold">Rejection reason</p>
              <p>{dp.rejectionReason}</p>
            </div>
          )}
        </SectionCard>
      ) : (
        <DataTable
          columns={ratingColumns}
          data={ratings}
          getRowId={(r) => r._id}
          loading={ratingsLoading}
          emptyState={<EmptyState icon={Star} title="No ratings yet" description="This driver has not received any ratings." className="border-0" />}
          pagination={{ page: ratingsPage, pages: ratingsPages, total: ratingsTotal, onPageChange: (p) => fetchRatings(p) }}
        />
      )}

      <ConfirmDialog open={dialog === "approve"} onClose={() => setDialog(null)} onConfirm={handleApprove}
        title="Approve this driver?" description="The driver will be notified and can start accepting deliveries."
        confirmLabel="Approve" destructive={false} />
      <ConfirmDialog open={dialog === "reject"} onClose={() => setDialog(null)} onConfirm={handleReject}
        title="Reject this application?" description="The driver will be notified with the rejection reason."
        confirmLabel="Reject" requireReason reasonPlaceholder="Reason for rejection…" destructive />
      <ConfirmDialog open={dialog === "suspend"} onClose={() => setDialog(null)} onConfirm={handleSuspend}
        title="Suspend this driver?" description="The driver will be unable to accept deliveries until unsuspended."
        confirmLabel="Suspend" requireReason reasonPlaceholder="Reason for suspension…" destructive={false} />
      <ConfirmDialog open={dialog === "unsuspend"} onClose={() => setDialog(null)} onConfirm={handleUnsuspend}
        title="Unsuspend this driver?" description="The driver will regain access to accept deliveries."
        confirmLabel="Unsuspend" requireReason reasonPlaceholder="Reason for lifting the suspension…" destructive={false} />
    </div>
  );
}
