import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  User,
  Mail,
  Phone,
  Shield,
  Edit3,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Plus,
  Trash2,
  Star,
  Home,
  Briefcase,
  Eye,
  EyeOff,
  Loader2,
  Bell,
  Heart,
  Award,
  X,
  Save,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import authService from "@/services/authService";
import userService from "@/services/userService";
import type {
  UserProfile,
  CustomerProfile,
  UserAddress,
  NotificationPreferences,
} from "@/services/userService";
import {
  updateProfileSchema,
  changePasswordSchema,
  addAddressSchema,
  deactivateAccountSchema,
  type UpdateProfileFormData,
  type ChangePasswordFormData,
  type AddAddressFormData,
  type DeactivateAccountFormData,
} from "@/lib/validation";

// ── Section Tab Type ───────────────────────────────────────────
type ProfileTab = "profile" | "addresses" | "preferences" | "security";

// ── Main Profile Page ──────────────────────────────────────────
const ProfilePage: React.FC = () => {
  const {
    user,
    isAuthenticated,
    logout: logoutContext,
    updateUser,
  } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch full profile from API
  const fetchProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    const res = await userService.getProfile();
    if (res.success && res.data) {
      setProfile(res.data.user);
      setCustomerProfile(res.data.customerProfile);
    } else {
      toast({
        title: "Error",
        description: res.message || "Failed to load profile",
        variant: "destructive",
      });
    }
    setIsLoadingProfile(false);
  }, [toast]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated, fetchProfile]);

  const handleLogout = async () => {
    await authService.logout();
    logoutContext();
    toast({ title: "Success", description: "Logged out successfully" });
    navigate("/");
  };

  if (!user) return null;

  const getUserInitials = () =>
    `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    {
      id: "addresses",
      label: "Addresses",
      icon: <MapPin className="w-4 h-4" />,
    },
    {
      id: "preferences",
      label: "Preferences",
      icon: <Bell className="w-4 h-4" />,
    },
    {
      id: "security",
      label: "Security",
      icon: <Shield className="w-4 h-4" />,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto"
      >
        {/* Profile Header Card */}
        <motion.div
          variants={itemVariants}
          className="relative bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8"
        >
          <div className="h-36 sm:h-44 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          </div>
          <div className="relative px-6 sm:px-8 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-12">
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-lg ring-4 ring-white">
                {getUserInitials()}
              </div>
              <div className="flex-1 sm:pb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {profile?.firstName ?? user.firstName}{" "}
                  {profile?.lastName ?? user.lastName}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 capitalize">
                    <Shield className="w-3 h-3" />
                    {user.role}
                  </span>
                  {(profile?.isEmailVerified ?? user.isEmailVerified) ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Email not verified
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="rounded-xl border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 self-start sm:self-auto"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        {customerProfile && (
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <Award className="w-6 h-6 text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">
                {customerProfile.totalOrders}
              </p>
              <p className="text-xs text-gray-500">Total Orders</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <Heart className="w-6 h-6 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">
                {customerProfile.favoriteRestaurants.length}
              </p>
              <p className="text-xs text-gray-500">Favorites</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <Star className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">
                {customerProfile.loyaltyPoints}
              </p>
              <p className="text-xs text-gray-500">Points</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <Award className="w-6 h-6 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900 capitalize">
                {customerProfile.tier}
              </p>
              <p className="text-xs text-gray-500">Tier</p>
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl border border-gray-100 p-1.5 mb-8 flex gap-1 overflow-x-auto"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "profile" && (
              <ProfileSection
                profile={profile}
                isLoading={isLoadingProfile}
                onUpdateSuccess={(updatedUser) => {
                  setProfile(updatedUser);
                  updateUser({
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                  });
                }}
              />
            )}
            {activeTab === "addresses" && (
              <AddressesSection
                addresses={profile?.addresses ?? []}
                isLoading={isLoadingProfile}
                onRefresh={fetchProfile}
              />
            )}
            {activeTab === "preferences" && (
              <PreferencesSection
                customerProfile={customerProfile}
                isLoading={isLoadingProfile}
                onRefresh={fetchProfile}
              />
            )}
            {activeTab === "security" && (
              <SecuritySection
                profile={profile}
                onLogout={handleLogout}
                onAccountDeactivated={() => {
                  logoutContext();
                  navigate("/");
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Profile Section
// ════════════════════════════════════════════════════════════════
interface ProfileSectionProps {
  profile: UserProfile | null;
  isLoading: boolean;
  onUpdateSuccess: (user: UserProfile) => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  profile,
  isLoading,
  onUpdateSuccess,
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  const form = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      phoneNumber: profile?.phoneNumber ?? "",
      dateOfBirth: profile?.dateOfBirth
        ? new Date(profile.dateOfBirth).toISOString().split("T")[0]
        : "",
    },
  });

  // Reset form when profile loads
  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber: profile.phoneNumber,
        dateOfBirth: profile.dateOfBirth
          ? new Date(profile.dateOfBirth).toISOString().split("T")[0]
          : "",
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: UpdateProfileFormData) => {
    setIsSaving(true);
    const payload: Record<string, string | undefined> = {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
    };
    if (data.dateOfBirth) payload.dateOfBirth = data.dateOfBirth;

    const res = await userService.updateProfile(payload);
    if (res.success && res.data) {
      onUpdateSuccess(res.data.user);
      toast({ title: "Success", description: "Profile updated successfully" });
      setIsEditing(false);
    } else {
      toast({
        title: "Error",
        description: res.message || "Failed to update profile",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const handleResendVerification = async () => {
    if (!profile?.email) return;
    setIsResendingVerification(true);
    const res = await authService.resendVerification(profile.email);
    toast({
      title: res.success ? "Success" : "Error",
      description: res.message,
      variant: res.success ? "default" : "destructive",
    });
    setIsResendingVerification(false);
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Info */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-500" />
              Personal Information
            </h2>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="rounded-xl"
              >
                <Edit3 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>

          {isEditing ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      form.reset();
                    }}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-5">
              <InfoRow
                icon={<User className="w-4 h-4 text-orange-500" />}
                label="Full Name"
                value={`${profile?.firstName} ${profile?.lastName}`}
              />
              <InfoRow
                icon={<Mail className="w-4 h-4 text-orange-500" />}
                label="Email"
                value={profile?.email ?? ""}
                extra={
                  profile?.isEmailVerified ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <button
                      onClick={handleResendVerification}
                      disabled={isResendingVerification}
                      className="text-xs font-medium text-orange-600 hover:text-orange-700"
                    >
                      {isResendingVerification ? "Sending..." : "Verify now"}
                    </button>
                  )
                }
              />
              <InfoRow
                icon={<Phone className="w-4 h-4 text-orange-500" />}
                label="Phone"
                value={profile?.phoneNumber ?? "Not set"}
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4 text-orange-500" />}
                label="Date of Birth"
                value={
                  profile?.dateOfBirth
                    ? new Date(profile.dateOfBirth).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )
                    : "Not set"
                }
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4 text-orange-500" />}
                label="Member Since"
                value={
                  profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Unknown"
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Account Status</h3>
          <div className="space-y-3">
            <StatusRow
              label="Email Verified"
              verified={profile?.isEmailVerified ?? false}
            />
            <StatusRow
              label="Phone Verified"
              verified={profile?.isPhoneVerified ?? false}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Account Type</span>
              <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full capitalize">
                {profile?.role}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Login</span>
              <span className="text-xs text-gray-500">
                {profile?.lastLogin
                  ? new Date(profile.lastLogin).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Addresses Section
// ════════════════════════════════════════════════════════════════
interface AddressesSectionProps {
  addresses: UserAddress[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

const AddressesSection: React.FC<AddressesSectionProps> = ({
  addresses,
  isLoading,
  onRefresh,
}) => {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const handleDelete = async (addressId: string) => {
    setDeletingId(addressId);
    const res = await userService.deleteAddress(addressId);
    if (res.success) {
      toast({ title: "Success", description: "Address deleted" });
      await onRefresh();
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setDeletingId(null);
  };

  const handleSetDefault = async (addressId: string) => {
    setSettingDefaultId(addressId);
    const res = await userService.setDefaultAddress(addressId);
    if (res.success) {
      toast({ title: "Success", description: "Default address updated" });
      await onRefresh();
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setSettingDefaultId(null);
  };

  if (isLoading) return <ProfileSkeleton />;

  const addressIcon = (type: string) => {
    switch (type) {
      case "home":
        return <Home className="w-5 h-5 text-orange-500" />;
      case "work":
        return <Briefcase className="w-5 h-5 text-blue-500" />;
      default:
        return <MapPin className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-orange-500" />
          My Addresses
        </h2>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No addresses added yet</p>
          <Button
            onClick={() => setShowAddDialog(true)}
            variant="outline"
            className="rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Address
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr._id}
              className={`bg-white rounded-2xl border p-5 relative transition-all ${
                addr.isDefault
                  ? "border-orange-300 ring-1 ring-orange-200"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              {addr.isDefault && (
                <span className="absolute top-3 right-3 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  Default
                </span>
              )}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-xl">
                  {addressIcon(addr.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 capitalize">
                    {addr.type}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {addr.street}
                    {addr.apartment ? `, ${addr.apartment}` : ""}
                  </p>
                  <p className="text-sm text-gray-500">
                    {addr.city}, {addr.state} {addr.zipCode}
                  </p>
                  <p className="text-xs text-gray-400">{addr.country}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
                {!addr.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(addr._id)}
                    disabled={settingDefaultId === addr._id}
                    className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg"
                  >
                    {settingDefaultId === addr._id ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Star className="w-3 h-3 mr-1" />
                    )}
                    Set Default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingAddress(addr)}
                  className="text-xs text-gray-600 hover:text-gray-900 rounded-lg"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(addr._id)}
                  disabled={deletingId === addr._id}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg ml-auto"
                >
                  {deletingId === addr._id ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 mr-1" />
                  )}
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Address Dialog */}
      <AddressDialog
        open={showAddDialog || !!editingAddress}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingAddress(null);
          }
        }}
        address={editingAddress}
        onSuccess={async () => {
          setShowAddDialog(false);
          setEditingAddress(null);
          await onRefresh();
        }}
      />
    </div>
  );
};

