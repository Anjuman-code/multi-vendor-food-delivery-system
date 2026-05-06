import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import vendorService from "@/services/vendorService";
import { useAuth } from "@/contexts/AuthContext";
import { useVendor } from "@/contexts/VendorContext";
import { useToast } from "@/hooks/use-toast";
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
        <div className="space-y-1.5 text-sm">
            {hours.map((h, i) => (
                <div
                    key={h.day}
                    className={`flex items-center justify-between py-1.5 px-3 rounded-lg ${i === 0 ? "bg-orange-50 font-medium text-orange-700" : "text-gray-600"}`}
                >
                    <span className="w-10 text-xs font-medium text-gray-500">
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

// ── Main Page ────────────────────────────────────────────────────

const VendorSettingsPage: React.FC = () => {
    const { user } = useAuth();
    const { selectedRestaurantId } = useVendor();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // Profile
    const [profile, setProfile] = useState<VendorProfile | null>(null);
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
            toast({ title: "Success", description: "Business details updated" });
        } else {
            toast({ title: "Error", description: res.message, variant: "destructive" });
        }
        setSaving(null);
    };

    const handleSaveBank = async () => {
        setSaving("bank");
        const res = await vendorService.updateProfile({ bankDetails });
        if (res.success) {
            toast({ title: "Success", description: "Bank details updated" });
        } else {
            toast({ title: "Error", description: res.message, variant: "destructive" });
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
            toast({ title: "Success", description: "Preferences updated" });
        } else {
            toast({ title: "Error", description: res.message, variant: "destructive" });
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
            toast({ title: "Success", description: "Restaurant settings updated" });
        } else {
            toast({ title: "Error", description: res.message, variant: "destructive" });
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
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Account info */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-6"
            >
                <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Account</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-gray-500 text-xs">Name</p>
                        <p className="font-medium text-gray-900">
                            {user?.firstName} {user?.lastName}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">Email</p>
                        <p className="font-medium text-gray-900">{user?.email}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">Role</p>
                        <p className="font-medium text-gray-900 capitalize">{user?.role}</p>
                    </div>
                </div>
            </motion.div>

            {/* Business Details */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
            >
                <div className="flex items-center gap-2 mb-2">
                    <Building className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Business Details</h2>
                </div>
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
                <div className="flex justify-end pt-2">
                    <Button
                        onClick={handleSaveProfile}
                        disabled={saving === "profile"}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
                    >
                        {saving === "profile" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Business Details
                    </Button>
                </div>
            </motion.div>

            {/* Bank Details (separated) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
            >
                <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Bank Details</h2>
                </div>
                <p className="text-xs text-gray-500 -mt-2">
                    This information is used for payouts and is stored securely.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="flex justify-end pt-2">
                    <Button
                        onClick={handleSaveBank}
                        disabled={saving === "bank"}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
                    >
                        {saving === "bank" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Bank Details
                    </Button>
                </div>
            </motion.div>

            {/* Operating Hours — two-column */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-xl border border-gray-200 p-6"
            >
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Operating Hours</h2>
                </div>
                <div className="editor-grid">
                    {/* Left: weekly grid */}
                    <div className="space-y-2">
                        {operatingHours.map((h, i) => (
                            <div
                                key={h.day}
                                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <span className="w-24 text-sm font-medium text-gray-700">
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
                                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                        />
                                        <span className="text-gray-400">to</span>
                                        <input
                                            type="time"
                                            value={h.closeTime}
                                            onChange={(e) =>
                                                updateDayHours(i, "closeTime", e.target.value)
                                            }
                                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-400 italic">Closed</span>
                                )}
                                <label className="ml-auto flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!h.isOpen}
                                        onChange={(e) =>
                                            updateDayHours(i, "isOpen", !e.target.checked)
                                        }
                                        className="sr-only peer"
                                    />
                                    <span className="text-xs text-gray-400 peer-checked:text-red-500">
                                        Closed
                                    </span>
                                    <Switch
                                        checked={h.isOpen}
                                        onCheckedChange={(v) => updateDayHours(i, "isOpen", v)}
                                    />
                                </label>
                            </div>
                        ))}
                    </div>

                    {/* Right: live preview */}
                    <div className="editor-preview-pane">
                        <p className="editor-preview-label">Live Preview</p>
                        <p className="text-sm font-semibold text-gray-900 mb-3">
                            Opening Hours
                        </p>
                        <HoursPreview hours={operatingHours} />

                        {/* Inconsistency warning */}
                        {operatingHours.some(
                            (h) =>
                                h.isOpen &&
                                h.openTime &&
                                h.closeTime &&
                                h.openTime >= h.closeTime,
                        ) && (
                            <div className="mt-4 flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-3">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>
                                    Some days have close time before or equal to open time.
                                    This will show as closed to customers.
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
                    <Button
                        onClick={handleSaveRestaurant}
                        disabled={saving === "restaurant" || !selectedRestaurantId}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
                    >
                        {saving === "restaurant" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Hours
                    </Button>
                </div>
            </motion.div>

            {/* Restaurant Status Override */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="bg-white rounded-xl border border-gray-200 p-6"
            >
                <div className="flex items-center gap-2 mb-4">
                    <Store className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        Restaurant Status
                    </h2>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            Temporarily Closed
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
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
                    <div className="mt-3">
                        <Label>Reason (visible to customers)</Label>
                        <Input
                            value={closureReason}
                            onChange={(e) => setClosureReason(e.target.value)}
                            placeholder="e.g. Renovation works, will reopen next week"
                            className="mt-1"
                        />
                    </div>
                )}
                <div className="flex justify-end pt-4">
                    <Button
                        onClick={handleSaveRestaurant}
                        disabled={saving === "restaurant" || !selectedRestaurantId}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
                    >
                        {saving === "restaurant" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Status
                    </Button>
                </div>
            </motion.div>

            {/* Notification Preferences & Auto-accept */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl border border-gray-200 p-6 space-y-5"
            >
                <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">
                        Notification Preferences
                    </h2>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            Auto-accept Orders
                        </p>
                        <p className="text-xs text-gray-500">
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
                        className="flex items-center justify-between"
                    >
                        <p className="text-sm text-gray-700">{item.label}</p>
                        <Switch
                            checked={notifications[item.key] as boolean}
                            onCheckedChange={(v) =>
                                setNotifications({ ...notifications, [item.key]: v })
                            }
                        />
                    </div>
                ))}

                <div className="flex justify-end pt-2 border-t border-gray-100">
                    <Button
                        onClick={handleSaveNotifications}
                        disabled={saving === "notifications"}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
                    >
                        {saving === "notifications" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Preferences
                    </Button>
                </div>
            </motion.div>
        </div>
    );
};

export default VendorSettingsPage;
