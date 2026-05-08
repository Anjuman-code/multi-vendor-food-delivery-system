import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { motion } from "framer-motion";
import { Plus, Shield, UserX } from "lucide-react";
import { useEffect, useState } from "react";

interface AdminUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  adminTier: "super_admin" | "admin" | "support";
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

const tierBadge = (tier: string) => {
  const map = {
    super_admin: "bg-red-50 text-red-600",
    admin: "bg-indigo-50 text-indigo-600",
    support: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide ${map[tier as keyof typeof map] ?? "bg-gray-100 text-gray-500"}`}>
      {tier.replace(/_/g, " ")}
    </span>
  );
};

const defaultForm = { firstName: "", lastName: "", email: "", password: "", adminTier: "support" as AdminUser["adminTier"] };

export default function AdminTeamPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.listAdmins();
      setAdmins((res.data as { data: { admins: AdminUser[] } }).data.admins);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.firstName || !form.email || !form.password) {
      toast({ title: "Fill in all required fields.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await adminService.createAdmin(form);
      toast({ title: "Admin Created", description: `${form.firstName} can now log in.` });
      setForm(defaultForm);
      setShowForm(false);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to create admin.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    try {
      await adminService.deactivateAdmin(deactivateId);
      toast({ title: "Deactivated" });
      setDeactivateId(null);
      load();
    } catch {
      toast({ title: "Error", description: "Failed.", variant: "destructive" });
      throw new Error("failed");
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Team</h1>
          <p className="text-sm text-gray-500">{admins.length} administrators</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Admin
        </button>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => (
            <div key={admin._id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{admin.firstName} {admin.lastName}</p>
                    {!admin.isActive && <span className="text-xs text-gray-400">(inactive)</span>}
                  </div>
                  <p className="text-xs text-gray-400">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {tierBadge(admin.adminTier)}
                {admin.isActive && (
                  <button onClick={() => setDeactivateId(admin._id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Admin Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-4">Create Admin User</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">First Name *</label>
                  <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Last Name</label>
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Password *</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Admin Tier *</label>
                <select value={form.adminTier} onChange={(e) => setForm({ ...form, adminTier: e.target.value as AdminUser["adminTier"] })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                  <option value="support">Support</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors">
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deactivateId} onClose={() => setDeactivateId(null)} onConfirm={handleDeactivate}
        title="Deactivate this admin?" description="They will lose access to the admin panel immediately."
        confirmLabel="Deactivate" destructive />
    </div>
  );
}
