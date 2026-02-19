import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Camera,
  ShoppingBag,
  Clock,
  UtensilsCrossed,
  ArrowRight,
  Cake,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import CoverPhotoPositioner from "@/components/CoverPhotoPositioner";
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

// ── Types ──────────────────────────────────────────────────────
type ProfileTab = "profile" | "addresses" | "preferences" | "security";

// ── Helpers ────────────────────────────────────────────────────
const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (diffDays === 0) return `Today at ${timeStr}`;
  if (diffDays === 1) return `Yesterday at ${timeStr}`;
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatMemberSince = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

// ── Stat Pill ──────────────────────────────────────────────────
const StatPill: React.FC<{
  icon: React.ReactNode;
  value: string | number;
  label: string;
}> = ({ icon, value, label }) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white">
    {icon}
    <div className="text-left">
      <p className="text-sm font-bold leading-tight">{value}</p>
      <p className="text-[10px] opacity-80 leading-tight">{label}</p>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// Main Profile Page
// ════════════════════════════════════════════════════════════════
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

  // Photo upload state
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const coverPhotoRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL =
    import.meta.env?.VITE_API_BASE_URL || "http://localhost:2002";

  const getImageUrl = (path?: string) =>
    path ? `${API_BASE_URL}${path}` : undefined;

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

  // ── Photo upload handlers ──────────────────────────────────
  const handleProfilePhotoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate client-side
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPEG, PNG, WebP, or GIF image.",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be under 5 MB.",
          variant: "destructive",
        });
        return;
      }

      setIsUploadingProfile(true);
      const res = await userService.uploadProfilePhoto(file);
      if (res.success && res.data) {
        setProfile((prev) =>
          prev ? { ...prev, profileImage: res.data!.profileImage } : prev,
        );
        toast({ title: "Profile photo updated!" });
      } else {
        toast({
          title: "Upload failed",
          description: res.message || "Could not upload photo.",
          variant: "destructive",
        });
      }
      setIsUploadingProfile(false);
      // Reset input so re-selecting the same file triggers onChange
      if (profilePhotoRef.current) profilePhotoRef.current.value = "";
    },
    [toast],
  );

  const handleCoverPhotoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPEG, PNG, WebP, or GIF image.",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be under 5 MB.",
          variant: "destructive",
        });
        return;
      }

      setIsUploadingCover(true);
      const res = await userService.uploadCoverPhoto(file);
      if (res.success && res.data) {
        setProfile((prev) =>
          prev ? { ...prev, coverImage: res.data!.coverImage } : prev,
        );
        toast({ title: "Cover photo updated!" });
      } else {
        toast({
          title: "Upload failed",
          description: res.message || "Could not upload cover photo.",
          variant: "destructive",
        });
      }
      setIsUploadingCover(false);
      if (coverPhotoRef.current) coverPhotoRef.current.value = "";
    },
    [toast],
  );

  // Save cover photo vertical position
  const handleSaveCoverPosition = useCallback(
    async (position: number) => {
      const res = await userService.updateCoverPhotoPosition(position);
      if (res.success) {
        setProfile((prev) =>
          prev ? { ...prev, coverImagePosition: position } : prev,
        );
        toast({ title: "Cover position saved!" });
      } else {
        toast({
          title: "Error",
          description: res.message || "Could not update cover position.",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

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
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto"
        >
          {/* ── Profile Header Card with integrated stats ──────── */}
          <motion.div
            variants={itemVariants}
            className="relative bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4"
          >
            {/* Banner */}
            <div className="group/banner relative h-32 sm:h-36 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 overflow-hidden">
              {/* Cover photo with repositioning support */}
              {profile?.coverImage ? (
                <CoverPhotoPositioner
                  imageUrl={getImageUrl(profile.coverImage)!}
                  initialPosition={profile.coverImagePosition ?? 50}
                  onSave={handleSaveCoverPosition}
                  className="absolute inset-0 w-full h-full"
                >
                  {/* Stats pills inside banner (desktop) */}
                  <div className="absolute bottom-3 right-4 hidden sm:flex items-center gap-2 z-[5]">
                    {customerProfile && (
                      <>
                        <StatPill
                          icon={<ShoppingBag className="w-3.5 h-3.5" />}
                          value={customerProfile.totalOrders}
                          label="Orders"
                        />
                        <StatPill
                          icon={<Star className="w-3.5 h-3.5" />}
                          value={customerProfile.loyaltyPoints}
                          label="Points"
                        />
                      </>
                    )}
                    {profile?.createdAt && (
                      <StatPill
                        icon={<Calendar className="w-3.5 h-3.5" />}
                        value={formatMemberSince(profile.createdAt)}
                        label="Member Since"
                      />
                    )}
                  </div>

                  {/* Cover photo upload affordance */}
                  <input
                    ref={coverPhotoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleCoverPhotoChange}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => coverPhotoRef.current?.click()}
                        disabled={isUploadingCover}
                        className="absolute top-3 right-3 z-10 p-2 bg-black/30 rounded-xl text-white/80 opacity-0 group-hover/banner:opacity-100 hover:bg-black/50 hover:text-white transition-all duration-200 cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingCover ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Change cover photo</TooltipContent>
                  </Tooltip>
                </CoverPhotoPositioner>
              ) : (
                <>
                  {/* Fallback pattern overlay (no cover photo) */}
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

                  {/* Stats pills inside banner (desktop) */}
                  <div className="absolute bottom-3 right-4 hidden sm:flex items-center gap-2">
                    {customerProfile && (
                      <>
                        <StatPill
                          icon={<ShoppingBag className="w-3.5 h-3.5" />}
                          value={customerProfile.totalOrders}
                          label="Orders"
                        />
                        <StatPill
                          icon={<Star className="w-3.5 h-3.5" />}
                          value={customerProfile.loyaltyPoints}
                          label="Points"
                        />
                      </>
                    )}
                    {profile?.createdAt && (
                      <StatPill
                        icon={<Calendar className="w-3.5 h-3.5" />}
                        value={formatMemberSince(profile.createdAt)}
                        label="Member Since"
                      />
                    )}
                  </div>

                  {/* Cover photo upload affordance */}
                  <input
                    ref={coverPhotoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleCoverPhotoChange}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => coverPhotoRef.current?.click()}
                        disabled={isUploadingCover}
                        className="absolute top-3 right-3 p-2 bg-black/30 rounded-xl text-white/80 opacity-0 group-hover/banner:opacity-100 hover:bg-black/50 hover:text-white transition-all duration-200 cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingCover ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Change cover photo</TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>

            {/* Profile info area */}
            <div className="relative px-5 sm:px-8 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 -mt-12 sm:-mt-10">
                {/* Avatar with camera overlay */}
                <div className="group/avatar relative self-center sm:self-auto">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-lg ring-4 ring-white transition-transform duration-200 group-hover/avatar:scale-105 overflow-hidden">
                    {profile?.profileImage ? (
                      <img
                        src={getImageUrl(profile.profileImage)}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold">
                        {getUserInitials()}
                      </div>
                    )}
                  </div>
                  <input
                    ref={profilePhotoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleProfilePhotoChange}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => profilePhotoRef.current?.click()}
                        disabled={isUploadingProfile}
                        className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingProfile ? (
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                          <Camera className="w-5 h-5 text-white" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Change profile photo</TooltipContent>
                  </Tooltip>
                </div>

                {/* Name & badges */}
                <div className="flex-1 text-center sm:text-left sm:pb-0.5">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {profile?.firstName ?? user.firstName}{" "}
                    {profile?.lastName ?? user.lastName}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 capitalize">
                      <Shield className="w-3 h-3" />
                      {user.role}
                    </span>
                    {(profile?.isEmailVerified ?? user.isEmailVerified) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 cursor-default">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Your email is verified</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Email not verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats pills (mobile: 2×2 grid) */}
              <div className="sm:hidden grid grid-cols-2 gap-2 mt-4">
                {customerProfile && (
                  <>
                    <div className="flex items-center gap-2 p-2.5 bg-orange-50 rounded-xl">
                      <ShoppingBag className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {customerProfile.totalOrders}
                        </p>
                        <p className="text-[10px] text-gray-500">Orders</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-yellow-50 rounded-xl">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {customerProfile.loyaltyPoints}
                        </p>
                        <p className="text-[10px] text-gray-500">Points</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-purple-50 rounded-xl">
                      <Award className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-bold text-gray-900 capitalize">
                          {customerProfile.tier}
                        </p>
                        <p className="text-[10px] text-gray-500">Tier</p>
                      </div>
                    </div>
                  </>
                )}
                {profile?.createdAt && (
                  <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-xl">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {formatMemberSince(profile.createdAt)}
                      </p>
                      <p className="text-[10px] text-gray-500">Member Since</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── Tab Navigation ─────────────────────────────────── */}
          <motion.div
            variants={itemVariants}
            className="relative bg-white rounded-2xl border border-gray-100 p-1.5 mb-6 flex gap-1 overflow-x-auto"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap z-10 ${
                  activeTab === tab.id
                    ? "text-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeProfileTab"
                    className="absolute inset-0 bg-orange-500 rounded-xl -z-10 shadow-sm"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}
              </button>
            ))}

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-4 right-4 h-px bg-gray-100" />
          </motion.div>

          {/* ── Tab Content ────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === "profile" && (
                <ProfileSection
                  profile={profile}
                  customerProfile={customerProfile}
                  isLoading={isLoadingProfile}
                  onUpdateSuccess={(updatedUser) => {
                    setProfile(updatedUser);
                    updateUser({
                      firstName: updatedUser.firstName,
                      lastName: updatedUser.lastName,
                    });
                  }}
                  onRefresh={fetchProfile}
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
    </TooltipProvider>
  );
};

// ════════════════════════════════════════════════════════════════
// Profile Section
// ════════════════════════════════════════════════════════════════
interface ProfileSectionProps {
  profile: UserProfile | null;
  customerProfile: CustomerProfile | null;
  isLoading: boolean;
  onUpdateSuccess: (user: UserProfile) => void;
  onRefresh: () => Promise<void>;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  profile,
  customerProfile,
  isLoading,
  onUpdateSuccess,
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [showPhoneVerify, setShowPhoneVerify] = useState(false);

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

  if (isLoading) return <ProfileSkeleton />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Info Card ──────────────────────────────────── */}
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

            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="edit-mode"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                >
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
                                <Input
                                  {...field}
                                  className="rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                />
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
                                <Input
                                  {...field}
                                  className="rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                                />
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
                              <Input
                                {...field}
                                className="rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                              />
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
                              <Input
                                type="date"
                                {...field}
                                className="rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                              />
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
                </motion.div>
              ) : (
                <motion.div
                  key="view-mode"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="space-y-3"
                >
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Your email is verified
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <button
                          onClick={handleResendVerification}
                          disabled={isResendingVerification}
                          className="text-xs font-medium text-orange-600 hover:text-orange-700"
                        >
                          {isResendingVerification
                            ? "Sending..."
                            : "Verify now"}
                        </button>
                      )
                    }
                  />
                  <InfoRow
                    icon={<Phone className="w-4 h-4 text-orange-500" />}
                    label="Phone"
                    value={profile?.phoneNumber ?? "Not set"}
                  />

                  {/* Date of Birth with birthday nudge */}
                  {profile?.dateOfBirth ? (
                    <InfoRow
                      icon={<Cake className="w-4 h-4 text-orange-500" />}
                      label="Date of Birth"
                      value={new Date(profile.dateOfBirth).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Cake className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">
                          Date of Birth
                        </p>
                        <p className="text-sm text-orange-700 italic mt-0.5">
                          🎂 Add your birthday to receive exclusive birthday
                          deals!
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-100 rounded-lg"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  )}

                  <InfoRow
                    icon={<Calendar className="w-4 h-4 text-orange-500" />}
                    label="Member Since"
                    value={
                      profile?.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )
                        : "Unknown"
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Account Status Sidebar ───────────────────────────── */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Account Status</h3>
            <div className="space-y-3">
              {/* Email Verified */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email Verified</span>
                {profile?.isEmailVerified ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full cursor-default">
                        <CheckCircle2 className="w-3 h-3" />
                        Yes
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Your email is verified</TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    No
                  </span>
                )}
              </div>

              {/* Phone Verified — with CTA */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Phone Verified</span>
                {profile?.isPhoneVerified ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full cursor-default">
                        <CheckCircle2 className="w-3 h-3" />
                        Yes
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Your phone number is verified
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      <X className="w-3 h-3" />
                      Not Verified
                    </span>
                    <button
                      onClick={() => setShowPhoneVerify(true)}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700 animate-pulse"
                    >
                      Verify Now &rarr;
                    </button>
                  </div>
                )}
              </div>

              {/* Account Type */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Account Type</span>
                <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full capitalize">
                  {profile?.role}
                </span>
              </div>

              {/* Last Login — human-friendly */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Login</span>
                <span className="text-xs text-gray-500">
                  {profile?.lastLogin
                    ? formatRelativeTime(profile.lastLogin)
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Activity Section ────────────────────────────── */}
      <RecentActivitySection
        customerProfile={customerProfile}
        isLoading={isLoading}
      />

      {/* Phone Verification Dialog */}
      <PhoneVerificationDialog
        open={showPhoneVerify}
        onOpenChange={setShowPhoneVerify}
        phoneNumber={profile?.phoneNumber}
      />
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Recent Activity Section
// ════════════════════════════════════════════════════════════════
interface RecentActivitySectionProps {
  customerProfile: CustomerProfile | null;
  isLoading: boolean;
}

const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({
  customerProfile,
  isLoading,
}) => {
  if (isLoading) return null;

  const hasOrders = customerProfile && customerProfile.totalOrders > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-5">
        <Clock className="w-5 h-5 text-orange-500" />
        Recent Activity
      </h2>

      {hasOrders ? (
        /* Placeholder for when order history API is available */
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              whileHover={{ y: -2 }}
              className="flex-shrink-0 w-64 bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    Restaurant #{i}
                  </p>
                  <p className="text-xs text-gray-400">Recent order</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Delivered
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg h-7 px-2"
                >
                  Reorder
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 mb-1">No orders yet</p>
          <p className="text-sm text-gray-400 mb-4">
            Explore restaurants nearby and place your first order!
          </p>
          <Link to="/restaurants">
            <Button
              variant="outline"
              className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
            >
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Explore Restaurants
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Phone Verification Dialog
// ════════════════════════════════════════════════════════════════
interface PhoneVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber?: string;
}

const PhoneVerificationDialog: React.FC<PhoneVerificationDialogProps> = ({
  open,
  onOpenChange,
  phoneNumber,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"send" | "verify">("send");
  const [isSending, setIsSending] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("send");
      setOtp("");
    }
  }, [open]);

  const handleSendCode = async () => {
    setIsSending(true);
    // UI-only — simulate sending
    await new Promise((r) => setTimeout(r, 1200));
    setIsSending(false);
    setStep("verify");
    toast({
      title: "Code Sent",
      description: `A verification code has been sent to ${phoneNumber || "your phone"}.`,
    });
  };

  const handleVerify = () => {
    toast({
      title: "Verification",
      description:
        "Phone verification is coming soon. We'll notify you when it's available!",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Phone Number</DialogTitle>
          <DialogDescription>
            {step === "send"
              ? "We'll send a verification code to your phone number."
              : "Enter the 6-digit code sent to your phone."}
          </DialogDescription>
        </DialogHeader>

        {step === "send" ? (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <Phone className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">
                {phoneNumber || "No phone number set"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {phoneNumber
                  ? "A code will be sent to this number"
                  : "Please add a phone number first"}
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendCode}
                disabled={!phoneNumber || isSending}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              >
                {isSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Code
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="rounded-xl text-center text-lg tracking-widest"
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep("send")}
                className="rounded-xl"
              >
                Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={otp.length < 6}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              >
                Verify
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
            <motion.div
              key={addr._id}
              whileHover={{ y: -2 }}
              className={`bg-white rounded-2xl border p-5 relative transition-shadow hover:shadow-md ${
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
            </motion.div>
          ))}
        </div>
      )}

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
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
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
            {/* Location detection */}
            <div className="space-y-2">
              <FormLabel>Location</FormLabel>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDetectingLocation}
                  className="rounded-xl gap-2 flex-shrink-0"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      toast({
                        title: "Not supported",
                        description:
                          "Geolocation is not supported by your browser.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setIsDetectingLocation(true);
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        form.setValue(
                          "latitude",
                          Math.round(pos.coords.latitude * 1e6) / 1e6,
                          { shouldValidate: true },
                        );
                        form.setValue(
                          "longitude",
                          Math.round(pos.coords.longitude * 1e6) / 1e6,
                          { shouldValidate: true },
                        );
                        setIsDetectingLocation(false);
                        toast({ title: "Location detected!" });
                      },
                      (err) => {
                        setIsDetectingLocation(false);
                        toast({
                          title: "Location error",
                          description:
                            err.code === 1
                              ? "Location permission denied. Please allow location access in your browser settings."
                              : "Could not detect your location. Please try again.",
                          variant: "destructive",
                        });
                      },
                      {
                        enableHighAccuracy: true,
                        timeout: 30000,
                        maximumAge: 0,
                      },
                    );
                  }}
                >
                  {isDetectingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                  {isDetectingLocation ? "Detecting…" : "Use my location"}
                </Button>
                {form.watch("latitude") !== 0 &&
                form.watch("longitude") !== 0 ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Location set ({form.watch("latitude")?.toFixed(6)},{" "}
                    {form.watch("longitude")?.toFixed(6)})
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    We need your location for delivery
                  </span>
                )}
              </div>
              {(form.formState.errors.latitude ||
                form.formState.errors.longitude) && (
                <p className="text-sm font-medium text-destructive">
                  Please detect your location before submitting
                </p>
              )}
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
  onAccountDeactivated: () => void;
}

const SecuritySection: React.FC<SecuritySectionProps> = ({
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

      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      />

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

/** Info row with left orange accent bar, uppercase label, larger value */
const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  extra?: React.ReactNode;
}> = ({ icon, label, value, extra }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/60 border-l-2 border-orange-400">
    <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">
        {label}
      </p>
      <p className="text-[15px] font-medium text-gray-900 truncate">{value}</p>
    </div>
    {extra && <div className="self-center">{extra}</div>}
  </div>
);

const ProfileSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="bg-white rounded-2xl border border-gray-100 p-8">
      <div className="h-6 bg-gray-200 rounded w-48 mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

export default ProfilePage;