// ── Address Dialog ─────────────────────────────────────────────
interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: UserAddress | null;
  onSuccess: () => Promise<void>;
}

const AddressDialog: React.FC<AddressDialogProps> = ({
  open,
  onOpenChange,
  address,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = !!address;

  const form = useForm<AddAddressFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(addAddressSchema) as any,
    defaultValues: {
      type: address?.type ?? "home",
      street: address?.street ?? "",
      apartment: address?.apartment ?? "",
      city: address?.city ?? "",
      state: address?.state ?? "",
      zipCode: address?.zipCode ?? "",
      country: address?.country ?? "",
      latitude: address?.coordinates?.latitude ?? 0,
      longitude: address?.coordinates?.longitude ?? 0,
      isDefault: address?.isDefault ?? false,
    },
  });

  useEffect(() => {
    if (address) {
      form.reset({
        type: address.type,
        street: address.street,
        apartment: address.apartment ?? "",
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        latitude: address.coordinates.latitude,
        longitude: address.coordinates.longitude,
        isDefault: address.isDefault,
      });
    } else {
      form.reset({
        type: "home",
        street: "",
        apartment: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
        latitude: 0,
        longitude: 0,
        isDefault: false,
      });
    }
  }, [address, form]);

  const onSubmit = async (data: AddAddressFormData) => {
    setIsSaving(true);
    const payload = {
      type: data.type as "home" | "work" | "other",
      street: data.street,
      apartment: data.apartment || undefined,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country: data.country,
      coordinates: { latitude: data.latitude, longitude: data.longitude },
      isDefault: data.isDefault,
    };

    const res = isEdit
      ? await userService.updateAddress(address._id, payload)
      : await userService.addAddress(payload);

    if (res.success) {
      toast({
        title: "Success",
        description: isEdit
          ? "Address updated successfully"
          : "Address added successfully",
      });
      await onSuccess();
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Address" : "Add Address"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update your address details below."
              : "Add a new delivery address."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="123 Main St"
                      className="rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apartment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apartment / Suite (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Apt 4B"
                      className="rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip Code</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        {...field}
                        className="rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        {...field}
                        className="rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEdit ? "Update" : "Add"} Address
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// ════════════════════════════════════════════════════════════════
// Preferences Section
// ════════════════════════════════════════════════════════════════
interface PreferencesSectionProps {
  customerProfile: CustomerProfile | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

const PreferencesSection: React.FC<PreferencesSectionProps> = ({
  customerProfile,
  isLoading,
  onRefresh,
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPreferences>(
    customerProfile?.notifications ?? {
      email: true,
      sms: true,
      push: true,
      orderUpdates: true,
      promotions: false,
    },
  );
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(
    customerProfile?.dietaryPreferences ?? [],
  );
  const [newPref, setNewPref] = useState("");

  useEffect(() => {
    if (customerProfile) {
      setNotifications(customerProfile.notifications);
      setDietaryPreferences(customerProfile.dietaryPreferences);
    }
  }, [customerProfile]);

  const handleSaveNotifications = async (updated: NotificationPreferences) => {
    setIsSaving(true);
    const res = await userService.updatePreferences({
      notifications: updated,
    });
    if (res.success) {
      toast({
        title: "Success",
        description: "Notification preferences saved",
      });
      setNotifications(updated);
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const toggleNotification = (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    handleSaveNotifications(updated);
  };

  const handleAddDietaryPref = async () => {
    if (!newPref.trim()) return;
    const updated = [...dietaryPreferences, newPref.trim()];
    setDietaryPreferences(updated);
    setNewPref("");
    const res = await userService.updatePreferences({
      dietaryPreferences: updated,
    });
    if (res.success) {
      toast({ title: "Success", description: "Dietary preference added" });
      await onRefresh();
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveDietaryPref = async (pref: string) => {
    const updated = dietaryPreferences.filter((p) => p !== pref);
    setDietaryPreferences(updated);
    const res = await userService.updatePreferences({
      dietaryPreferences: updated,
    });
    if (res.success) {
      toast({ title: "Success", description: "Dietary preference removed" });
      await onRefresh();
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <ProfileSkeleton />;

  const notifOptions: {
    key: keyof NotificationPreferences;
    label: string;
    description: string;
  }[] = [
    {
      key: "email",
      label: "Email Notifications",
      description: "Receive updates via email",
    },
    {
      key: "sms",
      label: "SMS Notifications",
      description: "Receive updates via text",
    },
    {
      key: "push",
      label: "Push Notifications",
      description: "Browser push notifications",
    },
    {
      key: "orderUpdates",
      label: "Order Updates",
      description: "Status updates on your orders",
    },
    {
      key: "promotions",
      label: "Promotions",
      description: "Deals and special offers",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-orange-500" />
          Notification Settings
        </h2>
        <div className="space-y-5">
          {notifOptions.map((opt) => (
            <div key={opt.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.description}</p>
              </div>
              <Switch
                checked={notifications[opt.key]}
                onCheckedChange={(checked) =>
                  toggleNotification(opt.key, checked)
                }
                disabled={isSaving}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dietary Preferences */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-6">
          <Heart className="w-5 h-5 text-orange-500" />
          Dietary Preferences
        </h2>
        <div className="flex gap-2 mb-4">
          <Input
            value={newPref}
            onChange={(e) => setNewPref(e.target.value)}
            placeholder="e.g., Vegan, Gluten-free"
            className="rounded-xl"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddDietaryPref();
              }
            }}
          />
          <Button
            onClick={handleAddDietaryPref}
            className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white shrink-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {dietaryPreferences.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No dietary preferences set
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dietaryPreferences.map((pref) => (
              <span
                key={pref}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm font-medium"
              >
                {pref}
                <button
                  onClick={() => handleRemoveDietaryPref(pref)}
                  className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Security Section
// ════════════════════════════════════════════════════════════════
interface SecuritySectionProps {
  profile: UserProfile | null;
  onLogout: () => Promise<void>;
  onAccountDeactivated: () => void;
}

const SecuritySection: React.FC<SecuritySectionProps> = ({
  onLogout,
  onAccountDeactivated,
}) => {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-orange-500" />
          Password & Security
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">Password</p>
              <p className="text-sm text-gray-500">
                Change your account password
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangePassword(true)}
              className="rounded-xl hover:border-orange-300 hover:text-orange-600"
            >
              Change
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">Active Sessions</p>
              <p className="text-sm text-gray-500">
                Log out from all other devices
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="rounded-xl hover:border-red-300 hover:text-red-600"
            >
              Log Out All
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-red-100 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">
          Once you deactivate your account, there is no going back. Please be
          certain.
        </p>
        <Button
          variant="outline"
          onClick={() => setShowDeactivate(true)}
          className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Deactivate Account
        </Button>
      </div>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      />

      {/* Deactivate Account Dialog */}
      <DeactivateAccountDialog
        open={showDeactivate}
        onOpenChange={setShowDeactivate}
        onDeactivated={onAccountDeactivated}
      />
    </div>
  );
};

// ── Change Password Dialog ─────────────────────────────────────
interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setIsSaving(true);
    const res = await authService.changePassword(
      data.currentPassword,
      data.newPassword,
    );
    if (res.success) {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      form.reset();
      onOpenChange(false);
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showCurrent ? "text" : "password"}
                        {...field}
                        className="rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrent ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showNew ? "text" : "password"}
                        {...field}
                        className="rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNew ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} className="rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Change Password
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// ── Deactivate Account Dialog ──────────────────────────────────
interface DeactivateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeactivated: () => void;
}

const DeactivateAccountDialog: React.FC<DeactivateAccountDialogProps> = ({
  open,
  onOpenChange,
  onDeactivated,
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const { logout: logoutContext } = useAuth();

  const form = useForm<DeactivateAccountFormData>({
    resolver: zodResolver(deactivateAccountSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = async (data: DeactivateAccountFormData) => {
    setIsSaving(true);
    const res = await userService.deactivateAccount(data.password);
    if (res.success) {
      toast({
        title: "Account Deactivated",
        description: "Your account has been deactivated.",
      });
      logoutContext();
      onOpenChange(false);
      onDeactivated();
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">Deactivate Account</DialogTitle>
          <DialogDescription>
            This action will deactivate your account. Enter your password to
            confirm.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      {...field}
                      className="rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Deactivate
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// ── Helper Components ──────────────────────────────────────────
const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  extra?: React.ReactNode;
}> = ({ icon, label, value, extra }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
    <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
    </div>
    {extra}
  </div>
);

const StatusRow: React.FC<{ label: string; verified: boolean }> = ({
  label,
  verified,
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-600">{label}</span>
    {verified ? (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        Yes
      </span>
    ) : (
      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
        <AlertCircle className="w-3 h-3" />
        No
      </span>
    )}
  </div>
);

const ProfileSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="bg-white rounded-2xl border border-gray-100 p-8">
      <div className="h-6 bg-gray-200 rounded w-48 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

export default ProfilePage;
