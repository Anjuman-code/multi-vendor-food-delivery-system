import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useVendor } from '@/contexts/VendorContext';
import { toast } from '@/lib/toast';
import reservationService from '@/services/reservationService';
import type {
  ClosedDateOverride,
  ReservationSettings,
  TableInventoryItem,
} from '@/types/reservation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  DoorOpen,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const defaultSettings: ReservationSettings = {
  isEnabled: false,
  totalSeats: 40,
  tables: [],
  walkInAllocationType: 'percentage',
  walkInAllocationValue: 20,
  minPartySize: 1,
  maxPartySize: 10,
  slotDurationMinutes: 90,
  slotIntervalMinutes: 30,
  maxAdvanceDays: 30,
  minLeadTimeHours: 2,
  closedDates: [],
  autoConfirm: true,
  cancellationWindowHours: 2,
  noShowGracePeriodMinutes: 15,
  depositRequired: false,
  depositAmountPerGuest: 0,
};

export const VendorReservationSettingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { restaurants, selectedRestaurantId } = useVendor();

  const activeRestaurantId = id || selectedRestaurantId || restaurants[0]?._id;
  const currentRestaurant = restaurants.find((r) => r._id === activeRestaurantId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReservationSettings>(defaultSettings);
  const [onlineCapacity, setOnlineCapacity] = useState(32);

  // New table input state
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState<number>(4);

  // New closed date input state
  const [newClosedDate, setNewClosedDate] = useState('');
  const [newClosedReason, setNewClosedReason] = useState('');

  const fetchSettings = useCallback(async () => {
    if (!activeRestaurantId) return;
    setLoading(true);
    try {
      const data =
        await reservationService.getVendorReservationSettings(activeRestaurantId);
      setSettings(data.settings || defaultSettings);
      setOnlineCapacity(data.onlineCapacity || 0);
    } catch {
      toast.error('Error', {
        description: 'Failed to load reservation settings.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeRestaurantId]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  // Recalculate online capacity preview
  useEffect(() => {
    const total = settings.totalSeats || 0;
    const walkIn =
      settings.walkInAllocationType === 'percentage'
        ? Math.ceil(total * ((settings.walkInAllocationValue || 0) / 100))
        : settings.walkInAllocationValue || 0;
    setOnlineCapacity(Math.max(0, total - walkIn));
  }, [
    settings.totalSeats,
    settings.walkInAllocationType,
    settings.walkInAllocationValue,
  ]);

  const handleAddTable = () => {
    if (!newTableNumber.trim()) {
      toast.error('Table number required');
      return;
    }
    const updated: TableInventoryItem = {
      tableNumber: newTableNumber.trim(),
      capacity: newTableCapacity || 2,
    };
    setSettings((prev) => ({
      ...prev,
      tables: [...(prev.tables || []), updated],
    }));
    setNewTableNumber('');
    setNewTableCapacity(4);
  };

  const handleRemoveTable = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      tables: prev.tables.filter((_, i) => i !== index),
    }));
  };

  const handleAddClosedDate = () => {
    if (!newClosedDate) {
      toast.error('Select a date');
      return;
    }
    const updated: ClosedDateOverride = {
      date: newClosedDate,
      reason: newClosedReason.trim() || undefined,
    };
    setSettings((prev) => ({
      ...prev,
      closedDates: [...(prev.closedDates || []), updated],
    }));
    setNewClosedDate('');
    setNewClosedReason('');
  };

  const handleRemoveClosedDate = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      closedDates: prev.closedDates.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId) return;

    // Client-side validations
    if (settings.minPartySize > settings.maxPartySize) {
      toast.error('Invalid Party Limits', {
        description: 'Minimum party size cannot exceed maximum party size.',
      });
      return;
    }

    if (
      settings.walkInAllocationType === 'percentage' &&
      settings.walkInAllocationValue > 100
    ) {
      toast.error('Invalid Walk-in Share', {
        description: 'Percentage cannot exceed 100%.',
      });
      return;
    }

    if (
      settings.walkInAllocationType === 'fixed_seats' &&
      settings.walkInAllocationValue >= settings.totalSeats
    ) {
      toast.error('Invalid Walk-in Seats', {
        description: 'Walk-in seats cannot equal or exceed total capacity.',
      });
      return;
    }

    setSaving(true);
    try {
      await reservationService.updateVendorReservationSettings(
        activeRestaurantId,
        settings,
      );
      toast.success('Settings Saved Successfully', {
        description: 'Table reservation rules updated.',
      });
      void fetchSettings();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to save settings.';
      toast.error('Save Failed', { description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Breadcrumb / Back Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          <Link to="/vendor/reservations">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Reservations Dashboard
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight sm:text-3xl">
            Reservation Settings
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Configure seating capacity, time rules, deposit policy, and walk-in
            protection for {currentRestaurant?.name || 'your restaurant'}
          </p>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Main Enable/Disable Toggle */}
        <Card className="p-6 rounded-2xl border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-brand-500" />
                Accept Online Table Reservations
              </h2>
              <p className="text-xs text-gray-500">
                When turned on, customers can discover and book tables at your
                restaurant on the platform.
              </p>
            </div>
            <Switch
              checked={settings.isEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, isEnabled: checked }))
              }
            />
          </div>
        </Card>

        {/* Section 2: Seating Capacity & Walk-in Allocation */}
        <Card className="p-6 rounded-2xl border-gray-200/80 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-500" />
            Seating Capacity & Walk-in Allocation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Total Dining Seats *
              </label>
              <Input
                type="number"
                min={1}
                max={2000}
                value={settings.totalSeats}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    totalSeats: parseInt(e.target.value, 10) || 1,
                  }))
                }
                className="h-11 rounded-xl text-sm"
                required
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Total maximum simultaneous seated guests in your dining area
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Walk-in Protection Share *
              </label>
              <div className="flex gap-2">
                <Select
                  value={settings.walkInAllocationType}
                  onValueChange={(val: 'percentage' | 'fixed_seats') =>
                    setSettings((prev) => ({
                      ...prev,
                      walkInAllocationType: val,
                    }))
                  }
                >
                  <SelectTrigger className="w-36 h-11 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_seats">Fixed Seats</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  max={settings.walkInAllocationType === 'percentage' ? 100 : settings.totalSeats - 1}
                  value={settings.walkInAllocationValue}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      walkInAllocationValue: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="h-11 rounded-xl text-sm flex-1"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Held back exclusively for walk-ins so online bookings never
                overbook your physical floor.
              </p>
            </div>
          </div>

          {/* Real-time capacity preview badge */}
          <div className="rounded-xl bg-brand-50/80 border border-brand-100 p-3.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-brand-900">
              Online Bookable Capacity per Slot:
            </span>
            <span className="font-black text-sm text-brand-600 bg-white px-3 py-1 rounded-lg border border-brand-200">
              {onlineCapacity} Seats ({settings.totalSeats - onlineCapacity} held
              for walk-ins)
            </span>
          </div>

          {/* Table inventory list (optional) */}
          <div className="pt-2 border-t space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              Table Layout & Inventory (Optional)
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Table identifier (e.g. T-1)"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                className="h-10 rounded-xl text-xs flex-1"
              />
              <Input
                type="number"
                min={1}
                max={20}
                placeholder="Seats (e.g. 4)"
                value={newTableCapacity}
                onChange={(e) =>
                  setNewTableCapacity(parseInt(e.target.value, 10) || 2)
                }
                className="h-10 rounded-xl text-xs w-28"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTable}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Table
              </Button>
            </div>

            {settings.tables && settings.tables.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {settings.tables.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-1.5 text-xs text-gray-800"
                  >
                    <span className="font-bold">{t.tableNumber}</span>
                    <span className="text-gray-500">({t.capacity} seats)</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTable(idx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Section 3: Party Size Limits & Time Rules */}
        <Card className="p-6 rounded-2xl border-gray-200/80 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-500" />
            Party Size Limits & Timing Rules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Minimum Party Size (Guests) *
              </label>
              <Input
                type="number"
                min={1}
                max={settings.maxPartySize}
                value={settings.minPartySize}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    minPartySize: parseInt(e.target.value, 10) || 1,
                  }))
                }
                className="h-11 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Maximum Party Size (Guests) *
              </label>
              <Input
                type="number"
                min={settings.minPartySize}
                max={100}
                value={settings.maxPartySize}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maxPartySize: parseInt(e.target.value, 10) || 1,
                  }))
                }
                className="h-11 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Slot Turn Time (Minutes) *
              </label>
              <Input
                type="number"
                min={15}
                max={360}
                step={15}
                value={settings.slotDurationMinutes}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    slotDurationMinutes: parseInt(e.target.value, 10) || 90,
                  }))
                }
                className="h-11 rounded-xl text-sm"
                required
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Default dining turn time (e.g. 90 minutes)
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Slot Booking Interval (Minutes) *
              </label>
              <Select
                value={String(settings.slotIntervalMinutes)}
                onValueChange={(val) =>
                  setSettings((prev) => ({
                    ...prev,
                    slotIntervalMinutes: parseInt(val, 10),
                  }))
                }
              >
                <SelectTrigger className="h-11 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every 60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Minimum Notice Required (Hours) *
              </label>
              <Input
                type="number"
                min={0}
                max={72}
                value={settings.minLeadTimeHours}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    minLeadTimeHours: parseFloat(e.target.value) || 0,
                  }))
                }
                className="h-11 rounded-xl text-sm"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Prevents last-minute surprise bookings (e.g. 2 hours advance notice)
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Max Advance Booking (Days) *
              </label>
              <Input
                type="number"
                min={1}
                max={365}
                value={settings.maxAdvanceDays}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maxAdvanceDays: parseInt(e.target.value, 10) || 30,
                  }))
                }
                className="h-11 rounded-xl text-sm"
              />
            </div>
          </div>
        </Card>

        {/* Section 4: Closed Date / Holiday Overrides */}
        <Card className="p-6 rounded-2xl border-gray-200/80 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand-500" />
            Holiday & Closed Date Overrides
          </h2>
          <p className="text-xs text-gray-500">
            Block specific dates when your dining room is closed for holidays,
            private events, or renovations.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="date"
              value={newClosedDate}
              onChange={(e) => setNewClosedDate(e.target.value)}
              className="h-10 rounded-xl text-xs w-full sm:w-48"
            />
            <Input
              placeholder="Reason (e.g. Eid Holiday, Private Event)"
              value={newClosedReason}
              onChange={(e) => setNewClosedReason(e.target.value)}
              className="h-10 rounded-xl text-xs flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddClosedDate}
              className="h-10 rounded-xl text-xs font-semibold"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Closed Date
            </Button>
          </div>

          {settings.closedDates && settings.closedDates.length > 0 && (
            <div className="space-y-2 pt-2">
              {settings.closedDates.map((cd, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-rose-50/60 border border-rose-100 p-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-900">{cd.date}</span>
                    {cd.reason && (
                      <span className="text-rose-700 italic">
                        — {cd.reason}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveClosedDate(idx)}
                    className="text-rose-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Section 5: Booking Policies & Optional Pre-payment Deposit */}
        <Card className="p-6 rounded-2xl border-gray-200/80 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-500" />
            Booking & Deposit Policies
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-gray-900">
                  Instant Auto-Confirmation
                </span>
                <p className="text-xs text-gray-500">
                  Automatically confirm bookings if capacity permits without
                  manual vendor review.
                </p>
              </div>
              <Switch
                checked={settings.autoConfirm}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, autoConfirm: checked }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Cancellation Window (Hours) *
                </label>
                <Input
                  type="number"
                  min={0}
                  max={72}
                  value={settings.cancellationWindowHours}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      cancellationWindowHours: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-11 rounded-xl text-sm"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Hours prior to reservation within which guests can cancel for free
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  No-Show Grace Period (Minutes) *
                </label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={settings.noShowGracePeriodMinutes}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      noShowGracePeriodMinutes: parseInt(e.target.value, 10) || 15,
                    }))
                  }
                  className="h-11 rounded-xl text-sm"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Minutes to hold table after scheduled time before releasing
                </p>
              </div>
            </div>

            {/* Optional Deposit Section */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-brand-500" />
                    Require Booking Deposit (Optional)
                  </span>
                  <p className="text-xs text-gray-500">
                    Charge a refundable deposit per guest to curb no-shows
                  </p>
                </div>
                <Switch
                  checked={settings.depositRequired}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      depositRequired: checked,
                    }))
                  }
                />
              </div>

              {settings.depositRequired && (
                <div className="pt-2 border-t">
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Deposit Amount per Guest (৳ BDT) *
                  </label>
                  <div className="relative w-48">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                      ৳
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={50}
                      value={settings.depositAmountPerGuest}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          depositAmountPerGuest:
                            parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="h-11 pl-8 rounded-xl text-sm font-bold"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    E.g. ৳200/guest will charge ৳800 for a party of 4 via Card,
                    bKash, Nagad, Rocket, or Wallet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Save button footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="submit"
            disabled={saving}
            className="h-12 px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-md shadow-brand-500/25"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              'Save Reservation Settings'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default VendorReservationSettingsPage;
