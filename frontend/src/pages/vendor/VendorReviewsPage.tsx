import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Star,
  MessageSquare,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  MessageSquareText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  PageHeader,
  StatCard,
  SectionCard,
  StatusBadge,
  SegmentedTabs,
  VendorEmptyState,
} from "@/components/vendor";
import vendorService from "@/services/vendorService";
import { useVendor } from "@/contexts/VendorContext";
import type { VendorReview } from "@/types/vendor";
import { toast } from "@/lib/toast";
import { formatDate, formatRelativeTime, formatNumber } from "@/utils/format";

// ── Constants ────────────────────────────────────────────────────

type TabId = "all" | "unresponded" | "negative";

const LABELS: Record<string, { title: string; subtitle: string }> = {
  all: {
    title: "No reviews yet",
    subtitle: "Reviews from customers will appear here.",
  },
  unresponded: {
    title: "All reviews have been responded to",
    subtitle: "Great job keeping up with customer feedback!",
  },
  negative: {
    title: "No negative reviews",
    subtitle: "Your customers have been satisfied recently.",
  },
};

// ── Helpers ──────────────────────────────────────────────────────

function getCustomerName(customerId: VendorReview["customerId"]): string {
  if (typeof customerId === "object") {
    return `${customerId.firstName} ${customerId.lastName}`;
  }
  return "Customer";
}

function getCustomerInitial(customerId: VendorReview["customerId"]): string {
  if (typeof customerId === "object") {
    return customerId.firstName?.charAt(0)?.toUpperCase() || "U";
  }
  return "U";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${
            s <= rating
              ? "text-amber-400 fill-amber-400"
              : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );
}

// ── Page Component ───────────────────────────────────────────────

