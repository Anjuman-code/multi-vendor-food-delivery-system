import { PageHeader, SectionCard } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface FeatureFlags {
  scheduledOrders: boolean;
  referralProgram: boolean;
  loyaltyTiers: boolean;
  campaignAutoApply: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

interface PlatformSettings {
  platformName: string;
  contactEmail: string;
  defaultCommissionRate: number;
  defaultDeliveryFee: number;
  minimumOrderValue: number;
  maxDeliveryRadiusKm: number;
  currency: string;
  locale: string;
  payoutSchedule: "weekly" | "biweekly" | "monthly";
  minimumPayoutThreshold: number;
  featureFlags: FeatureFlags;
}

/** Editable numeric fields are kept as strings so empty input is distinguishable from NaN. */
type NumericKey =
  | "defaultCommissionRate"
  | "defaultDeliveryFee"
  | "minimumOrderValue"
  | "maxDeliveryRadiusKm"
  | "minimumPayoutThreshold";

const NUMERIC_KEYS: NumericKey[] = [
  "defaultCommissionRate",
  "defaultDeliveryFee",
  "minimumOrderValue",
  "maxDeliveryRadiusKm",
  "minimumPayoutThreshold",
];

interface FormState {
  platformName: string;
  contactEmail: string;
  currency: string;
  locale: string;
  payoutSchedule: PlatformSettings["payoutSchedule"];
  featureFlags: FeatureFlags;
  // numeric-as-string
  defaultCommissionRate: string;
  defaultDeliveryFee: string;
  minimumOrderValue: string;
  maxDeliveryRadiusKm: string;
  minimumPayoutThreshold: string;
}

const toForm = (s: PlatformSettings): FormState => ({
  platformName: s.platformName ?? "",
  contactEmail: s.contactEmail ?? "",
  currency: s.currency ?? "",
  locale: s.locale ?? "",
  payoutSchedule: s.payoutSchedule ?? "weekly",
  featureFlags: {
    scheduledOrders: !!s.featureFlags?.scheduledOrders,
    referralProgram: !!s.featureFlags?.referralProgram,
    loyaltyTiers: !!s.featureFlags?.loyaltyTiers,
    campaignAutoApply: !!s.featureFlags?.campaignAutoApply,
    maintenanceMode: !!s.featureFlags?.maintenanceMode,
    maintenanceMessage: s.featureFlags?.maintenanceMessage ?? "",
  },
  defaultCommissionRate: String(s.defaultCommissionRate ?? ""),
  defaultDeliveryFee: String(s.defaultDeliveryFee ?? ""),
  minimumOrderValue: String(s.minimumOrderValue ?? ""),
  maxDeliveryRadiusKm: String(s.maxDeliveryRadiusKm ?? ""),
  minimumPayoutThreshold: String(s.minimumPayoutThreshold ?? ""),
});

type Errors = Partial<Record<NumericKey | "contactEmail" | "platformName", string>>;

const validate = (f: FormState): Errors => {
  const errs: Errors = {};

  if (!f.platformName.trim()) errs.platformName = "Platform name is required.";
  if (!f.contactEmail.trim()) errs.contactEmail = "Contact email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contactEmail.trim()))
    errs.contactEmail = "Enter a valid email address.";

  for (const key of NUMERIC_KEYS) {
    const raw = f[key].trim();
    if (raw === "") {
      errs[key] = "Required.";
      continue;
    }
    const n = parseFloat(raw);
    if (Number.isNaN(n)) {
      errs[key] = "Must be a number.";
      continue;
    }
    if (key === "defaultCommissionRate") {
      if (n < 0 || n > 100) errs[key] = "Must be between 0 and 100.";
    } else if (key === "maxDeliveryRadiusKm") {
      if (n < 1) errs[key] = "Must be at least 1.";
    } else if (n < 0) {
      errs[key] = "Cannot be negative.";
    }
  }
  return errs;
};

export default function PlatformSettingsPage() {
  const { toast } = useToast();
  const [baseline, setBaseline] = useState<FormState | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminService
      .getSettings()
      .then((res) => {
        const s = (res.data as { data: { settings: PlatformSettings } }).data.settings;
        const f = toForm(s);
        setForm(f);
        setBaseline(f);
      })
      .catch(() => toast({ title: "Failed to load settings", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const errors = useMemo(() => (form ? validate(form) : {}), [form]);
  const hasErrors = Object.keys(errors).length > 0;

  const dirty = useMemo(
    () => !!form && !!baseline && JSON.stringify(form) !== JSON.stringify(baseline),
    [form, baseline],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const setFlag = <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) =>
    setForm((prev) =>
      prev ? { ...prev, featureFlags: { ...prev.featureFlags, [key]: value } } : prev,
    );

  const handleSave = async () => {
    if (!form || hasErrors) return;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        platformName: form.platformName.trim(),
        contactEmail: form.contactEmail.trim(),
        currency: form.currency.trim(),
        locale: form.locale.trim(),
        payoutSchedule: form.payoutSchedule,
        featureFlags: form.featureFlags,
        defaultCommissionRate: parseFloat(form.defaultCommissionRate),
        defaultDeliveryFee: parseFloat(form.defaultDeliveryFee),
        minimumOrderValue: parseFloat(form.minimumOrderValue),
        maxDeliveryRadiusKm: parseFloat(form.maxDeliveryRadiusKm),
        minimumPayoutThreshold: parseFloat(form.minimumPayoutThreshold),
      };
      const res = await adminService.updateSettings(patch);
      const s = (res.data as { data: { settings: PlatformSettings } }).data.settings;
      const next = toForm(s);
      setForm(next);
      setBaseline(next);
      toast({ title: "Settings saved" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Platform Settings"
        description="System-wide configuration."
        actions={
          <Button variant="brand" size="sm" onClick={handleSave} disabled={!dirty || hasErrors || saving}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        }
      />

      {/* General */}
      <SectionCard title="General">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="platformName"
            label="Platform name"
            value={form.platformName}
            onChange={(v) => set("platformName", v)}
            error={errors.platformName}
          />
          <Field
            id="contactEmail"
            label="Contact email"
            type="email"
            value={form.contactEmail}
            onChange={(v) => set("contactEmail", v)}
            error={errors.contactEmail}
          />
          <Field
            id="currency"
            label="Currency"
            value={form.currency}
            onChange={(v) => set("currency", v)}
          />
          <Field
            id="locale"
            label="Locale"
            value={form.locale}
            onChange={(v) => set("locale", v)}
          />
        </div>
      </SectionCard>

      {/* Commerce */}
      <SectionCard title="Commerce">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="defaultCommissionRate"
            label="Default commission rate"
            type="number"
            suffix="%"
            value={form.defaultCommissionRate}
            onChange={(v) => set("defaultCommissionRate", v)}
            error={errors.defaultCommissionRate}
          />
          <Field
            id="defaultDeliveryFee"
            label="Default delivery fee"
            type="number"
            suffix="৳"
            value={form.defaultDeliveryFee}
            onChange={(v) => set("defaultDeliveryFee", v)}
            error={errors.defaultDeliveryFee}
          />
          <Field
            id="minimumOrderValue"
            label="Minimum order value"
            type="number"
            suffix="৳"
            value={form.minimumOrderValue}
            onChange={(v) => set("minimumOrderValue", v)}
            error={errors.minimumOrderValue}
          />
          <Field
            id="maxDeliveryRadiusKm"
            label="Max delivery radius"
            type="number"
            suffix="km"
            value={form.maxDeliveryRadiusKm}
            onChange={(v) => set("maxDeliveryRadiusKm", v)}
            error={errors.maxDeliveryRadiusKm}
          />
        </div>
      </SectionCard>

      {/* Payouts */}
      <SectionCard title="Payouts">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="payoutSchedule">Payout schedule</Label>
            <Select
              value={form.payoutSchedule}
              onValueChange={(v) =>
                set("payoutSchedule", v as PlatformSettings["payoutSchedule"])
              }
            >
              <SelectTrigger id="payoutSchedule">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field
            id="minimumPayoutThreshold"
            label="Minimum payout threshold"
            type="number"
            suffix="৳"
            value={form.minimumPayoutThreshold}
            onChange={(v) => set("minimumPayoutThreshold", v)}
            error={errors.minimumPayoutThreshold}
          />
        </div>
      </SectionCard>

      {/* Feature Flags */}
      <SectionCard title="Feature Flags">
        <div className="space-y-1">
          <Toggle
            label="Scheduled orders"
            description="Allow customers to schedule future orders."
            value={form.featureFlags.scheduledOrders}
            onChange={(v) => setFlag("scheduledOrders", v)}
          />
          <Toggle
            label="Referral program"
            description="Enable referral codes and rewards."
            value={form.featureFlags.referralProgram}
            onChange={(v) => setFlag("referralProgram", v)}
          />
          <Toggle
            label="Loyalty tiers"
            description="Bronze / Silver / Gold tier progression."
            value={form.featureFlags.loyaltyTiers}
            onChange={(v) => setFlag("loyaltyTiers", v)}
          />
          <Toggle
            label="Campaign auto-apply"
            description="Automatically apply eligible campaigns at checkout."
            value={form.featureFlags.campaignAutoApply}
            onChange={(v) => setFlag("campaignAutoApply", v)}
          />
          <div className="border-t border-border pt-1">
            <Toggle
              label="Maintenance mode"
              description="Take the platform offline for all non-whitelisted users."
              value={form.featureFlags.maintenanceMode}
              onChange={(v) => setFlag("maintenanceMode", v)}
            />
          </div>
          {form.featureFlags.maintenanceMode && (
            <div className="space-y-1.5 pt-3">
              <Label htmlFor="maintenanceMessage">Maintenance message</Label>
              <Textarea
                id="maintenanceMessage"
                value={form.featureFlags.maintenanceMessage}
                onChange={(e) => setFlag("maintenanceMessage", e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="We're down for maintenance. Back soon!"
              />
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

const Field: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  suffix?: string;
  error?: string;
}> = ({ id, label, value, onChange, type = "text", suffix, error }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    <div className="relative">
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={suffix ? "pr-10" : undefined}
        aria-invalid={!!error}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);

const Toggle: React.FC<{
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, value, onChange }) => (
  <div className="flex items-start justify-between gap-4 py-2.5">
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);
