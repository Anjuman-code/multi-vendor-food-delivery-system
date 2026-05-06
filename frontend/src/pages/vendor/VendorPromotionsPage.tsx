import React, { useEffect, useState, useCallback } from "react";
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
  Loader2,
  Check,
  ChevronRight,
  ChevronLeft,
  Clock,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import vendorService from "@/services/vendorService";
import { useVendor } from "@/contexts/VendorContext";
import type { VendorCoupon, CouponStats } from "@/types/vendor";
import { useToast } from "@/hooks/use-toast";

// ── Constants ────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: "Discount" },
  { num: 2, label: "Conditions" },
  { num: 3, label: "Duration" },
  { num: 4, label: "Review" },
] as const;

// ── Types ────────────────────────────────────────────────────────────

interface WizardData {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minimumOrderAmount: string;
  maxDiscount: string;
  validFrom: string;
  validTo: string;
  usageLimit: string;
  applicableRestaurants: string[];
}

const EMPTY_WIZARD: WizardData = {
  code: "",
  type: "percentage",
  value: 0,
  minimumOrderAmount: "",
  maxDiscount: "",
  validFrom: "",
  validTo: "",
  usageLimit: "",
  applicableRestaurants: [],
};

// ── Helper functions ─────────────────────────────────────────────────

