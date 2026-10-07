import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { toast } from '@/lib/toast';
import reservationService from '@/services/reservationService';
import type { Reservation } from '@/types/reservation';
import { cn } from '@/utils/cn';
import { restaurantFallbackSVG } from '@/utils/fallbackImages';
import { format } from 'date-fns';
import {
  ArrowLeft,
  CalendarPlus,
  History,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export const ReservationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await reservationService.getMyReservationById(id);
      setReservation(data);
    } catch {
      toast.error('Not Found', {
        description: 'Unable to find reservation details.',
      });
      navigate('/reservations');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate(`/login?redirect=/reservations/${id}`);
      return;
    }
    if (isAuthenticated) {
      void fetchDetails();
    }
  }, [isAuthenticated, authLoading, id, navigate, fetchDetails]);

  const handleCancel = async () => {
    if (!reservation) return;
    const isConfirmed = await confirm({
      title: 'Cancel Reservation?',
      description:
        'Are you sure you want to cancel this booking? This action cannot be undone.',
      confirmLabel: 'Yes, Cancel',
      cancelLabel: 'Keep Booking',
      variant: 'destructive',
    });

    if (!isConfirmed) return;

    try {
      await reservationService.cancelMyReservation(
        reservation._id,
        'Cancelled by guest from details page',
      );
      toast.success('Reservation Cancelled');
      void fetchDetails();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Cancellation could not be completed.';
      toast.error('Error', { description: msg });
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservation) return;
    if (!reviewComment.trim()) {
      toast.error('Comment Required', {
        description: 'Please write a brief comment about your experience.',
      });
      return;
    }

    setSubmittingReview(true);
    try {
      await reservationService.submitReservationReview(
        reservation._id,
        rating,
        reviewComment.trim(),
        reviewTitle.trim() || undefined,
      );
      toast.success('Review Submitted!', {
        description: 'Thank you for your feedback.',
      });
      setReviewModalOpen(false);
      void fetchDetails();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Could not submit review.';
      toast.error('Submission Failed', { description: msg });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToCalendar = () => {
    if (!reservation) return;
    const [h, m] = reservation.time.split(':');
    const start = new Date(
      `${reservation.date}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`,
    );
    const end = new Date(start.getTime() + 90 * 60 * 1000);

    const restaurant =
      typeof reservation.restaurantId === 'object' && reservation.restaurantId
        ? reservation.restaurantId
        : null;

    const formatGoogleDate = (d: Date) =>
      d.toISOString().replace(/-|:|\.\d+/g, '');

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set(
      'text',
      `Dinner at ${restaurant?.name || 'Restaurant'}`,
    );
    url.searchParams.set(
      'dates',
      `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
    );
    url.searchParams.set('location', restaurant?.address?.street || '');
    url.searchParams.set(
      'details',
      `Reservation #${reservation.reservationNumber} for ${reservation.partySize} guests.`,
    );

    window.open(url.toString(), '_blank');
  };

  if (loading || !reservation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const restaurant =
    typeof reservation.restaurantId === 'object' && reservation.restaurantId
      ? reservation.restaurantId
      : null;

  const isUpcoming = ['pending', 'confirmed', 'seated'].includes(
    reservation.status,
  );
  const isCompleted = reservation.status === 'completed';
  const hasReviewed = Boolean(reservation.reviewId);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16 pt-6">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Back link */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-xs text-gray-500 hover:text-gray-900"
          >
            <Link to="/reservations">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to My Reservations
            </Link>
          </Button>
        </div>

        {/* Hero Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="relative h-44 sm:h-52 w-full bg-gray-100">
            <img
              src={
                restaurant?.images?.coverPhoto ||
                restaurant?.images?.logo ||
                restaurantFallbackSVG
              }
              alt={restaurant?.name || 'Restaurant'}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black">
                    {restaurant?.name || 'Restaurant'}
                  </h1>
                  <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {restaurant?.address?.street
                        ? `${restaurant.address.street}, ${restaurant.address.area}`
                        : 'Sylhet, Bangladesh'}
                    </span>
                  </p>
                </div>
                <Badge
                  className={cn(
                    'capitalize text-xs font-semibold px-3 py-1',
                    reservation.status === 'confirmed' && 'bg-emerald-500 text-white',
                    reservation.status === 'seated' && 'bg-blue-500 text-white',
                    reservation.status === 'completed' && 'bg-gray-600 text-white',
                    reservation.status === 'pending' && 'bg-amber-500 text-white',
                    (reservation.status === 'cancelled' ||
                      reservation.status === 'rejected') &&
                      'bg-rose-500 text-white',
                  )}
                >
                  {reservation.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Details body */}
          <div className="p-6 space-y-6">
            {/* Quick summary grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl bg-gray-50 border p-4 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                  Reservation Code
                </span>
                <span className="text-sm font-black text-brand-600">
                  {reservation.reservationNumber}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                  Date
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {format(new Date(reservation.date), 'MMM d, yyyy')}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                  Time
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {reservation.time}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                  Party Size
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {reservation.partySize} Guests
                </span>
              </div>
            </div>

            {/* Guest & Contact Information */}
            <div className="rounded-xl border border-gray-100 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Guest Contact
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-gray-500 block">Contact Name</span>
                  <span className="font-semibold text-gray-900">
                    {reservation.guestInfo.name}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Phone</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {reservation.guestInfo.phone}
                  </span>
                </div>
                {reservation.guestInfo.email && (
                  <div>
                    <span className="text-xs text-gray-500 block">Email</span>
                    <span className="font-semibold text-gray-900">
                      {reservation.guestInfo.email}
                    </span>
                  </div>
                )}
                {reservation.assignedTables &&
                  reservation.assignedTables.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500 block">
                        Assigned Table
                      </span>
                      <span className="font-semibold text-brand-600">
                        Table {reservation.assignedTables.join(', ')}
                      </span>
                    </div>
                  )}
              </div>

              {reservation.specialRequests && (
                <div className="pt-2 border-t text-xs">
                  <span className="text-gray-500 block mb-0.5">
                    Special Requests:
                  </span>
                  <p className="text-gray-800 italic">
                    {reservation.specialRequests}
                  </p>
                </div>
              )}
            </div>

            {/* Deposit info if exists */}
            {reservation.deposit?.required && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-blue-900">
                    Booking Deposit
                  </span>
                  <Badge variant="outline" className="capitalize">
                    Status: {reservation.deposit.status}
                  </Badge>
                </div>
                <p className="text-blue-800">
                  Amount: ৳{reservation.deposit.amount}
                  {reservation.deposit.transactionId && (
                    <span className="block mt-0.5 text-blue-600 font-mono">
                      Tx ID: {reservation.deposit.transactionId}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Status History Timeline */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <History className="h-4 w-4" />
                Status Timeline
              </h3>
              <div className="space-y-2 border-l-2 border-brand-100 pl-4">
                {reservation.statusHistory.map((sh, idx) => (
                  <div key={idx} className="relative text-xs">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" />
                    <div className="flex items-center justify-between">
                      <span className="font-bold capitalize text-gray-900">
                        {sh.status}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {format(new Date(sh.timestamp), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {sh.reason && (
                      <p className="text-gray-500 mt-0.5">{sh.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddToCalendar}
                className="rounded-xl text-xs font-semibold flex-1 h-11"
              >
                <CalendarPlus className="mr-1.5 h-4 w-4 text-brand-600" />
                Add to Google Calendar
              </Button>

              {isUpcoming && reservation.status !== 'seated' && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancel}
                  className="rounded-xl text-xs font-semibold h-11"
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Cancel Reservation
                </Button>
              )}

              {isCompleted && !hasReviewed && (
                <Button
                  type="button"
                  onClick={() => setReviewModalOpen(true)}
                  className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold flex-1 h-11"
                >
                  <Star className="mr-1.5 h-4 w-4 fill-white" />
                  Rate & Review Dining
                </Button>
              )}

              {isCompleted && hasReviewed && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold py-2">
                  <ShieldCheck className="h-4 w-4" />
                  Reviewed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewModalOpen && (
        <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Rate your Dining Experience
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Share your feedback on {restaurant?.name}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleReviewSubmit} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Overall Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition"
                    >
                      <Star
                        className={cn(
                          'h-7 w-7',
                          star <= rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300',
                        )}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-gray-600 ml-2">
                    {rating} out of 5
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Title (Optional)
                </label>
                <Input
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Wonderful atmosphere and great service"
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Your Review *
                </label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Describe your dining experience, table placement, service..."
                  rows={4}
                  className="rounded-xl text-xs resize-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviewModalOpen(false)}
                  className="flex-1 rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ReservationDetailsPage;
