import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, User, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import vendorService from "@/services/vendorService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const VendorSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    const load = async () => {
      const res = await vendorService.getProfile();
      if (res.success && res.data) {
        const p = res.data;
        setBusinessName(p.businessName || "");
        setBusinessAddress(p.businessAddress || "");
        setBusinessPhone(p.businessPhone || "");
        setBusinessEmail(p.businessEmail || user?.email || "");
        setBio(p.bio || "");
      }
      setLoading(false);
    };
    load();
  }, [user?.email]);

  const handleSave = async () => {
    setSaving(true);
    const res = await vendorService.updateProfile({
      businessName,
      businessAddress,
      businessPhone,
      businessEmail,
      bio,
    });
    if (res.success) {
      toast({ title: "Success", description: "Profile updated" });
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your vendor profile and business details
        </p>
      </div>

      {/* Account Info (read-only) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Account</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Name</p>
            <p className="font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-gray-500">Role</p>
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
          <h2 className="text-lg font-semibold text-gray-900">
            Business Details
          </h2>
        </div>
        <div>
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Your business name"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="businessEmail">Business Email</Label>
          <Input
            id="businessEmail"
            type="email"
            value={businessEmail}
            onChange={(e) => setBusinessEmail(e.target.value)}
            placeholder="business@example.com"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="businessPhone">Business Phone</Label>
          <Input
            id="businessPhone"
            value={businessPhone}
            onChange={(e) => setBusinessPhone(e.target.value)}
            placeholder="+880 1XXX-XXXXXX"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="businessAddress">Business Address</Label>
          <Input
            id="businessAddress"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            placeholder="Your business address"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell customers about your business..."
            rows={3}
            className="mt-1"
          />
        </div>
      </motion.div>

      {/* Save button */}
      <div className="flex justify-end pb-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default VendorSettingsPage;
