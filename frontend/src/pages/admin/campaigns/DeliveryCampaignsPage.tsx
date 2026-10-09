import React, { useEffect, useState } from "react";
import { PageHeader, StatusBadge } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import deliveryService, {
  type DeliveryCampaignAdminItem,
} from "@/services/deliveryService";
import {
  Calendar,
  Edit2,
  Gift,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

export default function DeliveryCampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<DeliveryCampaignAdminItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<DeliveryCampaignAdminItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [minSubtotal, setMinSubtotal] = useState("500");
  const [maxDistanceKm, setMaxDistanceKm] = useState("");
  const [maxWaivedAmount, setMaxWaivedAmount] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Delete State
  const [deletingCampaign, setDeletingCampaign] = useState<DeliveryCampaignAdminItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await deliveryService.getCampaigns();
      if (res.success && res.data?.campaigns) {
        setCampaigns(res.data.campaigns);
      }
    } catch {
      toast.error("Failed to load delivery campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const openCreateModal = () => {
    setEditingCampaign(null);
    setName("");
    setLabel("Free Delivery");
    setDescription("");
    setMinSubtotal("500");
    setMaxDistanceKm("");
    setMaxWaivedAmount("");
    setStartsAt("");
    setEndsAt("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (c: DeliveryCampaignAdminItem) => {
    setEditingCampaign(c);
    setName(c.name);
    setLabel(c.label);
    setDescription(c.description || "");
    setMinSubtotal(String(c.minSubtotal));
    setMaxDistanceKm(c.maxDistanceKm != null ? String(c.maxDistanceKm) : "");
    setMaxWaivedAmount(c.maxWaivedAmount != null ? String(c.maxWaivedAmount) : "");
    setStartsAt(c.startsAt ? c.startsAt.substring(0, 10) : "");
    setEndsAt(c.endsAt ? c.endsAt.substring(0, 10) : "");
    setIsActive(c.isActive);
    setModalOpen(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedMinSubtotal = parseFloat(minSubtotal);
    if (isNaN(parsedMinSubtotal) || parsedMinSubtotal < 0) {
      toast.error("Minimum Subtotal must be 0 or greater.");
      return;
    }

    if (!name.trim()) {
      toast.error("Campaign Name is required.");
      return;
    }

    if (!label.trim()) {
      toast.error("Customer-facing label is required.");
      return;
    }

    if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
      toast.error("End date cannot be earlier than start date.");
      return;
    }

    const payload = {
      name: name.trim(),
      label: label.trim(),
      description: description.trim() || undefined,
      minSubtotal: parsedMinSubtotal,
      maxDistanceKm: maxDistanceKm ? parseFloat(maxDistanceKm) : undefined,
      maxWaivedAmount: maxWaivedAmount ? parseFloat(maxWaivedAmount) : undefined,
      startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      restaurantIds: editingCampaign?.restaurantIds ?? [],
      isActive,
    };

    setSubmitting(true);
    try {
      if (editingCampaign) {
        const res = await deliveryService.updateCampaign(editingCampaign._id, payload);
        if (res.success) {
          toast.success("Campaign updated successfully");
          setModalOpen(false);
          fetchCampaigns();
        }
      } else {
        const res = await deliveryService.createCampaign(payload);
        if (res.success) {
          toast.success("Campaign created successfully");
          setModalOpen(false);
          fetchCampaigns();
        }
      }
    } catch (err: unknown) {
      toast.error("Failed to save campaign", {
        description: (err as any)?.response?.data?.message || "An error occurred.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (c: DeliveryCampaignAdminItem) => {
    try {
      const res = await deliveryService.updateCampaign(c._id, {
        isActive: !c.isActive,
      });
      if (res.success) {
        toast.success(`Campaign ${!c.isActive ? "activated" : "deactivated"}`);
        fetchCampaigns();
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const confirmDelete = async () => {
    if (!deletingCampaign) return;
    try {
      const res = await deliveryService.deleteCampaign(deletingCampaign._id);
      if (res.success) {
        toast.success("Campaign deleted");
        fetchCampaigns();
      }
    } catch {
      toast.error("Failed to delete campaign");
    } finally {
      setDeleteConfirmOpen(false);
      setDeletingCampaign(null);
    }
  };

  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      <PageHeader
        title="Free Delivery Campaigns"
        description="Admin-managed promotional campaigns. Free delivery is never hardcoded; matching rules apply per sub-order on items subtotal."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={fetchCampaigns}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              onClick={openCreateModal}
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search campaigns…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card space-y-3">
          <Gift className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-lg">No Delivery Campaigns Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Create an active campaign to grant free delivery to customers who meet your minimum spend threshold.
          </p>
          <Button onClick={openCreateModal} size="sm" className="mt-2">
            Create First Campaign
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCampaigns.map((c) => {
            const isScheduled = c.startsAt && new Date(c.startsAt) > new Date();
            const isExpired = c.endsAt && new Date(c.endsAt) < new Date();

            return (
              <div
                key={c._id}
                className="rounded-xl border bg-card p-5 shadow-sm space-y-4 relative flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-foreground">
                          {c.name}
                        </span>
                        <StatusBadge
                          label={
                            !c.isActive
                              ? "Inactive"
                              : isExpired
                                ? "Expired"
                                : isScheduled
                                  ? "Scheduled"
                                  : "Active"
                          }
                          tone={
                            !c.isActive
                              ? "neutral"
                              : isExpired
                                ? "danger"
                                : isScheduled
                                  ? "warning"
                                  : "success"
                          }
                        />
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                        {c.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditModal(c)}
                        title="Edit campaign"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => {
                          setDeletingCampaign(c);
                          setDeleteConfirmOpen(true);
                        }}
                        title="Delete campaign"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {c.description && (
                    <p className="text-xs text-muted-foreground">
                      {c.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="text-foreground font-semibold">
                      Min Spend:
                    </span>{" "}
                    ৳{c.minSubtotal}
                  </div>
                  <div>
                    <span className="text-foreground font-semibold">Scope:</span>{" "}
                    {c.restaurantIds?.length
                      ? `${c.restaurantIds.length} restaurants`
                      : "All restaurants"}
                  </div>
                  {c.maxDistanceKm && (
                    <div>
                      <span className="text-foreground font-semibold">
                        Max Dist:
                      </span>{" "}
                      {c.maxDistanceKm} km
                    </div>
                  )}
                  {c.maxWaivedAmount && (
                    <div>
                      <span className="text-foreground font-semibold">
                        Max Waiver:
                      </span>{" "}
                      ৳{c.maxWaivedAmount}
                    </div>
                  )}
                  {(c.startsAt || c.endsAt) && (
                    <div className="col-span-2 flex items-center gap-1 text-[11px] pt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>
                        {c.startsAt ? new Date(c.startsAt).toLocaleDateString() : "Immediate"}
                        {" → "}
                        {c.endsAt ? new Date(c.endsAt).toLocaleDateString() : "Ongoing"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <div className="flex items-center gap-2">
                    <span className={c.isActive ? "font-medium text-emerald-600" : "text-muted-foreground"}>
                      {c.isActive ? "Active" : "Disabled"}
                    </span>
                    <Switch
                      checked={c.isActive}
                      onCheckedChange={() => handleToggleActive(c)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveCampaign}>
            <DialogHeader>
              <DialogTitle>
                {editingCampaign ? "Edit Delivery Campaign" : "New Free Delivery Campaign"}
              </DialogTitle>
              <DialogDescription>
                Free delivery is granted per sub-order when the restaurant's items subtotal meets the condition.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="name">Internal Campaign Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Free Delivery Above ৳500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="label">Customer Facing Badge *</Label>
                  <Input
                    id="label"
                    placeholder="e.g. Free Delivery"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="e.g. Valid on all orders above ৳500 during campaign period."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="minSubtotal">Min Items Subtotal (৳) *</Label>
                  <Input
                    id="minSubtotal"
                    type="number"
                    min="0"
                    step="10"
                    value={minSubtotal}
                    onChange={(e) => setMinSubtotal(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="maxWaivedAmount">Max Waiver Cap (৳, optional)</Label>
                  <Input
                    id="maxWaivedAmount"
                    type="number"
                    min="1"
                    placeholder="Unlimited waiver"
                    value={maxWaivedAmount}
                    onChange={(e) => setMaxWaivedAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="maxDistanceKm">Max Distance (km, optional)</Label>
                  <Input
                    id="maxDistanceKm"
                    type="number"
                    min="0.5"
                    step="0.5"
                    placeholder="No distance limit"
                    value={maxDistanceKm}
                    onChange={(e) => setMaxDistanceKm(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center justify-between pt-6">
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Campaign Active
                  </Label>
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startsAt">Start Date (Optional)</Label>
                  <Input
                    id="startsAt"
                    type="date"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endsAt">End Date (Optional)</Label>
                  <Input
                    id="endsAt"
                    type="date"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                {editingCampaign ? "Save Changes" : "Create Campaign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Delivery Campaign"
        description={`Are you sure you want to delete "${deletingCampaign?.name}"? Customers will no longer receive free delivery through this campaign.`}
        confirmLabel="Delete"
        destructive={true}
      />
    </div>
  );
}
