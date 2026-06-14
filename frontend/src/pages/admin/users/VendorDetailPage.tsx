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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { formatCurrency, formatDate, formatPercent } from "@/utils/format";
import {
  Building2,
  CheckCircle2,
  Percent,
  ShieldCheck,
  Store,
  UserX,
  Wallet,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

interface VendorRestaurant {
  _id: string;
  name: string;
  approvalStatus: "pending" | "approved" | "rejected";
  isActive?: boolean;
  totalOrders?: number;
}

interface VendorDetail {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  isSuspended: boolean;
  suspendedReason?: string;
  createdAt: string;
  vendorProfile?: {
    businessName?: string;
    isVerified: boolean;
    commissionRate?: number;
    totalEarnings?: number;
    pendingPayout?: number;
    totalRestaurants: number;
  };
  restaurants: VendorRestaurant[];
}

type DialogType = "verify" | "reject" | "suspend" | "unsuspend" | "commission";

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogType | null>(null);
  const [rateInput, setRateInput] = useState("");
  const [rateReason, setRateReason] = useState("");
  const [rateLoading, setRateLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminService.getVendor(id);
      const data = (
        res.data as {
          data: {
            user: {
              _id: string;
              firstName: string;
              lastName: string;
              email: string;
              phoneNumber?: string;
              isSuspended: boolean;
              suspendedReason?: string;
              createdAt: string;
            };
            vendorProfile: {
              businessName?: string;
              isVerified: boolean;
              commissionRate?: number;
              totalEarnings?: number;
              pendingPayout?: number;
              restaurantIds?: string[];
            } | null;
            restaurants: VendorRestaurant[];
          };
        }
      ).data;
      const vp = data.vendorProfile;
      setVendor({
        _id: data.user._id,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email,
        phoneNumber: data.user.phoneNumber,
        isSuspended: data.user.isSuspended,
        suspendedReason: data.user.suspendedReason,
        createdAt: data.user.createdAt,
        vendorProfile: vp
          ? {
              businessName: vp.businessName,
              isVerified: vp.isVerified,
              commissionRate: vp.commissionRate,
              totalEarnings: vp.totalEarnings,
              pendingPayout: vp.pendingPayout,
              totalRestaurants: vp.restaurantIds?.length ?? data.restaurants.length,
            }
          : undefined,
        restaurants: data.restaurants ?? [],
      });
      setRateInput(String(vp?.commissionRate ?? 15));
    } catch {
      toast({ title: "Failed to load vendor", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleVerify = async () => {
    if (!id) return;
    try {
      await adminService.verifyVendor(id, { action: "approve" });
      toast({ title: "Vendor verified" });
      await load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleReject = async (reason?: string) => {
    if (!id) return;
    try {
      await adminService.verifyVendor(id, { action: "reject", reason });
      toast({ title: "Vendor rejected" });
      await load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleSuspend = async (reason?: string) => {
    if (!id) return;
    try {
      await adminService.suspendVendor(id, { reason: reason! });
      toast({ title: "Vendor suspended" });
      await load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleUnsuspend = async (reason?: string) => {
    if (!id) return;
    try {
      await adminService.unsuspendVendor(id, { reason: reason! });
      toast({ title: "Vendor unsuspended" });
      await load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleCommission = async () => {
    if (!id) return;
    const rate = parseFloat(rateInput);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      toast({ title: "Enter a rate between 0 and 100", variant: "destructive" });
      return;
    }
    if (rateReason.trim().length < 3) {
      toast({ title: "Provide a reason for the change", variant: "destructive" });
      return;
    }
    setRateLoading(true);
    try {
      await adminService.changeVendorCommission(id, { rate, reason: rateReason.trim() });
      toast({ title: "Commission rate updated" });
      setRateReason("");
      setDialog(null);
      await load();
    } catch {
      toast({ title: "Failed to update commission", variant: "destructive" });
    } finally {
      setRateLoading(false);
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

  if (!vendor) {
    return (
      <EmptyState
        icon={Building2}
        title="Vendor not found"
        description="This vendor may have been removed."
        action={{ label: "Back to vendors", onClick: () => history.back() }}
      />
    );
  }

  const vp = vendor.vendorProfile;
  const status: { label: string; tone: StatusTone } = vendor.isSuspended
    ? { label: "Suspended", tone: "warning" }
    : vp?.isVerified
      ? { label: "Verified", tone: "success" }
      : { label: "Pending Verification", tone: "neutral" };

  const restaurantTone = (s: string): StatusTone =>
    s === "approved" ? "success" : s === "pending" ? "warning" : "danger";

  return (
    <div className="space-y-5">
      <DetailHeader
        backTo="/admin/users/vendors"
        backLabel="Vendors"
        title={vp?.businessName ?? `${vendor.firstName} ${vendor.lastName}`}
        subtitle={vendor.email}
        icon={Building2}
        badges={<StatusBadge label={status.label} tone={status.tone} />}
        actions={
          <>
            {!vp?.isVerified && (
              <>
                <Button variant="brand" size="sm" onClick={() => setDialog("verify")}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Verify
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDialog("reject")}>
                  Reject
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => setDialog("commission")}>
              <Percent className="mr-1.5 h-4 w-4" /> Commission
            </Button>
            {vendor.isSuspended ? (
              <Button variant="outline" size="sm" onClick={() => setDialog("unsuspend")}>
                <ShieldCheck className="mr-1.5 h-4 w-4" /> Unsuspend
              </Button>
            ) : (
              <Button variant="destructive" size="sm" onClick={() => setDialog("suspend")}>
                <UserX className="mr-1.5 h-4 w-4" /> Suspend
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Commission" value={formatPercent(vp?.commissionRate ?? 0)} icon={Percent} accent="brand" />
        <StatCard label="Restaurants" value={vp?.totalRestaurants ?? 0} icon={Store} />
        <StatCard label="Total Earnings" value={formatCurrency(vp?.totalEarnings ?? 0)} icon={Wallet} />
        <StatCard label="Pending Payout" value={formatCurrency(vp?.pendingPayout ?? 0)} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Profile" className="lg:col-span-1">
          <KeyValueList
            columns={1}
            items={[
              { label: "Business", value: vp?.businessName ?? "—" },
              { label: "Owner", value: `${vendor.firstName} ${vendor.lastName}` },
              { label: "Email", value: vendor.email },
              { label: "Phone", value: vendor.phoneNumber ?? "—" },
              { label: "Joined", value: formatDate(vendor.createdAt) },
            ]}
          />
          {vendor.isSuspended && vendor.suspendedReason && (
            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
              <p className="mb-1 font-bold">Suspension reason</p>
              <p>{vendor.suspendedReason}</p>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Restaurants" className="lg:col-span-2" flush={!!vendor.restaurants.length}>
          {vendor.restaurants.length ? (
            <div className="divide-y divide-border">
              {vendor.restaurants.map((r) => (
                <div key={r._id} className="flex items-center gap-3 px-5 py-3">
                  <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Link
                    to={`/admin/restaurants/${r._id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:underline"
                  >
                    {r.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">{r.totalOrders ?? 0} orders</span>
                  <StatusBadge label={r.approvalStatus} tone={restaurantTone(r.approvalStatus)} size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Store} title="No restaurants" description="This vendor has not listed any restaurants yet." className="border-0 py-8" />
          )}
        </SectionCard>
      </div>

      {/* Action dialogs */}
      <ConfirmDialog open={dialog === "verify"} onClose={() => setDialog(null)} onConfirm={handleVerify}
        title="Verify this vendor?" description="The vendor will gain full access to listing restaurants and receiving payouts."
        confirmLabel="Verify" destructive={false} />
      <ConfirmDialog open={dialog === "reject"} onClose={() => setDialog(null)} onConfirm={handleReject}
        title="Reject this vendor?" description="The vendor application will be rejected. Provide a reason for the audit log."
        confirmLabel="Reject" requireReason reasonPlaceholder="Reason for rejection…" destructive />
      <ConfirmDialog open={dialog === "suspend"} onClose={() => setDialog(null)} onConfirm={handleSuspend}
        title="Suspend this vendor?" description="All of their restaurants will be temporarily closed until unsuspended."
        confirmLabel="Suspend" requireReason reasonPlaceholder="Reason for suspension…" destructive={false} />
      <ConfirmDialog open={dialog === "unsuspend"} onClose={() => setDialog(null)} onConfirm={handleUnsuspend}
        title="Unsuspend this vendor?" description="The vendor regains access and their restaurants will reopen."
        confirmLabel="Unsuspend" requireReason reasonPlaceholder="Reason for lifting the suspension…" destructive={false} />

      {/* Commission change */}
      <FormDialog
        open={dialog === "commission"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Change Commission Rate"
        description="Set the platform commission percentage charged on this vendor's orders."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={rateLoading}>
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={handleCommission}
              disabled={rateLoading || !rateInput || rateReason.trim().length < 3}
            >
              {rateLoading ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rate">Commission rate (%)</Label>
            <Input
              id="rate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              placeholder="e.g. 15"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rate-reason">Reason</Label>
            <Textarea
              id="rate-reason"
              value={rateReason}
              onChange={(e) => setRateReason(e.target.value)}
              placeholder="Reason for the rate change…"
              rows={2}
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
