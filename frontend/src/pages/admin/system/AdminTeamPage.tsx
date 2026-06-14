import {
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  EmptyState,
  FormDialog,
  PageHeader,
  SectionCard,
  StatusBadge,
  type StatusTone,
} from "@/components/admin";
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
import { useToast } from "@/hooks/use-toast";
import adminService from "@/services/adminService";
import { formatRelativeTime } from "@/utils/format";
import { CheckCircle2, Pencil, Plus, Shield, UserX } from "lucide-react";
import { useEffect, useState } from "react";

type AdminTier = "super_admin" | "admin" | "support";

interface AdminUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  adminTier: AdminTier;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

const TIERS: { value: AdminTier; label: string }[] = [
  { value: "support", label: "Support" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

const tierMeta = (tier: AdminTier): { label: string; tone: StatusTone } => {
  switch (tier) {
    case "super_admin":
      return { label: "Super Admin", tone: "danger" };
    case "admin":
      return { label: "Admin", tone: "brand" };
    default:
      return { label: "Support", tone: "neutral" };
  }
};

interface CreateForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  adminTier: AdminTier;
}

const emptyCreate = (): CreateForm => ({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  adminTier: "support",
});

export default function AdminTeamPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState<CreateForm | null>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string; adminTier: AdminTier } | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.listAdmins();
      setAdmins((res.data as { data: { admins: AdminUser[] } }).data.admins);
    } catch {
      toast({ title: "Failed to load admin team", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!createForm) return;
    if (!createForm.firstName.trim() || !createForm.email.trim() || !createForm.password) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await adminService.createAdmin({
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        adminTier: createForm.adminTier,
      });
      toast({ title: "Admin created", description: `${createForm.firstName} can now log in.` });
      setCreateForm(null);
      await load();
    } catch {
      toast({ title: "Failed to create admin", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await adminService.updateAdmin(editTarget.id, { adminTier: editTarget.adminTier });
      toast({ title: "Admin updated" });
      setEditTarget(null);
      await load();
    } catch {
      toast({ title: "Failed to update admin", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await adminService.deactivateAdmin(deactivateTarget._id);
      toast({ title: "Admin deactivated" });
      setDeactivateTarget(null);
      await load();
    } catch {
      toast({ title: "Failed to deactivate", variant: "destructive" });
      throw new Error("failed");
    }
  };

  const handleReactivate = async (admin: AdminUser) => {
    try {
      await adminService.updateAdmin(admin._id, { isActive: true });
      toast({ title: "Admin reactivated" });
      await load();
    } catch {
      toast({ title: "Failed to reactivate", variant: "destructive" });
    }
  };

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: "name",
      header: "Administrator",
      render: (a) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Shield className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {a.firstName} {a.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{a.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "tier",
      header: "Tier",
      render: (a) => {
        const m = tierMeta(a.adminTier);
        return <StatusBadge label={m.label} tone={m.tone} icon={false} />;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (a) =>
        a.isActive ? (
          <StatusBadge label="Active" tone="success" />
        ) : (
          <StatusBadge label="Inactive" tone="neutral" />
        ),
    },
    {
      key: "lastLogin",
      header: "Last login",
      render: (a) => (
        <span className="text-muted-foreground">
          {a.lastLogin ? formatRelativeTime(a.lastLogin) : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() =>
              setEditTarget({
                id: a._id,
                name: `${a.firstName} ${a.lastName}`,
                adminTier: a.adminTier,
              })
            }
            title="Edit"
            aria-label="Edit"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {a.isActive ? (
            <button
              onClick={() => setDeactivateTarget(a)}
              title="Deactivate"
              aria-label="Deactivate"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <UserX className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => handleReactivate(a)}
              title="Reactivate"
              aria-label="Reactivate"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-emerald-50 hover:text-emerald-600"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admin Team"
        description={`${admins.length} administrators`}
        actions={
          <Button variant="brand" size="sm" onClick={() => setCreateForm(emptyCreate())}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Admin
          </Button>
        }
      />

      <SectionCard title="Administrators" flush>
        <DataTable
          columns={columns}
          data={admins}
          getRowId={(a) => a._id}
          loading={loading}
          emptyState={
            <EmptyState
              icon={Shield}
              title="No administrators"
              description="Add an admin to grant dashboard access."
              className="border-0"
            />
          }
        />
      </SectionCard>

      {/* Create */}
      <FormDialog
        open={createForm !== null}
        onOpenChange={(o) => !o && setCreateForm(null)}
        title="Create Admin User"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="brand" onClick={handleCreate} disabled={saving}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </>
        }
      >
        {createForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="a-first">First name</Label>
                <Input
                  id="a-first"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-last">Last name</Label>
                <Input
                  id="a-last"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-email">Email</Label>
              <Input
                id="a-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-password">Password</Label>
              <Input
                id="a-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-tier">Admin tier</Label>
              <Select
                value={createForm.adminTier}
                onValueChange={(v) => setCreateForm({ ...createForm, adminTier: v as AdminTier })}
              >
                <SelectTrigger id="a-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </FormDialog>

      {/* Edit tier */}
      <FormDialog
        open={editTarget !== null}
        onOpenChange={(o) => !o && setEditTarget(null)}
        title="Edit Administrator"
        description={editTarget?.name}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="brand" onClick={handleEditSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        {editTarget && (
          <div className="space-y-1.5">
            <Label htmlFor="e-tier">Admin tier</Label>
            <Select
              value={editTarget.adminTier}
              onValueChange={(v) => setEditTarget({ ...editTarget, adminTier: v as AdminTier })}
            >
              <SelectTrigger id="e-tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title={`Deactivate ${deactivateTarget?.firstName}?`}
        description="They will lose access to the admin panel immediately."
        confirmLabel="Deactivate"
        destructive
      />
    </div>
  );
}
