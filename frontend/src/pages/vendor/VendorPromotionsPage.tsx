import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Tag,
  Percent,
  DollarSign,
  Trash2,
  Edit,
  BarChart3,
  Calendar,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import vendorService from "@/services/vendorService";
import { useVendor } from "@/contexts/VendorContext";
import type { VendorCoupon, CouponStats } from "@/types/vendor";
import { couponSchema, type CouponInput } from "@/lib/vendorValidation";
import { useToast } from "@/hooks/use-toast";

const VendorPromotionsPage: React.FC = () => {
  const { restaurants } = useVendor();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<VendorCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCoupon, setEditCoupon] = useState<VendorCoupon | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, CouponStats>>({});
  const [statsLoading, setStatsLoading] = useState<string | null>(null);

  const loadCoupons = async () => {
    setLoading(true);
    const res = await vendorService.getCoupons();
    if (res.success && res.data) {
      setCoupons(res.data.coupons);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this coupon?")) return;
    const res = await vendorService.deleteCoupon(id);
    if (res.success) {
      setCoupons((prev) => prev.filter((c) => c._id !== id));
      toast({ title: "Success", description: "Coupon deleted" });
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
  };

  const handleShowStats = async (couponId: string) => {
    if (statsMap[couponId]) {
      // Toggle off
      setStatsMap((prev) => {
        const next = { ...prev };
        delete next[couponId];
        return next;
      });
      return;
    }
    setStatsLoading(couponId);
    const res = await vendorService.getCouponStats(couponId);
    if (res.success && res.data) {
      setStatsMap((prev) => ({ ...prev, [couponId]: res.data! }));
    }
    setStatsLoading(null);
  };

  const isExpired = (c: VendorCoupon) =>
    new Date(c.endDate || c.validTo) < new Date();
  const isActive = (c: VendorCoupon) =>
    !isExpired(c) &&
    new Date(c.startDate || c.validFrom) <= new Date() &&
    c.isActive;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage coupons and discount offers
          </p>
        </div>
        <Button
          onClick={() => {
            setEditCoupon(null);
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No coupons yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create promotions to attract more customers.
          </p>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Create First Coupon
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coupons.map((coupon) => (
            <motion.div
              key={coupon._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      coupon.type === "percentage"
                        ? "bg-purple-100"
                        : "bg-green-100"
                    }`}
                  >
                    {coupon.type === "percentage" ? (
                      <Percent className="w-5 h-5 text-purple-600" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 tracking-wider">
                      {coupon.code}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {coupon.type === "percentage"
                        ? `${coupon.value}% off`
                        : `৳${coupon.value} off`}
                      {coupon.minimumOrderAmount
                        ? ` · Min ৳${coupon.minimumOrderAmount}`
                        : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isActive(coupon)
                      ? "bg-green-100 text-green-700"
                      : isExpired(coupon)
                        ? "bg-gray-100 text-gray-500"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {isActive(coupon)
                    ? "Active"
                    : isExpired(coupon)
                      ? "Expired"
                      : "Scheduled"}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(
                    coupon.startDate || coupon.validFrom,
                  ).toLocaleDateString()}{" "}
                  –{" "}
                  {new Date(
                    coupon.endDate || coupon.validTo,
                  ).toLocaleDateString()}
                </span>
                {coupon.maxUses || coupon.usageLimit ? (
                  <span>
                    {coupon.currentUses || coupon.usedCount || 0}/
                    {coupon.maxUses || coupon.usageLimit} uses
                  </span>
                ) : null}
              </div>

              {/* Stats */}
              {statsMap[coupon._id] && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="font-bold text-gray-900">
                      {statsMap[coupon._id].totalUses}
                    </p>
                    <p className="text-xs text-gray-500">Uses</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">
                      ৳{statsMap[coupon._id].totalRevenue}
                    </p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">
                      ৳{statsMap[coupon._id].totalDiscount}
                    </p>
                    <p className="text-xs text-gray-500">Discounted</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShowStats(coupon._id)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                  title="Stats"
                >
                  {statsLoading === coupon._id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  ) : (
                    <BarChart3 className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditCoupon(coupon);
                    setShowForm(true);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                  title="Edit"
                >
                  <Edit className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => handleDelete(coupon._id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <CouponFormModal
            coupon={editCoupon}
            restaurants={restaurants}
            onClose={() => {
              setShowForm(false);
              setEditCoupon(null);
            }}
            onSaved={loadCoupons}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Coupon Form Modal ────────────────────────────────────────────

const CouponFormModal: React.FC<{
  coupon: VendorCoupon | null;
  restaurants: { _id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ coupon, restaurants, onClose, onSaved }) => {
  const { toast } = useToast();
  const isEdit = Boolean(coupon);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CouponInput>({
    resolver: zodResolver(couponSchema),
    defaultValues: coupon
      ? {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minimumOrderAmount:
            coupon.minimumOrderAmount ?? coupon.minOrderAmount,
          maxUses: coupon.maxUses ?? coupon.usageLimit,
          startDate:
            coupon.startDate || coupon.validFrom
              ? new Date(coupon.startDate || coupon.validFrom)
                  .toISOString()
                  .split("T")[0]
              : "",
          endDate:
            coupon.endDate || coupon.validTo
              ? new Date(coupon.endDate || coupon.validTo)
                  .toISOString()
                  .split("T")[0]
              : "",
          applicableRestaurants:
            coupon.applicableRestaurants?.map((r) =>
              typeof r === "string" ? r : (r as { _id: string })._id,
            ) || [],
        }
      : {
          code: "",
          type: "percentage",
          value: 0,
          startDate: "",
          endDate: "",
          applicableRestaurants: restaurants.map((r) => r._id),
        },
  });

  const selectedRestaurants = watch("applicableRestaurants") || [];

  const toggleRestaurant = (id: string) => {
    const current: string[] = selectedRestaurants;
    if (current.includes(id)) {
      setValue(
        "applicableRestaurants",
        current.filter((r) => r !== id),
        { shouldValidate: true },
      );
    } else {
      setValue("applicableRestaurants", [...current, id], {
        shouldValidate: true,
      });
    }
  };

  const onSubmit = async (data: CouponInput) => {
    setSaving(true);
    const res = isEdit
      ? await vendorService.updateCoupon(coupon!._id, data)
      : await vendorService.createCoupon(data);

    if (res.success) {
      toast({
        title: "Success",
        description: isEdit ? "Coupon updated" : "Coupon created",
      });
      onSaved();
      onClose();
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Coupon" : "Create Coupon"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Code</Label>
              <Input
                {...register("code")}
                placeholder="SAVE20"
                className="mt-1 uppercase"
              />
              {errors.code && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.code.message}
                </p>
              )}
            </div>
            <div>
              <Label>Type</Label>
              <select
                {...register("type")}
                className="w-full mt-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (৳)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Value</Label>
              <Input
                type="number"
                {...register("value", { valueAsNumber: true })}
                placeholder="20"
                className="mt-1"
              />
              {errors.value && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.value.message}
                </p>
              )}
            </div>
            <div>
              <Label>Min Order (৳)</Label>
              <Input
                type="number"
                {...register("minimumOrderAmount", {
                  setValueAs: (value) =>
                    value === "" ? undefined : Number(value),
                })}
                placeholder="0"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" {...register("startDate")} className="mt-1" />
              {errors.startDate && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" {...register("endDate")} className="mt-1" />
              {errors.endDate && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>Max Uses (optional)</Label>
            <Input
              type="number"
              {...register("maxUses", {
                setValueAs: (value) =>
                  value === "" ? undefined : Number(value),
              })}
              placeholder="Unlimited"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Applicable Restaurants</Label>
            <div className="mt-2 space-y-2">
              {restaurants.map((r) => (
                <label
                  key={r._id}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedRestaurants.includes(r._id)}
                    onChange={() => toggleRestaurant(r._id)}
                    className="rounded text-orange-500 focus:ring-orange-500"
                  />
                  {r.name}
                </label>
              ))}
            </div>
            {errors.applicableRestaurants && (
              <p className="text-xs text-red-500 mt-1">
                {errors.applicableRestaurants.message?.toString()}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default VendorPromotionsPage;
