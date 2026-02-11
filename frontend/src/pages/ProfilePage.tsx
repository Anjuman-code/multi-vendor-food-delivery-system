import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Shield,
  Edit3,
  Camera,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import authService from "@/services/authService";

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, logout: logoutContext } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
  });

  // Redirect if not logged in
  if (!isAuthenticated || !user) {
    navigate("/login", { replace: true });
    return null;
  }

  const handleLogout = async () => {
    try {
      await authService.logout();
      logoutContext();
      toast({ title: "Success", description: "Logged out successfully" });
      navigate("/");
    } catch {
      toast({
        title: "Error",
        description: "Failed to logout.",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = () => {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  };

  const handleSave = () => {
    // TODO: integrate with backend PUT /api/users/profile
    toast({
      title: "Info",
      description: "Profile update coming soon!",
    });
    setIsEditing(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
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
        className="max-w-4xl mx-auto"
      >
        {/* Profile Header Card */}
        <motion.div
          variants={itemVariants}
          className="relative bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8"
        >
          {/* Cover Gradient */}
          <div className="h-40 sm:h-48 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          </div>

          {/* Avatar + Name */}
          <div className="relative px-6 sm:px-8 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 sm:-mt-14">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white text-4xl sm:text-5xl font-bold shadow-lg ring-4 ring-white">
                  {getUserInitials()}
                </div>
                <button className="absolute bottom-2 right-2 p-2 bg-white rounded-xl shadow-md text-gray-600 hover:text-orange-500 transition-colors opacity-0 group-hover:opacity-100">
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Name & Role */}
              <div className="flex-1 sm:pb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700 capitalize">
                    <Shield className="w-3.5 h-3.5" />
                    {user.role}
                  </span>
                  {user.isEmailVerified ? (
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm text-amber-600">
                      <AlertCircle className="w-4 h-4" />
                      Email not verified
                    </span>
                  )}
                </div>
              </div>

              {/* Edit / Logout Actions */}
              <div className="flex gap-2 sm:pb-1">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                  className="rounded-xl border-gray-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="rounded-xl border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-2 space-y-8"
          >
            {/* Personal Information */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-orange-500" />
                Personal Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm text-gray-500 mb-1.5 block">
                    First Name
                  </Label>
                  {isEditing ? (
                    <Input
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className="rounded-xl"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium text-base">
                      {user.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-gray-500 mb-1.5 block">
                    Last Name
                  </Label>
                  {isEditing ? (
                    <Input
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="rounded-xl"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium text-base">
                      {user.lastName}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-sm text-gray-500 mb-1.5 block">
                    Email Address
                  </Label>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <Input
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="rounded-xl"
                        disabled
                      />
                    ) : (
                      <p className="text-gray-900 font-medium text-base">
                        {user.email}
                      </p>
                    )}
                    {user.isEmailVerified ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <button className="text-xs font-medium text-orange-600 hover:text-orange-700 whitespace-nowrap">
                        Verify now
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex gap-3 justify-end"
                >
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25"
                  >
                    Save Changes
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Security */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-500" />
                Security
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">Password</p>
                    <p className="text-sm text-gray-500">
                      Last changed: Unknown
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl hover:border-orange-300 hover:text-orange-600"
                  >
                    Change
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">
                      Two-Factor Authentication
                    </p>
                    <p className="text-sm text-gray-500">
                      Add an extra layer of security
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl hover:border-orange-300 hover:text-orange-600"
                  >
                    Enable
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Quick Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Info</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Mail className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-500 text-xs">Email</p>
                    <p className="text-gray-900 font-medium truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Phone className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Phone</p>
                    <p className="text-gray-900 font-medium">Not set</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Location</p>
                    <p className="text-gray-900 font-medium">Not set</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Member since</p>
                    <p className="text-gray-900 font-medium">Recently joined</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Status Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Account Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Email Verified</span>
                  {user.isEmailVerified ? (
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
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Account Type</span>
                  <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full capitalize">
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Account ID</span>
                  <span className="text-xs font-mono text-gray-500">
                    {user.id.slice(-8)}
                  </span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
              <h3 className="font-semibold text-red-600 mb-2">Danger Zone</h3>
              <p className="text-sm text-gray-500 mb-4">
                Once you delete your account, there is no going back.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                Delete Account
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