const VendorReviewsPage: React.FC = () => {
  const { selectedRestaurantId } = useVendor();

  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [replyError, setReplyError] = useState<string | null>(null);

  // ── Data fetching ─────────────────────────────────────────────

  const loadReviews = useCallback(
    async (p: number = 1) => {
      if (!selectedRestaurantId) return;
      setLoading(true);
      setReplyingTo(null);
      setReplyText("");
      setReplyError(null);

      const res = await vendorService.getReviews(selectedRestaurantId, p, 10);
      if (res.success && res.data) {
        setReviews(res.data.reviews);
        setTotalPages(res.data.pagination?.pages || 1);
        setTotalReviews(res.data.pagination?.total || 0);
        setPage(p);
      }
      setLoading(false);
    },
    [selectedRestaurantId],
  );

  useEffect(() => {
    loadReviews(1);
  }, [loadReviews]);

  // ── Derived data ──────────────────────────────────────────────

  const filteredReviews = useMemo(() => {
    switch (activeTab) {
      case "unresponded":
        return reviews.filter((r) => !r.reply);
      case "negative":
        return reviews.filter((r) => r.rating <= 2);
      default:
        return reviews;
    }
  }, [reviews, activeTab]);

  const categoryCounts = useMemo(() => {
    return {
      all: reviews.length,
      unresponded: reviews.filter((r) => !r.reply).length,
      negative: reviews.filter((r) => r.rating <= 2).length,
    };
  }, [reviews]);

  const ratingBreakdown = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        counts[r.rating as keyof typeof counts]++;
      }
    });
    const maxCount = Math.max(...Object.values(counts), 1);
    return { counts, maxCount };
  }, [reviews]);

  const summary = useMemo(() => {
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average = total > 0 ? sum / total : 0;
    const positive = reviews.filter((r) => r.rating >= 4).length;
    const positivePct = total > 0 ? Math.round((positive / total) * 100) : 0;
    return { average, positivePct };
  }, [reviews]);

  // ── Reply handler ─────────────────────────────────────────────

  const handleReply = async (reviewId: string) => {
    const trimmed = replyText.trim();
    if (!trimmed) return;

    setSending(true);
    setReplyError(null);

    const res = await vendorService.replyToReview(reviewId, trimmed);
    if (res.success) {
      setReviews((prev) =>
        prev.map((r) =>
          r._id === reviewId
            ? {
                ...r,
                reply: {
                  text: trimmed,
                  repliedAt: new Date().toISOString(),
                },
              }
            : r,
        ),
      );
      setReplyingTo(null);
      setReplyText("");
      toast.success("Success", { description: "Reply posted successfully" });
    } else {
      const msg = res.message || "Failed to post reply. Please try again.";
      setReplyError(msg);
      toast.error("Error", { description: msg });
    }
    setSending(false);
  };

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyText("");
    setReplyError(null);
  }, []);

  // ── Render: no restaurant selected ────────────────────────────

  if (!selectedRestaurantId) {
    return (
      <VendorEmptyState
        icon={Star}
        title="Select a restaurant"
        description="Select a restaurant from the sidebar to view its reviews."
      />
    );
  }

  // ── Render: loading ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render: main content ──────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <PageHeader
        title="Customer Reviews"
        description="Read and respond to customer feedback"
      />

      {/* ── Rating summary ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Average rating"
          value={summary.average.toFixed(1)}
          icon={Star}
          accent="brand"
          hint="out of 5"
        />
        <StatCard
          label="Total reviews"
          value={formatNumber(totalReviews)}
          icon={MessageSquare}
        />
        <StatCard
          label="Unanswered"
          value={formatNumber(categoryCounts.unresponded)}
          icon={MessageSquareText}
          accent={categoryCounts.unresponded > 0 ? "brand" : "neutral"}
          hint="awaiting reply"
        />
        <StatCard
          label="Positive"
          value={`${summary.positivePct}%`}
          icon={ThumbsUp}
          hint="4★ and above"
        />
      </div>

      {/* ── Rating distribution ─────────────────────────────────── */}
      {reviews.length > 0 && (
        <SectionCard title="Rating distribution">
          <div className="space-y-2.5">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = ratingBreakdown.counts[star];
              const pct = (count / ratingBreakdown.maxCount) * 100;
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex w-12 shrink-0 items-center gap-1 text-sm font-medium text-foreground">
                    {star}
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* ── Filter Tabs ─────────────────────────────────────────── */}
      <SegmentedTabs<TabId>
        value={activeTab}
        onChange={(id) => {
          setActiveTab(id);
          setReplyingTo(null);
          setReplyText("");
          setReplyError(null);
        }}
        options={[
          { value: "all", label: "All", count: categoryCounts.all },
          {
            value: "unresponded",
            label: "Unresponded",
            count: categoryCounts.unresponded,
          },
          {
            value: "negative",
            label: "1-2 Stars",
            count: categoryCounts.negative,
          },
        ]}
      />

      {/* ── Reviews List ────────────────────────────────────────── */}
      {filteredReviews.length === 0 ? (
        <VendorEmptyState
          icon={Star}
          title={LABELS[activeTab]?.title || "No reviews"}
          description={LABELS[activeTab]?.subtitle || ""}
        />
      ) : (
        <SectionCard flush>
          <div className="divide-y divide-border">
            {filteredReviews.map((review, idx) => {
              const customerName = getCustomerName(review.customerId);
              const initial = getCustomerInitial(review.customerId);
              const isUnresponded = !review.reply;
              const isReplying = replyingTo === review._id;

              return (
                <motion.div
                  key={review._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-5 sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar initials */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                      {initial}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Header row: name, date, rating, helpful votes */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-foreground">
                              {customerName}
                            </p>
                            {isUnresponded && (
                              <StatusBadge
                                label="Needs reply"
                                tone="warning"
                                icon={false}
                                size="sm"
                                className="shrink-0"
                              />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatRelativeTime(review.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StarRating rating={review.rating} />
                          {review.helpfulVotes > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <ThumbsUp className="h-3 w-3" />
                              {review.helpfulVotes}{" "}
                              {review.helpfulVotes === 1
                                ? "person found this helpful"
                                : "people found this helpful"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Review comment */}
                      <p className="mt-3 whitespace-pre-line text-foreground">
                        {review.comment}
                      </p>

                      {/* Existing reply - highlighted box */}
                      {review.reply && (
                        <div className="mt-4 rounded-lg border-l-2 border-primary bg-accent p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                            Your Reply
                          </p>
                          <p className="whitespace-pre-line text-sm text-foreground">
                            {review.reply.text}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(review.reply.repliedAt)}
                          </p>
                        </div>
                      )}

                      {/* Reply form (inline) */}
                      {!review.reply && isReplying ? (
                        <div className="mt-4 space-y-3">
                          <Textarea
                            value={replyText}
                            onChange={(e) => {
                              setReplyText(e.target.value);
                              if (replyError) setReplyError(null);
                            }}
                            placeholder="Write your reply to this review..."
                            rows={3}
                            maxLength={500}
                            className="resize-none"
                          />
                          {replyError && (
                            <p className="text-xs text-destructive">
                              {replyError}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {replyText.length}/500
                            </span>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelReply}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="brand"
                                size="sm"
                                disabled={!replyText.trim() || sending}
                                onClick={() => handleReply(review._id)}
                                className="gap-1"
                              >
                                {sending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="h-3.5 w-3.5" />
                                )}
                                {sending ? "Sending..." : "Reply"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : !review.reply ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyingTo(review._id);
                            setReplyText("");
                            setReplyError(null);
                          }}
                          className="mt-3 gap-1.5 bg-accent text-primary hover:bg-accent/70"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Reply
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ── Pagination ──────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 border-t border-border py-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => loadReviews(page - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => loadReviews(page + 1)}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
};

export default VendorReviewsPage;
