import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";

interface PlatformSettings {
  platformName: string;
  contactEmail: string;
  defaultCommissionRate: number;
  defaultDeliveryFee: number;
  minimumOrderValue: number;
  maxDeliveryRadiusKm: number;
  currency: string;
  locale: string;
  payoutSchedule: string;
  minimumPayoutThreshold: number;
  featureFlags: {
    scheduledOrders: boolean;
    referralProgram: boolean;
    loyaltyTiers: boolean;
    campaignAutoApply: boolean;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 pt-5 border-t border-gray-100 first:border-t-0 first:pt-0">
    {children}
  </h2>
);

const Field: React.FC<{
  label: string;
  value: string | number;
  type?: string;
  onChange: (v: string) => void;
  suffix?: string;
}> = ({ label, value, type = "text", onChange, suffix }) => (
  <div>
    <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>
      )}
    </div>
  </div>
);

const Toggle: React.FC<{ label: string; description?: string; value: boolean; onChange: (v: boolean) => void }> = ({
  label, description, value, onChange,
}) => (
  <div className="flex items-start gap-4">
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {description && <p className="text-xs text-gray-400">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? "bg-indigo-600" : "bg-gray-200"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : ""}`} />
    </button>
  </div>
);

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    adminService.getSettings()
      .then((res) => setSettings((res.data as { data: { settings: PlatformSettings } }).data.settings))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await adminService.updateSettings(settings as unknown as Record<string, unknown>);
      toast({ title: "Saved", description: "Platform settings updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) =>
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);

  const setFlag = (key: keyof PlatformSettings["featureFlags"], value: boolean) =>
    setSettings((prev) => prev ? { ...prev, featureFlags: { ...prev.featureFlags, [key]: value } } : prev);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-[3px] border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-5 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-sm text-gray-500">System-wide configuration</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </motion.div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <SectionLabel>General</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Platform Name" value={settings.platformName} onChange={(v) => set("platformName", v)} />
          <Field label="Contact Email" value={settings.contactEmail} type="email" onChange={(v) => set("contactEmail", v)} />
          <Field label="Currency" value={settings.currency} onChange={(v) => set("currency", v)} />
          <Field label="Locale" value={settings.locale} onChange={(v) => set("locale", v)} />
        </div>

        <SectionLabel>Financial</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Default Commission Rate" value={settings.defaultCommissionRate} type="number"
            onChange={(v) => set("defaultCommissionRate", parseFloat(v))} suffix="%" />
          <Field label="Default Delivery Fee" value={settings.defaultDeliveryFee} type="number"
            onChange={(v) => set("defaultDeliveryFee", parseFloat(v))} suffix="BDT" />
          <Field label="Minimum Order Value" value={settings.minimumOrderValue} type="number"
            onChange={(v) => set("minimumOrderValue", parseFloat(v))} suffix="BDT" />
          <Field label="Minimum Payout Threshold" value={settings.minimumPayoutThreshold} type="number"
            onChange={(v) => set("minimumPayoutThreshold", parseFloat(v))} suffix="BDT" />
        </div>

        <SectionLabel>Delivery</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Max Delivery Radius" value={settings.maxDeliveryRadiusKm} type="number"
            onChange={(v) => set("maxDeliveryRadiusKm", parseFloat(v))} suffix="km" />
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Payout Schedule</label>
            <select
              value={settings.payoutSchedule}
              onChange={(e) => set("payoutSchedule", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <SectionLabel>Feature Flags</SectionLabel>
        <div className="space-y-3">
          <Toggle label="Scheduled Orders" description="Allow customers to schedule future orders"
            value={settings.featureFlags.scheduledOrders} onChange={(v) => setFlag("scheduledOrders", v)} />
          <Toggle label="Referral Program" description="Enable referral codes and rewards"
            value={settings.featureFlags.referralProgram} onChange={(v) => setFlag("referralProgram", v)} />
          <Toggle label="Loyalty Tiers" description="Bronze / Silver / Gold tier progression"
            value={settings.featureFlags.loyaltyTiers} onChange={(v) => setFlag("loyaltyTiers", v)} />
          <Toggle label="Campaign Auto-Apply" description="Automatically apply eligible campaigns at checkout"
            value={settings.featureFlags.campaignAutoApply} onChange={(v) => setFlag("campaignAutoApply", v)} />
        </div>

        <SectionLabel>Maintenance Mode</SectionLabel>
        <div className="space-y-3">
          <Toggle
            label="Maintenance Mode"
            description="Take the platform offline for all non-whitelisted users"
            value={settings.featureFlags.maintenanceMode}
            onChange={(v) => setFlag("maintenanceMode", v)}
          />
          {settings.featureFlags.maintenanceMode && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Maintenance Message</label>
              <textarea
                value={settings.featureFlags.maintenanceMessage}
                onChange={(e) => setFlag("maintenanceMessage" as keyof PlatformSettings["featureFlags"] & string, e.target.value as unknown as boolean)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                placeholder="We're down for maintenance. Back soon!"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
