import {
  ConfirmDialog,
  DetailHeader,
  EmptyState,
  FormDialog,
  KeyValueList,
  SectionCard,
  StatCard,
  StatusBadge,
  type StatusTone,
} from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/utils/format";
import {
  Ban,
  CheckCircle2,
  Gift,
  Mail,
  Package,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

interface CustomerDetail {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    isActive: boolean;
    isEmailVerified: boolean;
    isSuspended: boolean;
    isBanned: boolean;
    bannedReason?: string;
    suspendedReason?: string;
    createdAt: string;
    lastLogin?: string;
  };
  customerProfile?: {
    loyaltyPoints: number;
    totalOrders: number;
    totalSpent: number;
    tier: string;
  };
  recentOrders?: Array<{
    _id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
    restaurantId?: { name: string };
  }>;
}

type DialogType = "suspend" | "unsuspend" | "ban" | "unban" | "loyalty";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogType | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState("");
  const [loyaltyReason, setLoyaltyReason] = useState("");
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminService.getCustomer(id);
      setDetail((res.data as { data: CustomerDetail }).data);
    } catch {
      toast({ title: "Failed to load customer", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleAction = async (reason?: string) => {
    if (!id || !dialog) return;
    const map: Record<string, () => Promise<unknown>> = {
      suspend: () => adminService.suspendCustomer(id, { reason: reason! }),
      unsuspend: () => adminService.unsuspendCustomer(id, { reason: reason! }),
      ban: () => adminService.banCustomer(id, { reason: reason! }),
      unban: () => adminService.unbanCustomer(id, { reason: reason! }),
    };
    try {
      await map[dialog]();
      toast({ title: "Customer updated" });
      await load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleLoyalty = async () => {
    if (!id) return;
    const pts = parseInt(loyaltyPoints, 10);
    if (Number.isNaN(pts) || pts === 0 || loyaltyReason.trim().length < 3) {
      toast({ title: "Enter a non-zero amount and a reason", variant: "destructive" });
      return;
    }
    setLoyaltyLoading(true);
    try {
      await adminService.adjustLoyalty(id, { points: pts, reason: loyaltyReason.trim() });
      toast({ title: `Loyalty adjusted by ${pts > 0 ? "+" : ""}${pts}` });
      setLoyaltyPoints("");
      setLoyaltyReason("");
      setDialog(null);
      await load();
    } catch {
      toast({ title: "Failed to adjust points", variant: "destructive" });
    } finally {
      setLoyaltyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <EmptyState
        icon={UserX}
        title="Customer not found"
        description="This customer may have been removed."
        action={{ label: "Back to customers", onClick: () => history.back() }}
      />
    );
  }

  const { user, customerProfile, recentOrders } = detail;
  const fullName = `${user.firstName} ${user.lastName}`;
  const status: { label: string; tone: StatusTone } = user.isBanned
    ? { label: "Banned", tone: "danger" }
    : user.isSuspended
      ? { label: "Suspended", tone: "warning" }
      : user.isActive
        ? { label: "Active", tone: "success" }
        : { label: "Inactive", tone: "neutral" };

  return (
    <div className="space-y-5">
      <DetailHeader
        backTo="/admin/users/customers"
        backLabel="Customers"
        title={fullName}
        subtitle={user.email}
        avatar={
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-foreground">
            {user.firstName.charAt(0)}
            {user.lastName.charAt(0)}
          </span>
        }
        badges={<StatusBadge label={status.label} tone={status.tone} />}
        actions={
          <>
            {!user.isBanned && !user.isSuspended && (
              <Button variant="outline" size="sm" onClick={() => setDialog("suspend")}>
                <UserX className="mr-1.5 h-4 w-4" /> Suspend
              </Button>
            )}
            {user.isSuspended && (
              <Button variant="outline" size="sm" onClick={() => setDialog("unsuspend")}>
                <ShieldCheck className="mr-1.5 h-4 w-4" /> Unsuspend
              </Button>
            )}
            {!user.isBanned ? (
              <Button variant="destructive" size="sm" onClick={() => setDialog("ban")}>
                <Ban className="mr-1.5 h-4 w-4" /> Ban
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setDialog("unban")}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Unban
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Profile" className="lg:col-span-1">
          <KeyValueList
            columns={1}
            items={[
              {
                label: "Email",
                value: (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {user.email}
                    {user.isEmailVerified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  </span>
                ),
              },
              { label: "Phone", value: user.phoneNumber ?? "—" },
              { label: "Joined", value: formatDate(user.createdAt) },
              { label: "Last login", value: user.lastLogin ? formatDateTime(user.lastLogin) : "Never" },
              { label: "Tier", value: customerProfile?.tier ?? "—" },
            ]}
          />
          {(user.bannedReason || user.suspendedReason) && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">
              <p className="mb-1 font-bold">{user.isBanned ? "Ban reason" : "Suspension reason"}</p>
              <p>{user.isBanned ? user.bannedReason : user.suspendedReason}</p>
            </div>
          )}
        </SectionCard>

        <div className="space-y-4 lg:col-span-2">
          {customerProfile && (
            <SectionCard
              title="Loyalty & Lifetime Value"
              actions={
                <Button variant="outline" size="sm" onClick={() => setDialog("loyalty")}>
                  <Gift className="mr-1.5 h-4 w-4" /> Adjust Points
                </Button>
              }
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Loyalty Points" value={formatNumber(customerProfile.loyaltyPoints)} icon={Star} accent="brand" />
                <StatCard label="Total Orders" value={formatNumber(customerProfile.totalOrders)} icon={ShoppingBag} />
                <StatCard label="Total Spent" value={formatCurrency(customerProfile.totalSpent)} icon={Gift} />
                <StatCard label="Tier" value={customerProfile.tier} icon={ShieldCheck} />
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Recent Orders"
            actions={
              recentOrders?.length ? (
                <Link to="/admin/orders" className="text-xs font-medium text-primary hover:underline">
                  View all →
                </Link>
              ) : undefined
            }
            flush={!!recentOrders?.length}
          >
            {recentOrders?.length ? (
              <div className="divide-y divide-border">
                {recentOrders.map((o) => (
                  <Link
                    key={o._id}
                    to={`/admin/orders/${o._id}`}
                    className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs font-semibold text-foreground">#{o.orderNumber}</span>
                      {o.restaurantId?.name && (
                        <span className="ml-2 truncate text-xs text-muted-foreground">{o.restaurantId.name}</span>
                      )}
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(o.createdAt)}</p>
                    </div>
                    <StatusBadge status={o.status} size="sm" />
                    <span className="w-20 shrink-0 text-right font-semibold text-foreground">
                      {formatCurrency(o.total)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon={Package} title="No orders yet" className="border-0 py-8" />
            )}
          </SectionCard>
        </div>
      </div>

      {/* Action dialogs */}
      <ConfirmDialog open={dialog === "suspend"} onClose={() => setDialog(null)} onConfirm={handleAction}
        title={`Suspend ${user.firstName}?`} description="Blocks the customer from placing orders until unsuspended."
        confirmLabel="Suspend" requireReason destructive={false} />
      <ConfirmDialog open={dialog === "unsuspend"} onClose={() => setDialog(null)} onConfirm={handleAction}
        title="Lift suspension?" description="The customer regains full access."
        confirmLabel="Unsuspend" requireReason destructive={false} />
      <ConfirmDialog open={dialog === "ban"} onClose={() => setDialog(null)} onConfirm={handleAction}
        title={`Permanently ban ${user.firstName}?`} description="Blocks the customer from the platform entirely."
        confirmLabel="Ban Customer" requireReason destructive />
      <ConfirmDialog open={dialog === "unban"} onClose={() => setDialog(null)} onConfirm={handleAction}
        title="Lift ban?" description="The customer regains access to the platform."
        confirmLabel="Unban" requireReason destructive={false} />

      {/* Loyalty adjustment */}
      <FormDialog
        open={dialog === "loyalty"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Adjust Loyalty Points"
        description="Use a positive value to grant points, negative to deduct."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={loyaltyLoading}>
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={handleLoyalty}
              disabled={loyaltyLoading || !loyaltyPoints || loyaltyReason.trim().length < 3}
            >
              {loyaltyLoading ? "Saving…" : "Apply"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pts">Points (+ to add, − to deduct)</Label>
            <Input
              id="pts"
              type="number"
              value={loyaltyPoints}
              onChange={(e) => setLoyaltyPoints(e.target.value)}
              placeholder="e.g. 100 or -50"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={loyaltyReason}
              onChange={(e) => setLoyaltyReason(e.target.value)}
              placeholder="Reason for adjustment…"
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
