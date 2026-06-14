import React, { useEffect, useState } from "react";
import {
    Save,
    Loader2,
    User,
    Building,
    Clock,
    CreditCard,
    Bell,
    Store,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader, SectionCard, StatusBadge } from "@/components/vendor";
import vendorService from "@/services/vendorService";
import { useAuth } from "@/contexts/AuthContext";
import { useVendor } from "@/contexts/VendorContext";
import { toast } from "@/lib/toast";
import type {
    VendorProfile,
    VendorNotificationSettings,
} from "@/types/vendor";

// ── Days ─────────────────────────────────────────────────────────

const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Operating Hours Preview ──────────────────────────────────────

const HoursPreview: React.FC<{
    hours: { day: string; openTime: string; closeTime: string; isOpen: boolean }[];
}> = ({ hours }) => {
    const formatTime = (t: string) => {
        if (!t || !/^\d{2}:\d{2}$/.test(t)) return "--:--";
        const [h, m] = t.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
    };

    return (
        <div className="space-y-1 text-sm">
            {hours.map((h, i) => (
                <div
                    key={h.day}
                    className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${
                        i === 0
                            ? "bg-accent font-medium text-primary"
                            : "text-muted-foreground"
                    }`}
                >
                    <span className="w-10 text-xs font-medium text-muted-foreground">
                        {SHORT_DAYS[i]}
                    </span>
                    <span>
                        {h.isOpen
                            ? `${formatTime(h.openTime)} – ${formatTime(h.closeTime)}`
                            : "Closed"}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ── Save button helper ───────────────────────────────────────────

const SaveButton: React.FC<{
    onClick: () => void;
    loading: boolean;
    disabled?: boolean;
    label: string;
}> = ({ onClick, loading, disabled, label }) => (
    <Button
        variant="brand"
        onClick={onClick}
        disabled={loading || disabled}
        className="gap-2"
    >
        {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
            <Save className="h-4 w-4" />
        )}
        {label}
    </Button>
);

// ── Main Page ────────────────────────────────────────────────────

const VendorSettingsPage: React.FC = () => {
    const { user } = useAuth();
    const { selectedRestaurantId } = useVendor();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // Profile
    const [, setProfile] = useState<VendorProfile | null>(null);
    const [businessName, setBusinessName] = useState("");
    const [businessLicense, setBusinessLicense] = useState("");
    const [taxId, setTaxId] = useState("");

    // Bank details
    const [bankDetails, setBankDetails] = useState<Record<string, string>>({
        accountName: "",
        accountNumber: "",
        bankName: "",
        branchName: "",
        routingNumber: "",
    });

    // Operating hours
    const [operatingHours, setOperatingHours] = useState(
        DAYS.map((day) => ({
            day,
            openTime: "09:00",
            closeTime: "22:00",
            isOpen: day !== "Friday",
        })),
    );

    // Restaurant toggle
    const [isTemporarilyClosed, setIsTemporarilyClosed] = useState(false);
    const [closureReason, setClosureReason] = useState("");

    // Notification & auto-accept
    const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
    const [notifications, setNotifications] = useState<VendorNotificationSettings>({
        emailOnNewOrder: true,
        lowStockAlerts: false,
        reviewAlerts: true,
        promotionPerformance: false,
    });

    useEffect(() => {
        const load = async () => {
            try {
                const res = await vendorService.getProfile();
                if (res.success && res.data) {
                    const p = res.data;
                    setProfile(p.vendorProfile || p);
                    setBusinessName(p.businessName || p.vendorProfile?.businessName || "");
                    setBusinessLicense(p.vendorProfile?.businessLicense || "");
                    setTaxId(p.vendorProfile?.taxId || "");

                    if (p.vendorProfile?.bankDetails && typeof p.vendorProfile.bankDetails === "object") {
                        setBankDetails((prev) => ({
                            ...prev,
                            ...(p.vendorProfile!.bankDetails as Record<string, string>),
                        }));
                    }
                    if (p.vendorProfile?.autoAcceptOrders !== undefined) {
                        setAutoAcceptOrders(p.vendorProfile.autoAcceptOrders);
                    }
                    if (p.vendorProfile?.notificationSettings) {
                        setNotifications((prev) => ({
                            ...prev,
                            ...p.vendorProfile!.notificationSettings,
                        }));
                    }
                }

                // Load restaurant details for operating hours and temp closed
                if (selectedRestaurantId) {
                    const restRes = await vendorService.getRestaurants();
                    if (restRes.success && restRes.data) {
                        const restaurant = restRes.data.restaurants.find(
                            (r: { _id: string }) => r._id === selectedRestaurantId,
                        );
                        if (restaurant) {
                            if (restaurant.operatingHours?.length) {
                                setOperatingHours(
                                    DAYS.map((day) => {
                                        const found = restaurant.operatingHours.find(
                                            (h: { day: string }) => h.day === day,
                                        );
                                        return found
                                            ? { day, openTime: found.openTime, closeTime: found.closeTime, isOpen: found.isOpen }
                                            : { day, openTime: "09:00", closeTime: "22:00", isOpen: true };
                                    }),
                                );
                            }
                            setIsTemporarilyClosed(restaurant.isTemporarilyClosed || false);
                            setClosureReason(restaurant.closureReason || "");
                        }
                    }
                }
            } catch {
                // Ignore load errors
            }
            setLoading(false);
        };
        load();
    }, [user?.email, selectedRestaurantId]);

    const handleSaveProfile = async () => {
        setSaving("profile");
        const res = await vendorService.updateProfile({
            businessName,
            businessLicense,
            taxId,
        });
        if (res.success) {
            toast.success("Success", { description: "Business details updated" });
        } else {
            toast.error("Error", { description: res.message });
        }
        setSaving(null);
    };

    const handleSaveBank = async () => {
        setSaving("bank");
        const res = await vendorService.updateProfile({ bankDetails });
        if (res.success) {
            toast.success("Success", { description: "Bank details updated" });
        } else {
            toast.error("Error", { description: res.message });
        }
        setSaving(null);
    };

    const handleSaveNotifications = async () => {
        setSaving("notifications");
        const res = await vendorService.updateProfile({
            autoAcceptOrders,
            notificationSettings: notifications,
        });
        if (res.success) {
            toast.success("Success", { description: "Preferences updated" });
        } else {
            toast.error("Error", { description: res.message });
        }
        setSaving(null);
    };

    const handleSaveRestaurant = async () => {
        if (!selectedRestaurantId) return;
        setSaving("restaurant");
        const res = await vendorService.updateRestaurant(selectedRestaurantId, {
            operatingHours,
            isTemporarilyClosed,
            closureReason,
        } as never);
        if (res.success) {
            toast.success("Success", { description: "Restaurant settings updated" });
        } else {
            toast.error("Error", { description: res.message });
        }
        setSaving(null);
    };

    const updateDayHours = (
        index: number,
        field: "openTime" | "closeTime" | "isOpen",
        value: string | boolean,
    ) => {
        setOperatingHours((prev) =>
            prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const hasInvalidHours = operatingHours.some(
        (h) =>
            h.isOpen &&
            h.openTime &&
            h.closeTime &&
            h.openTime >= h.closeTime,
    );

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title="Settings"
                description="Manage your account, business details, payouts, hours, and notifications."
            />

            {/* Account info */}
            <SectionCard
                title="Account"
                description="Your personal account information."
                icon={<User className="h-5 w-5" />}
            >
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                    <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium text-foreground">
                            {user?.firstName} {user?.lastName}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-foreground">{user?.email}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Role</p>
                        <p className="font-medium capitalize text-foreground">
                            {user?.role}
                        </p>
                    </div>
                </div>
            </SectionCard>

            {/* Business Details */}
            <SectionCard
                title="Business Details"
                description="Legal name and identifiers for your business."
                icon={<Building className="h-5 w-5" />}
                footer={
                    <div className="flex justify-end">
                        <SaveButton
                            onClick={handleSaveProfile}
                            loading={saving === "profile"}
                            label="Save Business Details"
                        />
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <Label>Business Name</Label>
                        <Input
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="Your business name"
                            className="mt-1"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Business License</Label>
                            <Input
                                value={businessLicense}
                                onChange={(e) => setBusinessLicense(e.target.value)}
                                placeholder="License number"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Tax ID</Label>
                            <Input
                                value={taxId}
                                onChange={(e) => setTaxId(e.target.value)}
                                placeholder="Tax identification"
                                className="mt-1"
                            />
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* Bank Details */}
            <SectionCard
                title="Bank Details"
                description="Used for payouts and stored securely."
                icon={<CreditCard className="h-5 w-5" />}
                footer={
                    <div className="flex justify-end">
                        <SaveButton
                            onClick={handleSaveBank}
                            loading={saving === "bank"}
                            label="Save Bank Details"
                        />
                    </div>
                }
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <Label>Account Holder Name</Label>
                        <Input
                            value={bankDetails.accountName || ""}
                            onChange={(e) =>
                                setBankDetails({ ...bankDetails, accountName: e.target.value })
                            }
                            placeholder="Full name on account"
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label>Account Number</Label>
                        <Input
                            value={bankDetails.accountNumber || ""}
                            onChange={(e) =>
                                setBankDetails({ ...bankDetails, accountNumber: e.target.value })
                            }
                            placeholder="Bank account number"
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label>Bank Name</Label>
                        <Input
                            value={bankDetails.bankName || ""}
                            onChange={(e) =>
                                setBankDetails({ ...bankDetails, bankName: e.target.value })
                            }
                            placeholder="e.g. Dutch-Bangla Bank"
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label>Branch Name</Label>
                        <Input
                            value={bankDetails.branchName || ""}
                            onChange={(e) =>
                                setBankDetails({ ...bankDetails, branchName: e.target.value })
                            }
                            placeholder="Branch"
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label>Routing Number</Label>
                        <Input
                            value={bankDetails.routingNumber || ""}
                            onChange={(e) =>
                                setBankDetails({ ...bankDetails, routingNumber: e.target.value })
                            }
                            placeholder="Routing number"
                            className="mt-1"
                        />
                    </div>
                </div>
            </SectionCard>

            {/* Operating Hours */}
            <SectionCard
                title="Operating Hours"
                description="Set your weekly schedule. Customers see these times on your storefront."
                icon={<Clock className="h-5 w-5" />}
                footer={
                    <div className="flex justify-end">
                        <SaveButton
                            onClick={handleSaveRestaurant}
                            loading={saving === "restaurant"}
                            disabled={!selectedRestaurantId}
                            label="Save Hours"
                        />
                    </div>
                }
            >
                <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
                    {/* Left: weekly grid */}
                    <div className="space-y-1">
                        {operatingHours.map((h, i) => (
                            <div
                                key={h.day}
                                className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                            >
                                <span className="w-24 text-sm font-medium text-foreground">
                                    {h.day}
                                </span>
                                {h.isOpen ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={h.openTime}
                                            onChange={(e) =>
                                                updateDayHours(i, "openTime", e.target.value)
                                            }
                                            className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                        <span className="text-muted-foreground">to</span>
                                        <input
                                            type="time"
                                            value={h.closeTime}
                                            onChange={(e) =>
                                                updateDayHours(i, "closeTime", e.target.value)
                                            }
                                            className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-sm italic text-muted-foreground">
                                        Closed
                                    </span>
                                )}
                                <div className="ml-auto flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {h.isOpen ? "Open" : "Closed"}
                                    </span>
                                    <Switch
                                        checked={h.isOpen}
                                        onCheckedChange={(v) => updateDayHours(i, "isOpen", v)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: live preview */}
                    <div className="rounded-xl border border-border bg-muted p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Live Preview
                        </p>
                        <p className="mb-3 mt-1 text-sm font-semibold text-foreground">
                            Opening Hours
                        </p>
                        <HoursPreview hours={operatingHours} />

                        {/* Inconsistency warning */}
                        {hasInvalidHours && (
                            <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>
                                    Some days have close time before or equal to open time.
                                    This will show as closed to customers.
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </SectionCard>

            {/* Restaurant Status Override */}
            <SectionCard
                title="Restaurant Status"
                description="Override your schedule for unexpected closures."
                icon={<Store className="h-5 w-5" />}
                actions={
                    isTemporarilyClosed ? (
                        <StatusBadge label="Temporarily closed" tone="warning" />
                    ) : (
                        <StatusBadge label="Open as scheduled" tone="success" />
                    )
                }
                footer={
                    <div className="flex justify-end">
                        <SaveButton
                            onClick={handleSaveRestaurant}
                            loading={saving === "restaurant"}
                            disabled={!selectedRestaurantId}
                            label="Save Status"
                        />
                    </div>
                }
            >
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                Temporarily Closed
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Override your schedule — customers will see your restaurant
                                as closed regardless of operating hours.
                            </p>
                        </div>
                        <Switch
                            checked={isTemporarilyClosed}
                            onCheckedChange={setIsTemporarilyClosed}
                        />
                    </div>
                    {isTemporarilyClosed && (
                        <div>
                            <Label>Reason (visible to customers)</Label>
                            <Input
                                value={closureReason}
                                onChange={(e) => setClosureReason(e.target.value)}
                                placeholder="e.g. Renovation works, will reopen next week"
                                className="mt-1"
                            />
                        </div>
                    )}
                </div>
            </SectionCard>

            {/* Notification Preferences & Auto-accept */}
            <SectionCard
                title="Notification Preferences"
                description="Choose how you receive order and performance updates."
                icon={<Bell className="h-5 w-5" />}
                footer={
                    <div className="flex justify-end">
                        <SaveButton
                            onClick={handleSaveNotifications}
                            loading={saving === "notifications"}
                            label="Save Preferences"
                        />
                    </div>
                }
            >
                <div className="divide-y divide-border">
                    <div className="flex items-center justify-between pb-4">
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                Auto-accept Orders
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Automatically confirm incoming orders without manual approval.
                            </p>
                        </div>
                        <Switch
                            checked={autoAcceptOrders}
                            onCheckedChange={setAutoAcceptOrders}
                        />
                    </div>

                    {(
                        [
                            { key: "emailOnNewOrder", label: "Email on new order" },
                            { key: "lowStockAlerts", label: "Low stock alerts" },
                            { key: "reviewAlerts", label: "New review alerts" },
                            {
                                key: "promotionPerformance",
                                label: "Promotion performance reports",
                            },
                        ] as { key: keyof VendorNotificationSettings; label: string }[]
                    ).map((item) => (
                        <div
                            key={item.key}
                            className="flex items-center justify-between py-3"
                        >
                            <p className="text-sm text-foreground">{item.label}</p>
                            <Switch
                                checked={notifications[item.key] as boolean}
                                onCheckedChange={(v) =>
                                    setNotifications({ ...notifications, [item.key]: v })
                                }
                            />
                        </div>
                    ))}
                </div>
            </SectionCard>
        </div>
    );
};

export default VendorSettingsPage;
