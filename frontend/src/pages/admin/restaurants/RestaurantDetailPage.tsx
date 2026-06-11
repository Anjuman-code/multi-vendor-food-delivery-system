import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

interface RestaurantDetail {
  _id: string;
  name: string;
  description?: string;
  address?: { street?: string; area?: string; district?: string };
  cuisineType: string[];
  tags: string[];
  approvalStatus: "pending" | "approved" | "rejected";
  isOpen: boolean;
  isTemporarilyClosed: boolean;
  isFeatured: boolean;
  isActive: boolean;
  rating?: { average: number; count: number };
  totalOrders?: number;
  totalRevenue?: number;
  images?: { coverPhoto?: string };
  vendor?: { firstName: string; lastName: string; email: string };
  menu?: { _id: string; name: string; price: number; isAvailable: boolean; category?: string }[];
}

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<RestaurantDetail["menu"]>([]);
  const [dialog, setDialog] = useState<"approve" | "reject" | "close" | "deactivate" | null>(null);
  const { toast } = useToast();

  const load = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      adminService.getRestaurant(id),
      adminService.getRestaurantMenu(id),
    ]).then(([rRes, mRes]) => {
      const rData = (rRes.data as {
        data: {
          restaurant: Omit<RestaurantDetail, "vendor" | "totalOrders" | "totalRevenue"> & {
            rating?: { average: number; count: number };
            images?: { coverPhoto?: string };
          };
          orderStats: { totalOrders: number; totalRevenue: number };
          vendor: { firstName: string; lastName: string; email: string } | null;
        };
      }).data;
      const mData = (mRes.data as { data: { menuItems: { _id: string; name: string; price: number; isAvailable: boolean; categoryId?: { name: string } }[] } }).data;

      setRestaurant({
        ...rData.restaurant,
        totalOrders: rData.orderStats.totalOrders,
        totalRevenue: rData.orderStats.totalRevenue,
        vendor: rData.vendor ?? undefined,
      });
      setMenuItems(
        mData.menuItems.map((item) => ({
          _id: item._id,
          name: item.name,
          price: item.price,
          isAvailable: item.isAvailable,
          category: item.categoryId?.name,
        })),
      );
    }).catch(() => {
      toast({ title: "Error", description: "Failed to load restaurant details.", variant: "destructive" });
    }).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleApprove = async (reason?: string) => {
    if (!id) return;
      await adminService.approveRestaurant(id, { welcomeMessage: reason });
    toast({ title: "Approved" });
    setDialog(null);
    setRestaurant((r) => r ? { ...r, approvalStatus: "approved" } : r);
  };

  const handleReject = async (reason?: string) => {
    if (!id) return;
    await adminService.rejectRestaurant(id, { reason: reason! });
    toast({ title: "Rejected" });
    setDialog(null);
    setRestaurant((r) => r ? { ...r, approvalStatus: "rejected" } : r);
  };

  const handleClose = async (reason?: string) => {
    if (!id) return;
    await adminService.closeRestaurant(id, { reason: reason! });
    toast({ title: "Restaurant Closed" });
    setDialog(null);
    setRestaurant((r) => r ? { ...r, isTemporarilyClosed: true } : r);
  };

  const handleFeatureToggle = async () => {
    if (!id || !restaurant) return;
    try {
      await adminService.featureRestaurant(id);
      toast({ title: restaurant.isFeatured ? "Unfeatured" : "Featured" });
      setRestaurant((r) => r ? { ...r, isFeatured: !r.isFeatured } : r);
    } catch {
      toast({ title: "Error", variant: "destructive" } as Parameters<typeof toast>[0]);
    }
  };

  const handleToggleMenuItem = async (itemId: string, current: boolean) => {
    if (!id) return;
    try {
      await adminService.toggleMenuItemVisibility(id, itemId);
      setMenuItems((prev) => prev?.map((m) => m._id === itemId ? { ...m, isAvailable: !current } : m));
    } catch {
      toast({ title: "Error", description: "Failed to toggle item.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-[3px] border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!restaurant) return <p className="text-gray-500">Restaurant not found.</p>;

  const statusMap = {
    pending: "bg-amber-50 text-amber-600",
    approved: "bg-emerald-50 text-emerald-600",
    rejected: "bg-red-50 text-red-600",
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/admin/restaurants" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Restaurants
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            {restaurant.images?.coverPhoto ? (
              <img src={restaurant.images.coverPhoto} alt="" className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                <Store className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${statusMap[restaurant.approvalStatus]}`}>
                  {restaurant.approvalStatus}
                </span>
                {restaurant.isFeatured && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-600">★ Featured</span>
                )}
                {restaurant.isTemporarilyClosed && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-50 text-orange-600">Temporarily Closed</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {restaurant.approvalStatus === "pending" && (
              <>
                <button onClick={() => setDialog("approve")}
                  className="px-3 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors">
                  Approve
                </button>
                <button onClick={() => setDialog("reject")}
                  className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                  Reject
                </button>
              </>
            )}
            {restaurant.approvalStatus === "approved" && !restaurant.isTemporarilyClosed && (
              <button onClick={() => setDialog("close")}
                className="px-3 py-2 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors">
                Temporarily Close
              </button>
            )}
            <button onClick={handleFeatureToggle}
              className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">
              {restaurant.isFeatured ? "Unfeature" : "Feature"}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Rating", value: restaurant.rating?.average ? `${restaurant.rating.average.toFixed(1)} ★` : "—" },
          { label: "Reviews", value: restaurant.rating?.count?.toLocaleString() ?? "—" },
          { label: "Total Orders", value: restaurant.totalOrders?.toLocaleString() ?? "—" },
          { label: "Total Revenue", value: restaurant.totalRevenue ? `৳${restaurant.totalRevenue.toLocaleString()}` : "—" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-3">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {restaurant.vendor && (
            <div>
              <span className="text-gray-400">Owner</span>
              <p className="text-gray-800 font-medium">{restaurant.vendor.firstName} {restaurant.vendor.lastName}</p>
              <p className="text-xs text-gray-400">{restaurant.vendor.email}</p>
            </div>
          )}
          <div>
            <span className="text-gray-400">Address</span>
            <p className="text-gray-800">{restaurant.address?.street}, {restaurant.address?.area}, {restaurant.address?.district}</p>
          </div>
          {restaurant.cuisineType.length > 0 && (
            <div>
              <span className="text-gray-400">Cuisines</span>
              <p className="text-gray-800">{restaurant.cuisineType.join(", ")}</p>
            </div>
          )}
          {restaurant.description && (
            <div className="sm:col-span-2">
              <span className="text-gray-400">Description</span>
              <p className="text-gray-700">{restaurant.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Menu Items */}
      {menuItems && menuItems.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Menu Items ({menuItems.length})</h2>
          <div className="divide-y divide-gray-50">
            {menuItems.map((item) => (
              <div key={item._id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  {item.category && <p className="text-xs text-gray-400">{item.category}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">৳{item.price.toLocaleString()}</span>
                  <button
                    onClick={() => handleToggleMenuItem(item._id, item.isAvailable)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                      item.isAvailable
                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    {item.isAvailable ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {item.isAvailable ? "Visible" : "Hidden"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog open={dialog === "approve"} onClose={() => setDialog(null)} onConfirm={handleApprove}
        title="Approve this restaurant?" description="The restaurant will be listed on the platform immediately."
        confirmLabel="Approve" destructive={false} />
      <ConfirmDialog open={dialog === "reject"} onClose={() => setDialog(null)} onConfirm={handleReject}
        title="Reject this restaurant?" description="The vendor will be notified with your reason."
        confirmLabel="Reject" requireReason reasonPlaceholder="Reason for rejection…" destructive />
      <ConfirmDialog open={dialog === "close"} onClose={() => setDialog(null)} onConfirm={handleClose}
        title="Temporarily close restaurant?" description="The restaurant will be unavailable for orders until reopened."
        confirmLabel="Close" requireReason reasonPlaceholder="Reason…" destructive />
    </div>
  );
}
