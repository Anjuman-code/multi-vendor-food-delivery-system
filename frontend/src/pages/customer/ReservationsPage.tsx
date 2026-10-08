import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { toast } from '@/lib/toast';
import reservationService from '@/services/reservationService';
import type { Reservation } from '@/types/reservation';
import { cn } from '@/utils/cn';
import { restaurantFallbackSVG } from '@/utils/fallbackImages';
import { format } from 'date-fns';
import {
  Calendar,
  CalendarDays,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  Users,
  XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const ReservationsPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reservationService.getMyReservations(activeTab);
      setReservations(data);
    } catch {
      toast.error('Error', {
        description: 'Failed to load your reservations. Please try again.',
      });
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/reservations');
      return;
    }
    if (isAuthenticated) {
      void fetchReservations();
    }
  }, [isAuthenticated, authLoading, navigate, fetchReservations]);

  const handleCancel = async (res: Reservation) => {
    const isConfirmed = await confirm({
      title: 'Cancel Reservation?',
      description: `Are you sure you want to cancel your table reservation at ${
        typeof res.restaurantId === 'object'
          ? res.restaurantId.name
          : 'the restaurant'
      }?`,
      confirmLabel: 'Yes, Cancel',
      cancelLabel: 'Keep Booking',
      variant: 'destructive',
    });

    if (!isConfirmed) return;

    setCancellingId(res._id);
    try {
      await reservationService.cancelMyReservation(
        res._id,
        'Cancelled by customer',
      );
      toast.success('Reservation Cancelled', {
        description: 'Your booking has been cancelled.',
      });
      void fetchReservations();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not cancel reservation. Please check cancellation policy.';
      toast.error('Cancellation Failed', { description: msg });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16 pt-6">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <PageHeader
          title="My Table Reservations"
          description="Manage your upcoming bookings and dining history"
          actions={
            <Button
              asChild
              className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-sm"
            >
              <Link to="/restaurants">
                <Plus className="mr-1.5 h-4 w-4" />
                Book a New Table
              </Link>
            </Button>
          }
        />

        {/* Mobile Tabs */}
        <div className="mt-6 flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={cn(
              'flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-all',
              activeTab === 'upcoming'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900',
            )}
          >
            Upcoming Bookings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('past')}
            className={cn(
              'flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-all',
              activeTab === 'past'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900',
            )}
          >
            Past & Cancelled
          </button>
        </div>

        {/* Content list */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
              <p className="mt-2 text-sm text-gray-500">
                Loading your reservations...
              </p>
            </div>
          ) : reservations.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={
                activeTab === 'upcoming'
                  ? 'No Upcoming Reservations'
                  : 'No Past Reservations'
              }
              description={
                activeTab === 'upcoming'
                  ? "You don’t have any tables booked right now. Explore popular dine-in spots and reserve in seconds."
                  : "Your past and completed reservations will show up here."
              }
              action={{
                label: "Browse Restaurants",
                onClick: () => navigate("/restaurants"),
              }}
            />
          ) : (
            reservations.map((res) => {
              const restaurant =
                typeof res.restaurantId === 'object' && res.restaurantId !== null
                  ? res.restaurantId
                  : null;

              const isUpcoming =
                ['pending', 'confirmed', 'seated'].includes(res.status);

              return (
                <div
                  key={res._id}
                  className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left: restaurant avatar & details */}
                      <div className="flex items-start gap-4">
                        <img
                          src={
                            restaurant?.images?.logo ||
                            restaurant?.images?.coverPhoto ||
                            restaurantFallbackSVG
                          }
                          alt={restaurant?.name || 'Restaurant'}
                          className="h-14 w-14 rounded-2xl object-cover ring-1 ring-gray-100 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-gray-900">
                              {restaurant?.name || 'Restaurant'}
                            </h3>
                            <StatusBadge status={res.status} size="sm" />
                          </div>

                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                            <span>
                              {restaurant?.address?.street
                                ? `${restaurant.address.street}, ${restaurant.address.area}`
                                : 'Sylhet, Bangladesh'}
                            </span>
                          </p>

                          <div className="mt-2.5 flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                            <span className="font-semibold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md border">
                              #{res.reservationNumber}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-orange-500" />
                              {format(new Date(res.date), 'EEE, MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-orange-500" />
                              {res.time}
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <Users className="h-3.5 w-3.5 text-orange-500" />
                              {res.partySize} {res.partySize === 1 ? 'Guest' : 'Guests'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 border-t pt-3 sm:border-t-0 sm:pt-0 shrink-0">
                        {isUpcoming && res.status !== 'seated' && (
                          <Button
                            variant="outline"
                            size="sm"
                            loading={cancellingId === res._id}
                            disabled={!!cancellingId}
                            onClick={() => handleCancel(res)}
                            className="rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-9"
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Cancel
                          </Button>
                        )}
                        <Button
                          size="sm"
                          asChild
                          className="rounded-xl bg-gray-900 hover:bg-black text-white text-xs h-9"
                        >
                          <Link to={`/reservations/${res._id}`}>
                            Details
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationsPage;