const daysRemaining = (dateStr: string): number => {
  const now = new Date();
  const end = new Date(dateStr);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const isExpiredDate = (dateStr: string): boolean =>
  new Date(dateStr) < new Date();

const getExpiryColor = (days: number): string => {
  if (days < 3) return "text-red-600 bg-red-50 border-red-200";
  if (days < 7) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-green-600 bg-green-50 border-green-200";
};

const getExpiryLabel = (
  coupon: VendorCoupon,
): { text: string; color: string } => {
  const end = coupon.endDate || coupon.validTo;
  const days = daysRemaining(end);

  if (isExpiredDate(end))
    return {
      text: "Expired",
      color: "text-gray-500 bg-gray-100 border-gray-200",
    };
  return {
    text: `${days} day${days !== 1 ? "s" : ""} remaining`,
    color: getExpiryColor(days),
  };
};

const getUsagePercent = (coupon: VendorCoupon): number => {
  const limit = coupon.usageLimit ?? coupon.maxUses ?? 0;
  const used = coupon.usedCount ?? coupon.currentUses ?? 0;
  if (!limit) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
};

// ── Main Component ───────────────────────────────────────────────────

const VendorPromotionsPage: React.FC = () => {
  const { restaurants } = useVendor();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<VendorCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editCouponId, setEditCouponId] = useState<string | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, CouponStats>>({});
  const [statsLoading, setStatsLoading] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>(EMPTY_WIZARD);
  const [wizardErrors, setWizardErrors] = useState<Record<string, string>>(
    {},
  );
  const [wizardSaving, setWizardSaving] = useState(false);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    const res = await vendorService.getCoupons();
    if (res.success && res.data) {
      setCoupons(res.data.coupons);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  // ── Stats ──

  const handleToggleStats = async (couponId: string) => {
    if (statsMap[couponId]) {
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
    } else {
      toast({
        title: "Error",
        description: res.message || "Failed to load stats",
        variant: "destructive",
      });
    }
    setStatsLoading(null);
  };

  // ── Pause / Resume ──

  const handleToggleActive = async (coupon: VendorCoupon) => {
    const res = await vendorService.updateCoupon(coupon._id, {
      isActive: !coupon.isActive,
    });
    if (res.success) {
      setCoupons((prev) =>
        prev.map((c) =>
          c._id === coupon._id ? { ...c, isActive: !coupon.isActive } : c,
        ),
      );
      toast({
        title: "Success",
        description: `Coupon ${coupon.isActive ? "paused" : "resumed"}`,
      });
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
  };

  // ── Delete ──

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this coupon? This action cannot be undone."))
      return;
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

  // ── Wizard openers ──

  const openCreateWizard = () => {
    setEditCouponId(null);
    setWizardData(EMPTY_WIZARD);
    setWizardStep(1);
    setWizardErrors({});
    setShowWizard(true);
  };

  const openEditWizard = (coupon: VendorCoupon) => {
    setEditCouponId(coupon._id);
    setWizardData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minimumOrderAmount: String(
        coupon.minimumOrderAmount ?? coupon.minOrderAmount ?? "",
      ),
      maxDiscount: String(coupon.maxDiscount ?? ""),
      validFrom:
        coupon.startDate || coupon.validFrom
          ? new Date(coupon.startDate || coupon.validFrom)
              .toISOString()
              .split("T")[0]
          : "",
      validTo:
        coupon.endDate || coupon.validTo
          ? new Date(coupon.endDate || coupon.validTo)
              .toISOString()
              .split("T")[0]
          : "",
      usageLimit: String(coupon.usageLimit ?? coupon.maxUses ?? ""),
      applicableRestaurants:
        coupon.applicableRestaurants?.map((r) =>
          typeof r === "string" ? r : (r as { _id: string })._id,
        ) || [],
    });
    setWizardStep(1);
    setWizardErrors({});
    setShowWizard(true);
  };

  // ── Wizard field management ──

  const updateWizardField = <K extends keyof WizardData>(
    field: K,
    value: WizardData[K],
  ) => {
    setWizardData((prev) => ({ ...prev, [field]: value }));
    if (wizardErrors[field]) {
      setWizardErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!wizardData.code || wizardData.code.trim().length < 3) {
        errors.code = "Code must be at least 3 characters";
      } else if (wizardData.code.trim().length > 20) {
        errors.code = "Code cannot exceed 20 characters";
      } else if (!/^[A-Z0-9_-]+$/i.test(wizardData.code)) {
        errors.code = "Only letters, numbers, hyphens, underscores";
      }
      if (!wizardData.value || wizardData.value <= 0) {
        errors.value = "Discount value must be greater than 0";
      } else if (wizardData.type === "percentage" && wizardData.value > 100) {
        errors.value = "Percentage cannot exceed 100%";
      }
    } else if (step === 2) {
      if (wizardData.applicableRestaurants.length === 0) {
        errors.applicableRestaurants = "Select at least one restaurant";
      }
    } else if (step === 3) {
      if (!wizardData.validFrom) {
        errors.validFrom = "Start date is required";
      }
      if (!wizardData.validTo) {
        errors.validTo = "End date is required";
      } else if (
        wizardData.validFrom &&
        wizardData.validTo < wizardData.validFrom
      ) {
        errors.validTo = "End date must be on or after start date";
      }
    }

    setWizardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleWizardNext = () => {
    if (validateStep(wizardStep)) {
      setWizardStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleWizardBack = () => {
    setWizardStep((prev) => Math.max(prev - 1, 1));
  };

  const handleWizardSubmit = async () => {
    if (!validateStep(wizardStep)) return;

    setWizardSaving(true);

    const payload: Record<string, unknown> = {
      code: wizardData.code.toUpperCase(),
      type: wizardData.type,
      value: wizardData.value,
      minimumOrderAmount: wizardData.minimumOrderAmount
        ? Number(wizardData.minimumOrderAmount)
        : undefined,
      maxDiscount: wizardData.maxDiscount
        ? Number(wizardData.maxDiscount)
        : undefined,
      startDate: wizardData.validFrom,
      endDate: wizardData.validTo,
      usageLimit: wizardData.usageLimit
        ? Number(wizardData.usageLimit)
        : undefined,
      applicableRestaurants: wizardData.applicableRestaurants,
    };

    const res = editCouponId
      ? await vendorService.updateCoupon(editCouponId, payload)
      : await vendorService.createCoupon(payload);

    if (res.success) {
      toast({
        title: "Success",
        description: editCouponId ? "Coupon updated" : "Coupon created",
      });
      setShowWizard(false);
      await loadCoupons();
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setWizardSaving(false);
  };

  // ── Loading state ──

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage coupons and discount offers
          </p>
        </div>
        <Button
          onClick={openCreateWizard}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </Button>
      </div>

      {/* Coupons List */}
      {coupons.length === 0 ? (
        /* ── Empty state ── */
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No coupons yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create your first promotion to attract more customers.
          </p>
          <Button
            onClick={openCreateWizard}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Create First Coupon
          </Button>
        </div>
      ) : (
        /* ── Coupon cards grid ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coupons.map((coupon) => (
            <CouponCard
              key={coupon._id}
              coupon={coupon}
              stats={statsMap[coupon._id]}
              statsLoading={statsLoading === coupon._id}
              onToggleStats={() => handleToggleStats(coupon._id)}
              onToggleActive={() => handleToggleActive(coupon)}
              onEdit={() => openEditWizard(coupon)}
              onDelete={() => handleDelete(coupon._id)}
            />
          ))}
        </div>
      )}

      {/* Wizard Modal */}
      <AnimatePresence>
        {showWizard && (
          <CouponWizardModal
            isEdit={editCouponId !== null}
            currentStep={wizardStep}
            data={wizardData}
            errors={wizardErrors}
            saving={wizardSaving}
            restaurants={restaurants}
            onFieldChange={updateWizardField}
            onNext={handleWizardNext}
            onBack={handleWizardBack}
            onSubmit={handleWizardSubmit}
            onClose={() => setShowWizard(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Coupon Card ───────────────────────────────────────────────────────

const CouponCard: React.FC<{
  coupon: VendorCoupon;
  stats?: CouponStats;
  statsLoading: boolean;
  onToggleStats: () => void;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({
  coupon,
  stats,
  statsLoading,
  onToggleStats,
  onToggleActive,
  onEdit,
  onDelete,
}) => {
  const endDate = coupon.endDate || coupon.validTo;
  const expired = isExpiredDate(endDate);
  const usagePct = getUsagePercent(coupon);
  const limit = coupon.usageLimit ?? coupon.maxUses ?? 0;
  const used = coupon.usedCount ?? coupon.currentUses ?? 0;
  const expiryInfo = getExpiryLabel(coupon);

  const statOrders = stats?.stats?.totalOrders ?? stats?.totalUses ?? 0;
  const statRevenue = stats?.stats?.totalRevenue ?? stats?.totalRevenue ?? 0;
  const statDiscount =
    stats?.stats?.totalDiscount ?? stats?.totalDiscount ?? 0;
  const redemptionRate =
    limit > 0 ? `${Math.round((used / limit) * 100)}%` : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
    >
      {/* Top row: code + status toggle */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              coupon.type === "percentage" ? "bg-purple-100" : "bg-green-100"
            }`}
          >
            {coupon.type === "percentage" ? (
              <Percent className="w-5 h-5 text-purple-600" />
            ) : (
              <DollarSign className="w-5 h-5 text-green-600" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 tracking-wider font-mono">
              {coupon.code}
            </h3>
            <p className="text-sm text-gray-500">
              {coupon.type === "percentage"
                ? `${coupon.value}% off`
                : `৳${coupon.value} off`}
              {coupon.minimumOrderAmount || coupon.minOrderAmount
                ? ` · Min ৳${
                    coupon.minimumOrderAmount ?? coupon.minOrderAmount
                  }`
                : ""}
            </p>
          </div>
        </div>

        {/* Pause / Resume toggle pill */}
        {!expired ? (
          <button
            onClick={onToggleActive}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
              coupon.isActive
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
            }`}
            title={coupon.isActive ? "Click to pause" : "Click to resume"}
          >
            {coupon.isActive ? "Active" : "Paused"}
          </button>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
            Expired
          </span>
        )}
      </div>

      {/* Expiry countdown */}
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${expiryInfo.color} mb-3`}
      >
        <Clock className="w-3.5 h-3.5" />
        {expiryInfo.text}
        {!expired && daysRemaining(endDate) < 3 && (
          <AlertTriangle className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(
            coupon.startDate || coupon.validFrom,
          ).toLocaleDateString()}
          {" – "}
          {new Date(endDate).toLocaleDateString()}
        </span>
      </div>

      {/* Usage progress bar */}
      {limit > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Usage</span>
            <span>
              {used}/{limit}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePct >= 90
                  ? "bg-red-500"
                  : usagePct >= 70
                    ? "bg-orange-500"
                    : "bg-orange-400"
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats section (loaded on demand) */}
      {stats && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3 grid grid-cols-3 gap-2 text-center text-sm border border-gray-100">
          <div>
            <p className="font-bold text-gray-900">{statOrders}</p>
            <p className="text-xs text-gray-500">Orders</p>
          </div>
          <div>
            <p className="font-bold text-gray-900">৳{statRevenue}</p>
            <p className="text-xs text-gray-500">Revenue</p>
          </div>
          <div>
            <p className="font-bold text-gray-900">{redemptionRate}</p>
            <p className="text-xs text-gray-500">Redemption</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <button
          onClick={onToggleStats}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="View statistics"
        >
          {statsLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <BarChart3
              className={`w-4 h-4 ${
                stats ? "text-orange-500" : "text-gray-500"
              }`}
            />
          )}
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Edit coupon"
        >
          <Edit className="w-4 h-4 text-gray-500" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors ml-auto"
          title="Delete coupon"
        >
          <Trash2 className="w-4 h-4 text-red-400 hover:text-red-500" />
        </button>
      </div>
    </motion.div>
  );
};

// ── Wizard Modal ─────────────────────────────────────────────────────

const CouponWizardModal: React.FC<{
  isEdit: boolean;
  currentStep: number;
  data: WizardData;
  errors: Record<string, string>;
  saving: boolean;
  restaurants: { _id: string; name: string }[];
  onFieldChange: <K extends keyof WizardData>(
    field: K,
    value: WizardData[K],
  ) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  onClose: () => void;
}> = ({
  isEdit,
  currentStep,
  data,
  errors,
  saving,
  restaurants,
  onFieldChange,
  onNext,
  onBack,
  onSubmit,
  onClose,
}) => {
  const isLastStep = currentStep === STEPS.length;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepDiscountType data={data} errors={errors} onChange={onFieldChange} />
        );
      case 2:
        return (
          <StepConditions
            data={data}
            errors={errors}
            restaurants={restaurants}
            onChange={onFieldChange}
          />
        );
      case 3:
        return (
          <StepDuration data={data} errors={errors} onChange={onFieldChange} />
        );
      case 4:
        return <StepReview data={data} restaurants={restaurants} />;
      default:
        return null;
    }
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
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Coupon" : "Create Coupon"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── Step Progress Indicator ── */}
        <div className="relative flex items-center justify-between w-full max-w-md mx-auto mb-8">
          {/* Background line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 rounded" />
          {/* Animated progress line */}
          <div
            className="absolute top-5 left-0 h-0.5 bg-orange-500 rounded transition-all duration-500 ease-in-out"
            style={{
              width: `${
                ((currentStep - 1) / (STEPS.length - 1)) * 100
              }%`,
            }}
          />

          {STEPS.map((step) => {
            const isCompleted = step.num < currentStep;
            const isCurrent = step.num === currentStep;

            return (
              <div key={step.num} className="flex flex-col items-center z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                    isCompleted
                      ? "bg-green-500 border-green-500 text-white shadow-md shadow-green-200"
                      : isCurrent
                        ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200"
                        : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.num
                  )}
                </div>
                <span
                  className={`text-xs mt-1.5 font-medium whitespace-nowrap ${
                    isCurrent
                      ? "text-orange-600"
                      : isCompleted
                        ? "text-green-600"
                        : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[220px]">{renderStep()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? onClose : onBack}
            className="rounded-lg gap-1.5"
            disabled={saving}
          >
            <ChevronLeft className="w-4 h-4" />
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>

          {isLastStep ? (
            <Button
              onClick={onSubmit}
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2 shadow-sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isEdit ? "Update Coupon" : "Create Coupon"}
            </Button>
          ) : (
            <Button
              onClick={onNext}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg gap-1.5 shadow-sm"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Step 1: Discount Type ────────────────────────────────────────────

const StepDiscountType: React.FC<{
  data: WizardData;
  errors: Record<string, string>;
  onChange: <K extends keyof WizardData>(
    field: K,
    value: WizardData[K],
  ) => void;
}> = ({ data, errors, onChange }) => (
  <div className="space-y-5">
    <div>
      <p className="text-xs font-medium text-orange-600 uppercase tracking-wider mb-1">
        Step 1 of 4
      </p>
      <h3 className="text-lg font-semibold text-gray-900">Discount Type</h3>
      <p className="text-sm text-gray-500 mt-1">
        Define the coupon code and how much customers save.
      </p>
    </div>

    {/* Coupon Code */}
    <div>
      <Label htmlFor="code">Coupon Code</Label>
      <Input
        id="code"
        value={data.code}
        onChange={(e) => onChange("code", e.target.value.toUpperCase())}
        placeholder="SAVE20"
        className={`mt-1 uppercase tracking-wider font-mono ${
          errors.code
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
            : ""
        }`}
        maxLength={20}
      />
      {errors.code && (
        <p className="text-xs text-red-500 mt-1">{errors.code}</p>
      )}
      {!errors.code && data.code && (
        <p className="text-xs text-gray-400 mt-1">
          Customers will enter this code at checkout
        </p>
      )}
    </div>

    {/* Discount Type selector */}
    <div>
      <Label>Discount Type</Label>
      <div className="grid grid-cols-2 gap-3 mt-1.5">
        {(["percentage", "fixed"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange("type", type)}
            className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
              data.type === type
                ? type === "percentage"
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-green-500 bg-green-50 text-green-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {type === "percentage" ? (
              <Percent className="w-5 h-5" />
            ) : (
              <DollarSign className="w-5 h-5" />
            )}
            <div className="text-left">
              <p className="font-medium">
                {type === "percentage" ? "Percentage" : "Fixed Amount"}
              </p>
              <p className="text-xs opacity-75 font-normal">
                {type === "percentage" ? "% off total" : "৳ off total"}
              </p>
            </div>
            {data.type === type && (
              <Check className="w-4 h-4 ml-auto shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>

    {/* Value */}
    <div>
      <Label htmlFor="value">
        Discount Value{" "}
        {data.type === "percentage" ? "(%)" : "(৳)"}
      </Label>
      <div className="relative mt-1">
        {data.type === "fixed" && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            ৳
          </span>
        )}
        <Input
          id="value"
          type="number"
          min={0.01}
          max={data.type === "percentage" ? 100 : undefined}
          step={data.type === "percentage" ? 1 : 0.01}
          value={data.value || ""}
          onChange={(e) =>
            onChange(
              "value",
              e.target.value === "" ? 0 : Number(e.target.value),
            )
          }
          placeholder={data.type === "percentage" ? "e.g. 20" : "e.g. 100"}
          className={`mt-0 ${data.type === "fixed" ? "pl-7" : ""} ${
            errors.value
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
              : ""
          }`}
        />
        {data.type === "percentage" && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            %
          </span>
        )}
      </div>
      {errors.value && (
        <p className="text-xs text-red-500 mt-1">{errors.value}</p>
      )}
      {data.type === "percentage" && data.value > 0 && (
        <p className="text-xs text-gray-400 mt-1">
          Customer saves {data.value}% on their order total
        </p>
      )}
      {data.type === "fixed" && data.value > 0 && (
        <p className="text-xs text-gray-400 mt-1">
          Customer saves ৳{data.value} on their order total
        </p>
      )}
    </div>
  </div>
);

// ── Step 2: Conditions ───────────────────────────────────────────────

const StepConditions: React.FC<{
  data: WizardData;
  errors: Record<string, string>;
  restaurants: { _id: string; name: string }[];
  onChange: <K extends keyof WizardData>(
    field: K,
    value: WizardData[K],
  ) => void;
}> = ({ data, errors, restaurants, onChange }) => {
  const allSelected =
    restaurants.length > 0 &&
    data.applicableRestaurants.length === restaurants.length;

  const toggleAllRestaurants = () => {
    if (allSelected) {
      onChange("applicableRestaurants", []);
    } else {
      onChange(
        "applicableRestaurants",
        restaurants.map((r) => r._id),
      );
    }
  };

  const toggleRestaurant = (id: string) => {
    const current = data.applicableRestaurants;
    if (current.includes(id)) {
      onChange(
        "applicableRestaurants",
        current.filter((r) => r !== id),
      );
    } else {
      onChange("applicableRestaurants", [...current, id]);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-orange-600 uppercase tracking-wider mb-1">
          Step 2 of 4
        </p>
        <h3 className="text-lg font-semibold text-gray-900">Conditions</h3>
        <p className="text-sm text-gray-500 mt-1">
          Set order minimums and choose where the coupon applies.
        </p>
      </div>

      {/* Minimum Order Amount */}
      <div>
        <Label htmlFor="minOrder">Minimum Order Amount (৳)</Label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            ৳
          </span>
          <Input
            id="minOrder"
            type="number"
            min={0}
            step={0.01}
            value={data.minimumOrderAmount}
            onChange={(e) => onChange("minimumOrderAmount", e.target.value)}
            placeholder="No minimum"
            className="pl-7"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Leave empty for no minimum order requirement
        </p>
      </div>

      {/* Max Discount (only for percentage coupons) */}
      {data.type === "percentage" && (
        <div>
          <Label htmlFor="maxDiscount">
            Maximum Discount Amount (৳)
          </Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              ৳
            </span>
            <Input
              id="maxDiscount"
              type="number"
              min={0}
              step={0.01}
              value={data.maxDiscount}
              onChange={(e) => onChange("maxDiscount", e.target.value)}
              placeholder="No maximum"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Cap the discount amount for percentage-based coupons
          </p>
        </div>
      )}

      {/* Applicable Restaurants */}
      <div>
        <div className="flex items-center justify-between">
          <Label>Applicable Restaurants</Label>
          {restaurants.length > 0 && (
            <button
              type="button"
              onClick={toggleAllRestaurants}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>
        <div className="mt-2 space-y-1 max-h-44 overflow-y-auto border border-gray-100 rounded-lg p-1">
          {restaurants.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No restaurants available
            </p>
          ) : (
            restaurants.map((r) => {
              const selected = data.applicableRestaurants.includes(r._id);
              return (
                <label
                  key={r._id}
                  className={`flex items-center gap-2.5 cursor-pointer text-sm p-2 rounded-lg transition-colors ${
                    selected
                      ? "bg-orange-50 text-orange-800"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleRestaurant(r._id)}
                    className="rounded text-orange-500 focus:ring-orange-500"
                  />
                  <span className="flex-1">{r.name}</span>
                  {selected && (
                    <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  )}
                </label>
              );
            })
          )}
        </div>
        {errors.applicableRestaurants && (
          <p className="text-xs text-red-500 mt-1">
            {errors.applicableRestaurants}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {data.applicableRestaurants.length} of {restaurants.length} restaurant
          {restaurants.length !== 1 ? "s" : ""} selected
        </p>
      </div>
    </div>
  );
};

// ── Step 3: Duration & Limits ────────────────────────────────────────

const StepDuration: React.FC<{
  data: WizardData;
  errors: Record<string, string>;
  onChange: <K extends keyof WizardData>(
    field: K,
    value: WizardData[K],
  ) => void;
}> = ({ data, errors, onChange }) => (
  <div className="space-y-5">
    <div>
      <p className="text-xs font-medium text-orange-600 uppercase tracking-wider mb-1">
        Step 3 of 4
      </p>
      <h3 className="text-lg font-semibold text-gray-900">
        Duration &amp; Limits
      </h3>
      <p className="text-sm text-gray-500 mt-1">
        Set the validity period and usage restrictions.
      </p>
    </div>

    {/* Date range */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="validFrom">Valid From</Label>
        <Input
          id="validFrom"
          type="date"
          value={data.validFrom}
          onChange={(e) => onChange("validFrom", e.target.value)}
          className={`mt-1 ${
            errors.validFrom
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
              : ""
          }`}
        />
        {errors.validFrom && (
          <p className="text-xs text-red-500 mt-1">{errors.validFrom}</p>
        )}
      </div>
      <div>
        <Label htmlFor="validTo">Valid To</Label>
        <Input
          id="validTo"
          type="date"
          value={data.validTo}
          onChange={(e) => onChange("validTo", e.target.value)}
          min={data.validFrom || undefined}
          className={`mt-1 ${
            errors.validTo
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
              : ""
          }`}
        />
        {errors.validTo && (
          <p className="text-xs text-red-500 mt-1">{errors.validTo}</p>
        )}
      </div>
    </div>

    {/* Usage Limit */}
    <div>
      <Label htmlFor="usageLimit">
        Usage Limit{" "}
        <span className="text-gray-400 font-normal">(optional)</span>
      </Label>
      <Input
        id="usageLimit"
        type="number"
        min={1}
        step={1}
        value={data.usageLimit}
        onChange={(e) => onChange("usageLimit", e.target.value)}
        placeholder="Unlimited"
        className="mt-1"
      />
      <p className="text-xs text-gray-400 mt-1">
        Maximum number of times this coupon can be used. Leave empty for
        unlimited.
      </p>
    </div>

    {/* Duration preview */}
    {data.validFrom && data.validTo && (
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
        <p className="text-xs font-medium text-blue-800 mb-1">
          Duration Preview
        </p>
        <p className="text-sm text-blue-700">
          {new Date(data.validFrom).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {" – "}
          {new Date(data.validTo).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {data.usageLimit &&
            ` · ${data.usageLimit} use${
              Number(data.usageLimit) !== 1 ? "s" : ""
            } max`}
        </p>
      </div>
    )}
  </div>
);

// ── Step 4: Review ───────────────────────────────────────────────────

const StepReview: React.FC<{
  data: WizardData;
  restaurants: { _id: string; name: string }[];
}> = ({ data, restaurants }) => {
  const selectedRestaurantNames = data.applicableRestaurants
    .map((id) => restaurants.find((r) => r._id === id)?.name)
    .filter(Boolean) as string[];

  const hasRequiredFields =
    data.code &&
    data.value > 0 &&
    data.validFrom &&
    data.validTo &&
    data.applicableRestaurants.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-orange-600 uppercase tracking-wider mb-1">
          Step 4 of 4
        </p>
        <h3 className="text-lg font-semibold text-gray-900">
          Review &amp; Confirm
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Verify all details below before{" "}
          {data.code ? "creating" : "saving"} the coupon.
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
        {/* Discount section */}
        <div className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5" />
            Discount
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Code</span>
            <span className="text-sm font-bold text-gray-900 font-mono tracking-wider">
              {data.code || "—"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-600">Type</span>
            <span className="text-sm font-medium text-gray-900">
              {data.type === "percentage"
                ? `Percentage`
                : `Fixed Amount`}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-600">Value</span>
            <span
              className={`text-sm font-semibold ${
                data.type === "percentage"
                  ? "text-purple-700"
                  : "text-green-700"
              }`}
            >
              {data.type === "percentage"
                ? `${data.value}% off`
                : `৳${data.value} off`}
            </span>
          </div>
        </div>

        {/* Conditions section */}
        <div className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            Conditions
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Minimum Order</span>
            <span className="text-sm font-medium text-gray-900">
              {data.minimumOrderAmount
                ? `৳${data.minimumOrderAmount}`
                : "None"}
            </span>
          </div>
          {data.type === "percentage" && data.maxDiscount && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-600">Max Discount</span>
              <span className="text-sm font-medium text-gray-900">
                ৳{data.maxDiscount}
              </span>
            </div>
          )}
          <div className="mt-3">
            <span className="text-sm text-gray-600">Applicable to</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {selectedRestaurantNames.length > 0 ? (
                selectedRestaurantNames.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md text-xs font-medium"
                  >
                    {name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-red-500">
                  No restaurants selected
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {data.applicableRestaurants.length} of {restaurants.length}{" "}
              restaurant{restaurants.length !== 1 ? "s" : ""} selected
            </p>
          </div>
        </div>

        {/* Duration & Limits section */}
        <div className="p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Duration &amp; Limits
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Valid From</span>
            <span className="text-sm font-medium text-gray-900">
              {data.validFrom
                ? new Date(data.validFrom).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-600">Valid To</span>
            <span className="text-sm font-medium text-gray-900">
              {data.validTo
                ? new Date(data.validTo).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-600">Usage Limit</span>
            <span className="text-sm font-medium text-gray-900">
              {data.usageLimit ? `${data.usageLimit} uses` : "Unlimited"}
            </span>
          </div>
        </div>
      </div>

      {/* Validation summary */}
      {!hasRequiredFields && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Incomplete coupon
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Please go back and ensure all required fields are filled before
              creating.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPromotionsPage;
