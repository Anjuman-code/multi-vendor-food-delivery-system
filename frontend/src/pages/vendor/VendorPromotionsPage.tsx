import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FormDialog,
  PageHeader,
  StatCard,
  StatusBadge,
  VendorEmptyState,
  type StatusTone,
} from "@/components/vendor";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useVendor } from "@/contexts/VendorContext";
import { toast } from "@/lib/toast";
import { extractApiError, getErrorMessage, getFieldErrors } from "@/lib/formErrors";
import vendorService from "@/services/vendorService";
import type {
  CouponStats,
  CreateCouponPayload,
  UpdateCouponPayload,
  VendorCoupon,
} from "@/types/vendor";
import { cn } from "@/utils/cn";
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "@/utils/format";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Edit,
  Loader2,
  Percent,
  Plus,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

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

// Expiry-countdown urgency colour, routed through tokens.
const getExpiryColor = (days: number): string => {
  if (days < 3) return "text-destructive";
  if (days < 7) return "text-amber-600";
  return "text-emerald-600";
};

const getExpiryLabel = (
  coupon: VendorCoupon,
): { text: string; color: string } => {
  const end = coupon.endDate || coupon.validTo;
  const days = daysRemaining(end);

  if (isExpiredDate(end))
    return {
      text: "Expired",
      color: "text-muted-foreground",
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

// Coupon status pill: active → success, paused → neutral, expired → danger.
const getStatusBadge = (
  coupon: VendorCoupon,
): { label: string; tone: StatusTone } => {
  const end = coupon.endDate || coupon.validTo;
  if (isExpiredDate(end)) return { label: "Expired", tone: "danger" };
  return coupon.isActive
    ? { label: "Active", tone: "success" }
    : { label: "Paused", tone: "neutral" };
};

// ── Main Component ───────────────────────────────────────────────────

const VendorPromotionsPage: React.FC = () => {
  const { restaurants } = useVendor();
  const confirm = useConfirm();
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
      toast.error("Error", {
        description: res.message || "Failed to load stats",
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
      toast.success("Success", {
        description: `Coupon ${coupon.isActive ? "paused" : "resumed"}`,
      });
    } else {
      toast.error("Error", {
        description: res.message,
      });
    }
  };

  // ── Delete ──

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: "Delete coupon", description: "Delete this coupon? This action cannot be undone.", confirmLabel: "Delete" });
    if (!ok) return;
    const res = await vendorService.deleteCoupon(id);
    if (res.success) {
      setCoupons((prev) => prev.filter((c) => c._id !== id));
      toast.success("Success", { description: "Coupon deleted" });
    } else {
      toast.error("Error", {
        description: res.message,
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

    const payload: CreateCouponPayload = {
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
      ? await vendorService.updateCoupon(
          editCouponId,
          payload as UpdateCouponPayload,
        )
      : await vendorService.createCoupon(payload);

    if (res.success) {
      toast.success("Success", {
        description: editCouponId ? "Coupon updated" : "Coupon created",
      });
      setShowWizard(false);
      await loadCoupons();
    } else {
      // Map backend field errors back onto the wizard so they render inline
      // under the matching input, and jump to the step that owns the first one.
      const fieldErrors = getFieldErrors(extractApiError(res));
      if (fieldErrors.length > 0) {
        // Server field name → local wizard field key.
        const fieldMap: Record<string, string> = {
          startDate: "validFrom",
          endDate: "validTo",
        };
        // Local wizard field key → wizard step number.
        const stepOf: Record<string, number> = {
          code: 1,
          value: 1,
          minimumOrderAmount: 2,
          maxDiscount: 2,
          applicableRestaurants: 2,
          validFrom: 3,
          validTo: 3,
          usageLimit: 3,
        };

        const mapped: Record<string, string> = {};
        for (const fe of fieldErrors) {
          const key = fieldMap[fe.field] ?? fe.field;
          mapped[key] = fe.message;
        }
        setWizardErrors(mapped);

        const firstKey = fieldMap[fieldErrors[0].field] ?? fieldErrors[0].field;
        if (stepOf[firstKey]) setWizardStep(stepOf[firstKey]);

        toast.error("Please fix the highlighted fields", {
          description: fieldErrors[0].message,
        });
      } else {
        toast.error("Error", {
          description: getErrorMessage(res),
        });
      }
    }
    setWizardSaving(false);
  };

  // ── Loading state ──

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions"
        description="Create and manage coupons and discount offers"
        actions={
          <Button onClick={openCreateWizard} variant="brand" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Coupon
          </Button>
        }
      />

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <VendorEmptyState
          icon={Tag}
          title="No coupons yet"
          description="Create your first promotion to attract more customers."
          action={{
            label: "Create First Coupon",
            onClick: openCreateWizard,
            icon: Plus,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

      {/* Wizard */}
      <CouponWizardModal
        open={showWizard}
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
  const status = getStatusBadge(coupon);

  const statOrders = stats?.stats?.totalOrders ?? stats?.totalUses ?? 0;
  const statRevenue = stats?.stats?.totalRevenue ?? stats?.totalRevenue ?? 0;
  const redemptionRate =
    limit > 0 ? `${Math.round((used / limit) * 100)}%` : "—";

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Top row: code + status */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-accent p-2.5 text-primary">
            {coupon.type === "percentage" ? (
              <Percent className="h-5 w-5" />
            ) : (
              <DollarSign className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="font-mono font-bold tracking-wider text-foreground">
              {coupon.code}
            </h3>
            <p className="text-sm text-muted-foreground">
              {coupon.type === "percentage"
                ? `${formatNumber(coupon.value)}% off`
                : `${formatCurrency(coupon.value)} off`}
              {coupon.minimumOrderAmount || coupon.minOrderAmount
                ? ` · Min ${formatCurrency(
                    coupon.minimumOrderAmount ?? coupon.minOrderAmount,
                  )}`
                : ""}
            </p>
          </div>
        </div>

        {/* Pause / Resume toggle via StatusBadge */}
        {!expired ? (
          <button
            type="button"
            onClick={onToggleActive}
            title={coupon.isActive ? "Click to pause" : "Click to resume"}
            className="rounded-full transition-opacity hover:opacity-80"
          >
            <StatusBadge label={status.label} tone={status.tone} icon={false} />
          </button>
        ) : (
          <StatusBadge label="Expired" tone="danger" icon={false} />
        )}
      </div>

      {/* Expiry countdown */}
      <div
        className={cn(
          "mb-3 inline-flex items-center gap-1.5 text-xs font-medium",
          expiryInfo.color,
        )}
      >
        <Clock className="h-3.5 w-3.5" />
        {expiryInfo.text}
        {!expired && daysRemaining(endDate) < 3 && (
          <AlertTriangle className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Date range */}
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(coupon.startDate || coupon.validFrom)}
          {" – "}
          {formatDate(endDate)}
        </span>
      </div>

      {/* Usage progress bar */}
      {limit > 0 && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Usage</span>
            <span>
              {used}/{limit}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                usagePct >= 90
                  ? "bg-destructive"
                  : usagePct >= 70
                    ? "bg-primary"
                    : "bg-primary/70",
              )}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats section (loaded on demand) */}
      {stats && (
        <div className="mb-3 grid grid-cols-3 gap-3">
          <StatCard label="Orders" value={formatNumber(statOrders)} />
          <StatCard label="Revenue" value={formatCurrency(statRevenue)} />
          <StatCard label="Redemption" value={redemptionRate} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onToggleStats}
          className="rounded-lg p-1.5 transition-colors hover:bg-muted"
          title="View statistics"
        >
          {statsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <BarChart3
              className={cn(
                "h-4 w-4",
                stats ? "text-primary" : "text-muted-foreground",
              )}
            />
          )}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg p-1.5 transition-colors hover:bg-muted"
          title="Edit coupon"
        >
          <Edit className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto rounded-lg p-1.5 transition-colors hover:bg-destructive/10"
          title="Delete coupon"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      </div>
    </div>
  );
};

// ── Wizard Modal ─────────────────────────────────────────────────────

const CouponWizardModal: React.FC<{
  open: boolean;
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
  open,
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

  const footer = (
    <div className="flex w-full items-center justify-between">
      <Button
        type="button"
        variant="outline"
        onClick={currentStep === 1 ? onClose : onBack}
        className="gap-1.5"
        disabled={saving}
      >
        <ChevronLeft className="h-4 w-4" />
        {currentStep === 1 ? "Cancel" : "Back"}
      </Button>

      {isLastStep ? (
        <Button onClick={onSubmit} disabled={saving} variant="brand" className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isEdit ? "Update Coupon" : "Create Coupon"}
        </Button>
      ) : (
        <Button onClick={onNext} className="gap-1.5">
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={isEdit ? "Edit Coupon" : "Create Coupon"}
      size="lg"
      footer={footer}
    >
      {/* ── Step Progress Indicator ── */}
      <div className="relative mx-auto mb-8 flex w-full max-w-md items-center justify-between">
        {/* Background line */}
        <div className="absolute left-0 right-0 top-5 h-0.5 rounded bg-border" />
        {/* Animated progress line */}
        <div
          className="absolute left-0 top-5 h-0.5 rounded bg-primary transition-all duration-500 ease-in-out"
          style={{
            width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
          }}
        />

        {STEPS.map((step) => {
          const isCompleted = step.num < currentStep;
          const isCurrent = step.num === currentStep;

          return (
            <div key={step.num} className="z-10 flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300",
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-md"
                    : isCurrent
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : step.num}
              </div>
              <span
                className={cn(
                  "mt-1.5 whitespace-nowrap text-xs font-medium",
                  isCurrent
                    ? "text-primary"
                    : isCompleted
                      ? "text-emerald-600"
                      : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[220px]">{renderStep()}</div>
    </FormDialog>
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
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
        Step 1 of 4
      </p>
      <h3 className="text-lg font-semibold text-foreground">Discount Type</h3>
      <p className="mt-1 text-sm text-muted-foreground">
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
        className={cn(
          "mt-1 font-mono uppercase tracking-wider",
          errors.code && "border-destructive focus-visible:ring-destructive/20",
        )}
        maxLength={20}
      />
      {errors.code && (
        <p className="mt-1 text-xs text-destructive">{errors.code}</p>
      )}
      {!errors.code && data.code && (
        <p className="mt-1 text-xs text-muted-foreground">
          Customers will enter this code at checkout
        </p>
      )}
    </div>

    {/* Discount Type selector */}
    <div>
      <Label>Discount Type</Label>
      <div className="mt-1.5 grid grid-cols-2 gap-3">
        {(["percentage", "fixed"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange("type", type)}
            className={cn(
              "flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all",
              data.type === type
                ? "border-primary bg-accent text-primary"
                : "border-border bg-card text-muted-foreground hover:border-input",
            )}
          >
            {type === "percentage" ? (
              <Percent className="h-5 w-5" />
            ) : (
              <DollarSign className="h-5 w-5" />
            )}
            <div className="text-left">
              <p className="font-medium">
                {type === "percentage" ? "Percentage" : "Fixed Amount"}
              </p>
              <p className="text-xs font-normal opacity-75">
                {type === "percentage" ? "% off total" : "৳ off total"}
              </p>
            </div>
            {data.type === type && (
              <Check className="ml-auto h-4 w-4 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>

    {/* Value */}
    <div>
      <Label htmlFor="value">
        Discount Value {data.type === "percentage" ? "(%)" : "(৳)"}
      </Label>
      <div className="relative mt-1">
        {data.type === "fixed" && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
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
          className={cn(
            "mt-0",
            data.type === "fixed" && "pl-7",
            errors.value &&
              "border-destructive focus-visible:ring-destructive/20",
          )}
        />
        {data.type === "percentage" && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            %
          </span>
        )}
      </div>
      {errors.value && (
        <p className="mt-1 text-xs text-destructive">{errors.value}</p>
      )}
      {data.type === "percentage" && data.value > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Customer saves {formatNumber(data.value)}% on their order total
        </p>
      )}
      {data.type === "fixed" && data.value > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Customer saves {formatCurrency(data.value)} on their order total
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
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
          Step 2 of 4
        </p>
        <h3 className="text-lg font-semibold text-foreground">Conditions</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Set order minimums and choose where the coupon applies.
        </p>
      </div>

      {/* Minimum Order Amount */}
      <div>
        <Label htmlFor="minOrder">Minimum Order Amount (৳)</Label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
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
        <p className="mt-1 text-xs text-muted-foreground">
          Leave empty for no minimum order requirement
        </p>
      </div>

      {/* Max Discount (only for percentage coupons) */}
      {data.type === "percentage" && (
        <div>
          <Label htmlFor="maxDiscount">Maximum Discount Amount (৳)</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
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
          <p className="mt-1 text-xs text-muted-foreground">
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
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>
        <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
          {restaurants.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No restaurants available
            </p>
          ) : (
            restaurants.map((r) => {
              const selected = data.applicableRestaurants.includes(r._id);
              return (
                <label
                  key={r._id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg p-2 text-sm transition-colors",
                    selected
                      ? "bg-accent text-primary"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleRestaurant(r._id)}
                  />
                  <span className="flex-1">{r.name}</span>
                  {selected && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </label>
              );
            })
          )}
        </div>
        {errors.applicableRestaurants && (
          <p className="mt-1 text-xs text-destructive">
            {errors.applicableRestaurants}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
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
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
        Step 3 of 4
      </p>
      <h3 className="text-lg font-semibold text-foreground">
        Duration &amp; Limits
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
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
          className={cn(
            "mt-1",
            errors.validFrom &&
              "border-destructive focus-visible:ring-destructive/20",
          )}
        />
        {errors.validFrom && (
          <p className="mt-1 text-xs text-destructive">{errors.validFrom}</p>
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
          className={cn(
            "mt-1",
            errors.validTo &&
              "border-destructive focus-visible:ring-destructive/20",
          )}
        />
        {errors.validTo && (
          <p className="mt-1 text-xs text-destructive">{errors.validTo}</p>
        )}
      </div>
    </div>

    {/* Usage Limit */}
    <div>
      <Label htmlFor="usageLimit">
        Usage Limit{" "}
        <span className="font-normal text-muted-foreground">(optional)</span>
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
      <p className="mt-1 text-xs text-muted-foreground">
        Maximum number of times this coupon can be used. Leave empty for
        unlimited.
      </p>
    </div>

    {/* Duration preview */}
    {data.validFrom && data.validTo && (
      <div className="rounded-lg border border-border bg-muted p-3">
        <p className="mb-1 text-xs font-medium text-foreground">
          Duration Preview
        </p>
        <p className="text-sm text-muted-foreground">
          {formatDate(data.validFrom)}
          {" – "}
          {formatDate(data.validTo)}
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
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
          Step 4 of 4
        </p>
        <h3 className="text-lg font-semibold text-foreground">
          Review &amp; Confirm
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify all details below before{" "}
          {data.code ? "creating" : "saving"} the coupon.
        </p>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-muted">
        {/* Discount section */}
        <div className="p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Percent className="h-3.5 w-3.5" />
            Discount
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Code</span>
            <span className="font-mono text-sm font-bold tracking-wider text-foreground">
              {data.code || "—"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Type</span>
            <span className="text-sm font-medium text-foreground">
              {data.type === "percentage" ? `Percentage` : `Fixed Amount`}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Value</span>
            <span className="text-sm font-semibold text-primary">
              {data.type === "percentage"
                ? `${formatNumber(data.value)}% off`
                : `${formatCurrency(data.value)} off`}
            </span>
          </div>
        </div>

        {/* Conditions section */}
        <div className="p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Conditions
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Minimum Order</span>
            <span className="text-sm font-medium text-foreground">
              {data.minimumOrderAmount
                ? formatCurrency(data.minimumOrderAmount)
                : "None"}
            </span>
          </div>
          {data.type === "percentage" && data.maxDiscount && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Max Discount</span>
              <span className="text-sm font-medium text-foreground">
                {formatCurrency(data.maxDiscount)}
              </span>
            </div>
          )}
          <div className="mt-3">
            <span className="text-sm text-muted-foreground">Applicable to</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {selectedRestaurantNames.length > 0 ? (
                selectedRestaurantNames.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-destructive">
                  No restaurants selected
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {data.applicableRestaurants.length} of {restaurants.length}{" "}
              restaurant{restaurants.length !== 1 ? "s" : ""} selected
            </p>
          </div>
        </div>

        {/* Duration & Limits section */}
        <div className="p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Duration &amp; Limits
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valid From</span>
            <span className="text-sm font-medium text-foreground">
              {data.validFrom ? formatDate(data.validFrom) : "—"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valid To</span>
            <span className="text-sm font-medium text-foreground">
              {data.validTo ? formatDate(data.validTo) : "—"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Usage Limit</span>
            <span className="text-sm font-medium text-foreground">
              {data.usageLimit ? `${data.usageLimit} uses` : "Unlimited"}
            </span>
          </div>
        </div>
      </div>

      {/* Validation summary */}
      {!hasRequiredFields && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Incomplete coupon
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
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
