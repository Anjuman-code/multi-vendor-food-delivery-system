import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { toast } from '@/lib/toast';
import reservationService from '@/services/reservationService';
import type { Reservation, ReservationStatus } from '@/types/reservation';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

const getStatusBadge = (status: ReservationStatus) => {
  switch (status) {
    case 'confirmed':
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          Confirmed
        </span>
      );
    case 'seated':
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
          Seated
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-600/20">
          Completed
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
          Pending
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
          Cancelled
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
          Rejected
        </span>
      );
    case 'no_show':
      return (
        <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 ring-1 ring-inset ring-orange-600/20">
          No Show
        </span>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const AdminReservationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Details modal
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reservationService.getAdminReservations({
        status: statusFilter,
        date: dateFilter || undefined,
        search: searchQuery.trim() || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setReservations(data.reservations || []);
      setPagination(data.pagination);
    } catch {
      toast.error('Error', {
        description: 'Failed to fetch platform reservations.',
      });
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter, searchQuery, pagination.page, pagination.limit]);

  useEffect(() => {
    void fetchReservations();
  }, [fetchReservations]);

  const handleAdminStatusChange = async (
    resId: string,
    newStatus: ReservationStatus,
  ) => {
    try {
      await reservationService.updateReservationStatus(resId, {
        status: newStatus,
        reason: 'Updated by Platform Admin',
      });
      toast.success(`Status updated to ${newStatus}`);
      setSelectedRes(null);
      void fetchReservations();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update reservation.';
      toast.error('Update Failed', { description: msg });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
          Reservations Oversight
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-500">
          Platform-wide table reservations, floor occupancy, and dispute
          moderation
        </p>
      </div>

      {/* Filters Card */}
      <Card className="p-4 rounded-2xl border-gray-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, guest name, or phone..."
              className="h-10 pl-9 rounded-xl text-xs"
            />
          </div>

          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 rounded-xl text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="seated">Seated</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 rounded-xl text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Table / List */}
      <Card className="overflow-hidden rounded-2xl border-gray-200/80 shadow-sm">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500" />
            <p className="mt-2 text-xs text-gray-500">
              Loading platform reservations...
            </p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-sm font-bold text-gray-800">
              No Reservations Found
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting your search criteria or date filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Reservation</th>
                  <th className="px-3 py-3.5">Restaurant</th>
                  <th className="px-3 py-3.5">Guest Info</th>
                  <th className="px-3 py-3.5">Date & Time</th>
                  <th className="px-3 py-3.5">Guests</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-3 py-3.5">Deposit</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600">
                {reservations.map((res) => {
                  const restaurant =
                    typeof res.restaurantId === 'object' && res.restaurantId
                      ? res.restaurantId
                      : null;

                  return (
                    <tr key={res._id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3 pl-6 pr-3 font-mono font-bold text-gray-900">
                        #{res.reservationNumber}
                      </td>
                      <td className="px-3 py-3 font-semibold text-gray-900">
                        {restaurant?.name || 'N/A'}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-gray-900 block">
                          {res.guestInfo.name}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {res.guestInfo.phone}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-medium text-gray-900 block">
                          {format(new Date(res.date), 'MMM d, yyyy')}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {res.time}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-gray-900">
                        {res.partySize}
                      </td>
                      <td className="px-3 py-3">{getStatusBadge(res.status)}</td>
                      <td className="px-3 py-3">
                        {res.deposit?.required ? (
                          <span
                            className={cn(
                              'font-semibold capitalize',
                              res.deposit.status === 'paid' && 'text-emerald-600',
                              res.deposit.status === 'pending' &&
                                'text-amber-600',
                              res.deposit.status === 'refunded' && 'text-blue-600',
                            )}
                          >
                            ৳{res.deposit.amount} ({res.deposit.status})
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="py-3 pl-3 pr-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRes(res)}
                          className="h-8 rounded-lg text-xs font-semibold text-brand-600 hover:text-brand-700"
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3 text-xs text-gray-500">
            <span>
              Showing page {pagination.page} of {pagination.pages} (
              {pagination.total} total)
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                className="h-8 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                className="h-8 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Inspect & Moderate Modal */}
      {selectedRes && (
        <Dialog
          open={Boolean(selectedRes)}
          onOpenChange={(open) => !open && setSelectedRes(null)}
        >
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Reservation #{selectedRes.reservationNumber}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Detailed audit and administration
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">
                    Status
                  </span>
                  <span className="font-semibold text-gray-900 capitalize">
                    {selectedRes.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">
                    Party Size
                  </span>
                  <span className="font-semibold text-gray-900">
                    {selectedRes.partySize} guests
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">
                    Date & Time
                  </span>
                  <span className="font-semibold text-gray-900">
                    {selectedRes.date} at {selectedRes.time}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">
                    Guest Phone
                  </span>
                  <span className="font-semibold text-gray-900">
                    {selectedRes.guestInfo.phone}
                  </span>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="space-y-2">
                <span className="font-bold text-gray-700 block">
                  Status History
                </span>
                <div className="space-y-1.5 border-l-2 border-brand-200 pl-3">
                  {selectedRes.statusHistory?.map((h, i) => (
                    <div key={i} className="text-[11px]">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-800 capitalize">
                          {h.status}
                        </span>
                        <span className="text-gray-400">
                          {format(new Date(h.timestamp), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      {h.reason && (
                        <p className="text-gray-500 italic mt-0.5">{h.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Status Override Actions */}
              <div className="pt-3 border-t space-y-2">
                <span className="font-bold text-gray-700 block">
                  Admin Status Override:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleAdminStatusChange(selectedRes._id, 'confirmed')
                    }
                    className="h-8 rounded-lg text-xs text-emerald-600"
                  >
                    Set Confirmed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleAdminStatusChange(selectedRes._id, 'seated')
                    }
                    className="h-8 rounded-lg text-xs text-blue-600"
                  >
                    Set Seated
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleAdminStatusChange(selectedRes._id, 'completed')
                    }
                    className="h-8 rounded-lg text-xs"
                  >
                    Set Completed
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      handleAdminStatusChange(selectedRes._id, 'cancelled')
                    }
                    className="h-8 rounded-lg text-xs"
                  >
                    Cancel Booking
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminReservationsPage;
