import {
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { formatCurrency, formatNumber } from "@/utils/format";
import {
  CheckCircle2,
  DoorOpen,
  Eye,
  EyeOff,
  PackageX,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  Utensils,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface RestaurantDetail {
  _id: string;
  name: string;
  description?: string;
  address?: { street?: string; area?: string; district?: string };
  contactInfo?: { phone?: string; email?: string; website?: string };
  cuisineType: string[];
  tags: string[];
  approvalStatus: "pending" | "approved" | "rejected";
  isTemporarilyClosed: boolean;
  isFeatured: boolean;
  isActive: boolean;
  rating?: { average: number; count: number };
  rejectionReason?: string;
  closureReason?: string;
  images?: { logo?: string; coverPhoto?: string };
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  cancelled: number;
  delivered: number;
}

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  category?: string;
}

interface Vendor {
  firstName: string;
  lastName: string;
  email: string;
}

type DialogType = "approve" | "reject" | "close" | "reopen" | "deactivate" | null;

const approvalTone: Record<RestaurantDetail["approvalStatus"], StatusTone> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [menuItemCount, setMenuItemCount] = useState(0);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogType>(null);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [approving, setApproving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [rRes, mRes] = await Promise.all([
        adminService.getRestaurant(id),
        adminService.getRestaurantMenu(id),
      ]);
      const rData = (
        rRes.data as {
          data: {
            restaurant: RestaurantDetail;
            orderStats: OrderStats;
            menuItemCount: number;
            vendor: Vendor | null;
          };
        }
      ).data;
      const mData = (
        mRes.data as {
          data: {
            menuItems: Array<{
              _id: string;
              name: string;
              price: number;
              isAvailable: boolean;
              categoryId?: { name: string };
            }>;
          };
        }
      ).data;

      setRestaurant(rData.restaurant);
      setOrderStats(rData.orderStats);
      setMenuItemCount(rData.menuItemCount);
      setVendor(rData.vendor);
      setMenuItems(
        mData.menuItems.map((m) => ({
          _id: m._id,
          name: m.name,
          price: m.price,
          isAvailable: m.isAvailable,
          category: m.categoryId?.name,
        })),
      );
    } catch {
      toast({ title: "Failed to load restaurant", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Approve takes an OPTIONAL welcome message — its OWN field, NOT the reject reason.
  const handleApprove = async () => {
    if (!id) return;
    setApproving(true);
    try {
      const msg = welcomeMessage.trim();
      await adminService.approveRestaurant(id, msg ? { welcomeMessage: msg } : undefined);
      toast({ title: "Restaurant approved" });
      setDialog(null);
      setWelcomeMessage("");
      await load();
    } catch {
      toast({ title: "Approval failed", variant: "destructive" });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (reason?: string) => {
    if (!id) return;
    try {
      await adminService.rejectRestaurant(id, { reason: reason! });
      toast({ title: "Restaurant rejected" });
      await load();
    } catch {
      toast({ title: "Rejection failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleClose = async (reason?: string) => {
    if (!id) return;
    try {
      await adminService.closeRestaurant(id, { reason: reason! });
      toast({ title: "Restaurant temporarily closed" });
      await load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleReopen = async () => {
    if (!id) return;
    try {
      await adminService.reopenRestaurant(id);
      toast({ title: "Restaurant reopened" });
      await load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleDeactivate = async (reason?: string) => {
    if (!id) return;
    try {
      await adminService.deactivateRestaurant(id, { reason: reason! });
      toast({ title: "Restaurant deactivated" });
      await load();
    } catch {
      toast({ title: "Deactivation failed", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleFeatureToggle = async () => {
    if (!id || !restaurant) return;
    try {
      await adminService.featureRestaurant(id);
      toast({ title: restaurant.isFeatured ? "Unfeatured" : "Featured" });
      await load();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const handleToggleMenuItem = async (item: MenuItem) => {
    if (!id) return;
    try {
      await adminService.toggleMenuItemVisibility(id, item._id);
      toast({ title: item.isAvailable ? "Item hidden" : "Item shown" });
      await load();
    } catch {
      toast({ title: "Failed to toggle item", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <EmptyState
        icon={Store}
        title="Restaurant not found"
        description="This restaurant may have been removed."
        action={{ label: "Back to restaurants", onClick: () => history.back() }}
      />
    );
  }

  const status = {
    label: restaurant.approvalStatus.charAt(0).toUpperCase() + restaurant.approvalStatus.slice(1),
    tone: approvalTone[restaurant.approvalStatus],
  };

  const menuColumns: DataTableColumn<MenuItem>[] = [
    {
      key: "name",
      header: "Item",
      render: (m) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{m.name}</p>
          {m.category && <p className="truncate text-xs text-muted-foreground">{m.category}</p>}
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      render: (m) => <span className="font-medium text-foreground">{formatCurrency(m.price)}</span>,
    },
    {
      key: "visibility",
      header: "Visibility",
      align: "right",
      render: (m) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleToggleMenuItem(m)}
          className={
            m.isAvailable
              ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              : "text-muted-foreground"
          }
        >
          {m.isAvailable ? <Eye className="mr-1.5 h-3.5 w-3.5" /> : <EyeOff className="mr-1.5 h-3.5 w-3.5" />}
          {m.isAvailable ? "Visible" : "Hidden"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <DetailHeader
        backTo="/admin/restaurants"
        backLabel="Restaurants"
        title={restaurant.name}
        subtitle={
          restaurant.address
            ? [restaurant.address.street, restaurant.address.area, restaurant.address.district]
                .filter(Boolean)
                .join(", ")
            : undefined
        }
        avatar={
          restaurant.images?.logo ? (
            <img
              src={restaurant.images.logo}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Store className="h-6 w-6" />
            </span>
          )
        }
        badges={
          <>
            <StatusBadge label={status.label} tone={status.tone} />
            {restaurant.isFeatured && <StatusBadge label="Featured" tone="brand" icon={Star} />}
            {restaurant.isTemporarilyClosed && <StatusBadge label="Temporarily Closed" tone="warning" />}
            {!restaurant.isActive && <StatusBadge label="Inactive" tone="neutral" />}
          </>
        }
        actions={
          <>
            {restaurant.approvalStatus === "pending" && (
              <>
                <Button variant="brand" size="sm" onClick={() => setDialog("approve")}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDialog("reject")}>
                  <XCircle className="mr-1.5 h-4 w-4" /> Reject
                </Button>
              </>
            )}
            {restaurant.approvalStatus === "approved" &&
              (restaurant.isTemporarilyClosed ? (
                <Button variant="brand" size="sm" onClick={() => setDialog("reopen")}>
                  <DoorOpen className="mr-1.5 h-4 w-4" /> Reopen
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setDialog("close")}>
                  <XCircle className="mr-1.5 h-4 w-4" /> Temporarily Close
                </Button>
              ))}
            <Button variant="outline" size="sm" onClick={handleFeatureToggle}>
              <Star className={`mr-1.5 h-4 w-4 ${restaurant.isFeatured ? "fill-current" : ""}`} />
              {restaurant.isFeatured ? "Unfeature" : "Feature"}
            </Button>
            {restaurant.isActive && (
              <Button variant="destructive" size="sm" onClick={() => setDialog("deactivate")}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Deactivate
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Rating"
          value={restaurant.rating?.count ? `${restaurant.rating.average.toFixed(1)} ★` : "—"}
          hint={restaurant.rating?.count ? `${formatNumber(restaurant.rating.count)} reviews` : "No reviews"}
          icon={Star}
        />
        <StatCard label="Menu Items" value={formatNumber(menuItemCount)} icon={Utensils} />
        <StatCard
          label="Delivered Orders"
          value={formatNumber(orderStats?.delivered ?? 0)}
          icon={ShoppingBag}
          accent="brand"
        />
        <StatCard
          label="Cancelled Orders"
          value={formatNumber(orderStats?.cancelled ?? 0)}
          icon={PackageX}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Details" className="lg:col-span-1">
          <KeyValueList
            columns={1}
            items={[
              {
                label: "Owner",
                value: vendor ? (
                  <span>
                    {vendor.firstName} {vendor.lastName}
                    <span className="block text-xs font-normal text-muted-foreground">{vendor.email}</span>
                  </span>
                ) : (
                  "—"
                ),
              },
              { label: "Phone", value: restaurant.contactInfo?.phone ?? "—" },
              { label: "Email", value: restaurant.contactInfo?.email ?? "—" },
              {
                label: "Cuisine",
                value: restaurant.cuisineType?.length ? restaurant.cuisineType.join(", ") : "—",
              },
              {
                label: "Total Orders",
                value: formatNumber(orderStats?.totalOrders ?? 0),
              },
              {
                label: "Total Revenue",
                value: formatCurrency(orderStats?.totalRevenue ?? 0),
              },
            ]}
          />
          {restaurant.description && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="mt-1 text-sm text-foreground">{restaurant.description}</p>
            </div>
          )}
          {restaurant.approvalStatus === "rejected" && restaurant.rejectionReason && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">
              <p className="mb-1 font-bold">Rejection reason</p>
              <p>{restaurant.rejectionReason}</p>
            </div>
          )}
          {restaurant.isTemporarilyClosed && restaurant.closureReason && (
            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
              <p className="mb-1 font-bold">Closure reason</p>
              <p>{restaurant.closureReason}</p>
            </div>
          )}
        </SectionCard>

        <div className="lg:col-span-2">
          <SectionCard title={`Menu Items (${menuItems.length})`} flush>
            {menuItems.length ? (
              <DataTable
                columns={menuColumns}
                data={menuItems}
                getRowId={(m) => m._id}
                className="rounded-none border-0"
              />
            ) : (
              <EmptyState icon={Utensils} title="No menu items" className="border-0 py-10" />
            )}
          </SectionCard>
        </div>
      </div>

      {/* Approve — welcome message is its OWN optional field, NOT the reject reason. */}
      <FormDialog
        open={dialog === "approve"}
        onOpenChange={(o) => {
          if (!o) {
            setDialog(null);
            setWelcomeMessage("");
          }
        }}
        title="Approve this restaurant?"
        description="The restaurant will be listed on the platform immediately."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={approving}>
              Cancel
            </Button>
            <Button variant="brand" onClick={handleApprove} disabled={approving}>
              {approving ? "Approving…" : "Approve"}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="welcome-msg">Welcome message (optional)</Label>
          <Textarea
            id="welcome-msg"
            rows={3}
            className="resize-none"
            placeholder="Optional message to send the vendor…"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        onConfirm={handleReject}
        title="Reject this restaurant?"
        description="The vendor will be notified with your reason."
        confirmLabel="Reject"
        requireReason
        reasonPlaceholder="Reason for rejection…"
        destructive
      />
      <ConfirmDialog
        open={dialog === "close"}
        onClose={() => setDialog(null)}
        onConfirm={handleClose}
        title="Temporarily close restaurant?"
        description="The restaurant will be unavailable for orders until reopened."
        confirmLabel="Close"
        requireReason
        reasonPlaceholder="Reason for closure…"
        destructive={false}
      />
      <ConfirmDialog
        open={dialog === "reopen"}
        onClose={() => setDialog(null)}
        onConfirm={handleReopen}
        title="Reopen restaurant?"
        description="The restaurant will become available to customers again."
        confirmLabel="Reopen"
        destructive={false}
      />
      <ConfirmDialog
        open={dialog === "deactivate"}
        onClose={() => setDialog(null)}
        onConfirm={handleDeactivate}
        title={`Deactivate ${restaurant.name}?`}
        description="This removes the restaurant from the platform (super-admin only). Provide a reason for the audit log."
        confirmLabel="Deactivate"
        requireReason
        reasonPlaceholder="Reason for deactivation…"
        destructive
      />
    </div>
  );
}
