import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  StatusBadge,
  VendorEmptyState,
} from '@/components/vendor';
import { useVendor } from '@/contexts/VendorContext';
import { toast } from '@/lib/toast';
import reservationService from '@/services/reservationService';
import type {
  CreateManualReservationPayload,
  Reservation,
  ReservationStatus,
  VendorReservationsStats,
} from '@/types/reservation';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Loader2,
  Phone,
  Plus,
  Search,
  Settings,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export const VendorReservationsPage: React.FC = () => {
  const { restaurants, selectedRestaurantId, setSelectedRestaurantId } =
    useVendor();

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<VendorReservationsStats>({
    todayBookings: 0,
    expectedGuests: 0,
    seatedGuests: 0,
    occupancyRate: 0,
    pendingApprovals: 0,
  });

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Manual reservation dialog
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualSource, setManualSource] = useState<'walk_in' | 'manual'>(
    'manual',
  );
  const [manualPartySize, setManualPartySize] = useState<number>(2);
  const [manualDate, setManualDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [manualTime, setManualTime] = useState<string>('19:00');
  const [manualGuestName, setManualGuestName] = useState<string>('');
  const [manualGuestPhone, setManualGuestPhone] = useState<string>('');
  const [manualGuestEmail, setManualGuestEmail] = useState<string>('');
  const [manualSpecialRequests, setManualSpecialRequests] =
    useState<string>('');
  const [manualTable, setManualTable] = useState<string>('');
  const [manualSubmitting, setManualSubmitting] = useState<boolean>(false);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    res: Reservation | null;
    status: ReservationStatus | null;
    title: string;
    description: string;
    confirmLabel: string;
    requireReason: boolean;
  }>({
    open: false,
    res: null,
    status: null,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    requireReason: false,
  });

  const activeRestaurant =
    restaurants.find((r) => r._id === selectedRestaurantId) || restaurants[0];

  const fetchReservations = useCallback(async () => {
    if (!activeRestaurant?._id) return;
    setLoading(true);
    try {
      const data = await reservationService.getVendorReservations({
        restaurantId: activeRestaurant._id,
        date: selectedDate || undefined,
        status: statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setReservations(data.reservations || []);
      setStats(data.stats || {
        todayBookings: 0,
        expectedGuests: 0,
        seatedGuests: 0,
        occupancyRate: 0,
        pendingApprovals: 0,
      });
    } catch {
      toast.error('Error', {
        description: 'Failed to fetch restaurant reservations.',
      });
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [activeRestaurant?._id, selectedDate, statusFilter, searchQuery]);

  useEffect(() => {
    void fetchReservations();
  }, [fetchReservations]);

  const handleStatusChange = async (
    res: Reservation,
    newStatus: ReservationStatus,
    reason?: string,
  ) => {
    if ((newStatus === 'rejected' || newStatus === 'cancelled') && reason === undefined) {
      setConfirmDialog({
        open: true,
        res,
        status: newStatus,
        title: newStatus === 'rejected' ? 'Reject Reservation' : 'Cancel Reservation',
        description: `Are you sure you want to mark reservation #${res.reservationNumber} for ${res.guestInfo.name} as ${newStatus}?`,
        confirmLabel: newStatus === 'rejected' ? 'Reject Reservation' : 'Cancel Reservation',
        requireReason: true,
      });
      return;
    }

    setActionLoadingId(`${res._id}-${newStatus}`);
    try {
      await reservationService.updateReservationStatus(res._id, {
        status: newStatus,
        reason,
      });
      toast.success(`Reservation marked as ${newStatus.replace('_', ' ')}`);
      void fetchReservations();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Could not update status.';
      toast.error('Update Failed', { description: msg });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurant?._id) return;
    if (!manualGuestName.trim() || !manualGuestPhone.trim()) {
      toast.error('Required Fields', {
        description: 'Guest name and phone number are required.',
      });
      return;
    }

    setManualSubmitting(true);
    try {
      const payload: CreateManualReservationPayload = {
        restaurantId: activeRestaurant._id,
        partySize: manualPartySize,
        date: manualDate,
        time: manualTime,
        source: manualSource,
        status: manualSource === 'walk_in' ? 'seated' : 'confirmed',
        guestInfo: {
          name: manualGuestName.trim(),
          phone: manualGuestPhone.trim(),
          email: manualGuestEmail.trim() || undefined,
        },
        specialRequests: manualSpecialRequests.trim() || undefined,
        assignedTables: manualTable.trim() ? [manualTable.trim()] : [],
      };

      await reservationService.createVendorManualReservation(payload);
      toast.success(
        manualSource === 'walk_in'
          ? 'Walk-in Seated Successfully'
          : 'Manual Booking Created',
      );
      setManualModalOpen(false);
      // Reset form
      setManualGuestName('');
      setManualGuestPhone('');
      setManualGuestEmail('');
      setManualSpecialRequests('');
      setManualTable('');
      void fetchReservations();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to record manual booking.';
      toast.error('Booking Error', { description: msg });
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Restaurant Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight sm:text-3xl">
            Table Reservations
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Manage table bookings, walk-ins, and floor occupancy
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {restaurants.length > 1 && (
            <Select
              value={activeRestaurant?._id || ''}
              onValueChange={(val) => setSelectedRestaurantId(val)}
            >
              <SelectTrigger className="w-52 h-10 rounded-xl bg-white text-xs font-semibold">
                <SelectValue placeholder="Select Restaurant" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {activeRestaurant && (
            <Button
              variant="outline"
              asChild
              className="h-10 rounded-xl text-xs font-semibold"
            >
              <Link
                to={`/vendor/restaurants/${activeRestaurant._id}/reservations/settings`}
              >
                <Settings className="mr-1.5 h-4 w-4" />
                Reservation Settings
              </Link>
            </Button>
          )}

          <Button
            onClick={() => setManualModalOpen(true)}
            className="h-10 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Walk-in / Booking
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="p-4 rounded-2xl border-gray-100 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Today’s Bookings
          </p>
          <p className="mt-1 text-2xl font-black text-gray-900">
            {stats.todayBookings}
          </p>
        </Card>

        <Card className="p-4 rounded-2xl border-gray-100 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Expected Guests
          </p>
          <p className="mt-1 text-2xl font-black text-brand-600">
            {stats.expectedGuests}
          </p>
        </Card>

        <Card className="p-4 rounded-2xl border-gray-100 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Currently Seated
          </p>
          <p className="mt-1 text-2xl font-black text-blue-600">
            {stats.seatedGuests}
          </p>
        </Card>

        <Card className="p-4 rounded-2xl border-gray-100 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Floor Occupancy
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-gray-900">
              {stats.occupancyRate}%
            </span>
            <div className="h-1.5 w-12 rounded-full bg-gray-100 overflow-hidden inline-block align-middle">
              <div
                className="h-full bg-brand-500 rounded-full"
                style={{ width: `${Math.min(100, stats.occupancyRate)}%` }}
              />
            </div>
          </div>
        </Card>

        <Card className="col-span-2 sm:col-span-1 p-4 rounded-2xl border-gray-100 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Pending Approval
          </p>
          <p className="mt-1 text-2xl font-black text-amber-500">
            {stats.pendingApprovals}
          </p>
        </Card>
      </div>

      {/* Filter and View Control Bar */}
      <Card className="p-4 rounded-2xl border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Button
              variant={
                selectedDate === format(new Date(), 'yyyy-MM-dd')
                  ? 'default'
                  : 'outline'
              }
              size="sm"
              onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
              className={cn(
                'rounded-xl text-xs h-9',
                selectedDate === format(new Date(), 'yyyy-MM-dd') &&
                  'bg-brand-500 hover:bg-brand-600 text-white',
              )}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(format(tomorrow, 'yyyy-MM-dd'));
              }}
              className="rounded-xl text-xs h-9"
            >
              Tomorrow
            </Button>
            <div className="relative">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 rounded-xl text-xs w-36"
              />
            </div>
            {selectedDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate('')}
                className="h-9 px-2 text-xs text-gray-400 hover:text-gray-700"
              >
                Clear Date
              </Button>
            )}
          </div>

          {/* Right: View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-gray-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900',
                )}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  viewMode === 'timeline'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900',
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Timeline
              </button>
            </div>
          </div>
        </div>

        {/* Status Pill Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { label: 'All', value: 'all' },
              { label: 'Pending', value: 'pending' },
              { label: 'Confirmed', value: 'confirmed' },
              { label: 'Seated', value: 'seated' },
              { label: 'Completed', value: 'completed' },
              { label: 'Cancelled', value: 'cancelled' },
            ].map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => setStatusFilter(st.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition',
                  statusFilter === st.value
                    ? 'bg-brand-50 text-brand-600 font-bold ring-1 ring-brand-500/30'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest or code..."
              className="h-9 pl-9 rounded-xl text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500" />
          <p className="mt-2 text-xs text-gray-500">Loading reservations...</p>
        </div>
      ) : reservations.length === 0 ? (
        <VendorEmptyState
          icon={Calendar}
          title="No Reservations Found"
          description="No table bookings match your selected date or status filter."
          action={{
            label: 'Add Walk-in Reservation',
            onClick: () => setManualModalOpen(true),
            icon: Plus,
          }}
        />
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-3">
          {reservations.map((res) => (
            <Card
              key={res._id}
              className="p-4 sm:p-5 rounded-2xl border-gray-200/80 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: Info */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded-md">
                      #{res.reservationNumber}
                    </span>
                    <StatusBadge status={res.status} />
                    <span className="text-xs font-semibold text-gray-800">
                      {res.guestInfo.name}
                    </span>
                    {res.source === 'walk_in' && (
                      <Badge variant="secondary" className="text-[10px]">
                        Walk-in
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-gray-700">
                      <Clock className="h-3.5 w-3.5 text-brand-500" />
                      {res.time} - {res.endTime}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-gray-700">
                      <Users className="h-3.5 w-3.5 text-brand-500" />
                      {res.partySize} Guests
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      {res.guestInfo.phone}
                    </span>
                    {res.assignedTables && res.assignedTables.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                          Table: {res.assignedTables.join(', ')}
                        </span>
                      </>
                    )}
                  </div>

                  {res.specialRequests && (
                    <p className="text-xs text-amber-800 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                      Request: “{res.specialRequests}”
                    </p>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 flex-wrap border-t pt-3 sm:border-t-0 sm:pt-0 shrink-0">
                  {res.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        disabled={Boolean(actionLoadingId)}
                        loading={actionLoadingId === `${res._id}-confirmed`}
                        onClick={() => handleStatusChange(res, 'confirmed')}
                        className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={Boolean(actionLoadingId)}
                        onClick={() => handleStatusChange(res, 'rejected')}
                        className="h-8 rounded-lg text-rose-600 hover:bg-rose-50 text-xs"
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </>
                  )}

                  {res.status === 'confirmed' && (
                    <>
                      <Button
                        size="sm"
                        disabled={Boolean(actionLoadingId)}
                        loading={actionLoadingId === `${res._id}-seated`}
                        onClick={() => handleStatusChange(res, 'seated')}
                        className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                      >
                        <UserCheck className="mr-1 h-3.5 w-3.5" />
                        Seat Guests
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={Boolean(actionLoadingId)}
                        loading={actionLoadingId === `${res._id}-no_show`}
                        onClick={() => handleStatusChange(res, 'no_show')}
                        className="h-8 rounded-lg text-orange-600 hover:bg-orange-50 text-xs"
                      >
                        No Show
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={Boolean(actionLoadingId)}
                        onClick={() => handleStatusChange(res, 'cancelled')}
                        className="h-8 rounded-lg text-rose-600 text-xs"
                      >
                        Cancel
                      </Button>
                    </>
                  )}

                  {res.status === 'seated' && (
                    <Button
                      size="sm"
                      disabled={Boolean(actionLoadingId)}
                      loading={actionLoadingId === `${res._id}-completed`}
                      onClick={() => handleStatusChange(res, 'completed')}
                      className="h-8 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-semibold"
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Mark Completed
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Timeline / Occupancy Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reservations.map((res) => (
            <Card
              key={res._id}
              className={cn(
                'p-4 rounded-2xl border transition',
                res.status === 'seated' && 'border-blue-300 bg-blue-50/20',
                res.status === 'confirmed' && 'border-emerald-200 bg-emerald-50/10',
                res.status === 'completed' && 'border-gray-200 bg-gray-50/50',
              )}
            >
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="font-bold text-sm text-gray-900">
                  {res.time}
                </span>
                <StatusBadge status={res.status} />
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <p className="font-bold text-gray-900">{res.guestInfo.name}</p>
                <p className="text-gray-500 flex items-center gap-1">
                  <Users className="h-3 w-3 text-brand-500" />
                  Party of {res.partySize}
                </p>
                <p className="text-gray-500 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-gray-400" />
                  {res.guestInfo.phone}
                </p>
                {res.assignedTables && res.assignedTables.length > 0 && (
                  <p className="font-semibold text-brand-600">
                    Table {res.assignedTables.join(', ')}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t flex justify-end gap-1.5">
                {res.status === 'confirmed' && (
                  <Button
                    size="sm"
                    disabled={Boolean(actionLoadingId)}
                    loading={actionLoadingId === `${res._id}-seated`}
                    onClick={() => handleStatusChange(res, 'seated')}
                    className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    Seat
                  </Button>
                )}
                {res.status === 'seated' && (
                  <Button
                    size="sm"
                    disabled={Boolean(actionLoadingId)}
                    loading={actionLoadingId === `${res._id}-completed`}
                    onClick={() => handleStatusChange(res, 'completed')}
                    className="h-8 rounded-lg bg-gray-900 hover:bg-black text-white text-xs"
                  >
                    Complete
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Manual / Walk-in Booking Modal */}
      {manualModalOpen && (
        <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                New Walk-in / Phone Reservation
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Directly register guests into floor capacity
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleManualSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setManualSource('walk_in')}
                  className={cn(
                    'py-2 rounded-lg text-xs font-bold transition',
                    manualSource === 'walk_in'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500',
                  )}
                >
                  Walk-in (Seat Immediately)
                </button>
                <button
                  type="button"
                  onClick={() => setManualSource('manual')}
                  className={cn(
                    'py-2 rounded-lg text-xs font-bold transition',
                    manualSource === 'manual'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500',
                  )}
                >
                  Phone / In-Advance
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    required
                    className="rounded-xl text-xs h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Time *
                  </label>
                  <Input
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    required
                    className="rounded-xl text-xs h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Party Size (Guests) *
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={manualPartySize}
                    onChange={(e) =>
                      setManualPartySize(parseInt(e.target.value, 10) || 1)
                    }
                    required
                    className="rounded-xl text-xs h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Table Number (Optional)
                  </label>
                  <Input
                    placeholder="e.g. T-12"
                    value={manualTable}
                    onChange={(e) => setManualTable(e.target.value)}
                    className="rounded-xl text-xs h-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Guest Name *
                </label>
                <Input
                  placeholder="e.g. Rafiqul Islam"
                  value={manualGuestName}
                  onChange={(e) => setManualGuestName(e.target.value)}
                  required
                  className="rounded-xl text-xs h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Guest Phone *
                  </label>
                  <Input
                    placeholder="+880 1712-345678"
                    value={manualGuestPhone}
                    onChange={(e) => setManualGuestPhone(e.target.value)}
                    required
                    className="rounded-xl text-xs h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Guest Email (Optional)
                  </label>
                  <Input
                    type="email"
                    placeholder="guest@example.com"
                    value={manualGuestEmail}
                    onChange={(e) => setManualGuestEmail(e.target.value)}
                    className="rounded-xl text-xs h-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Special Notes / Requests
                </label>
                <Textarea
                  placeholder="Seating preferences, notes..."
                  value={manualSpecialRequests}
                  onChange={(e) => setManualSpecialRequests(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setManualModalOpen(false)}
                  className="flex-1 rounded-xl text-xs h-11"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={manualSubmitting}
                  loading={manualSubmitting}
                  loadingText="Recording..."
                  className="flex-1 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold h-11"
                >
                  Save Reservation
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Rejection / Cancellation ConfirmDialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={(reason) => {
          if (confirmDialog.res && confirmDialog.status) {
            void handleStatusChange(confirmDialog.res, confirmDialog.status, reason);
          }
        }}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        requireReason={confirmDialog.requireReason}
        reasonPlaceholder="Please enter a reason (e.g. capacity constraints, customer request)..."
        destructive={true}
      />
    </div>
  );
};

export default VendorReservationsPage;
