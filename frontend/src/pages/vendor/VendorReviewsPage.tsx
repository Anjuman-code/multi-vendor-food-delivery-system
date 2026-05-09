import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Star,
  MessageSquare,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import vendorService from "@/services/vendorService";
import { useVendor } from "@/contexts/VendorContext";
import type { VendorReview } from "@/types/vendor";
import { useToast } from "@/hooks/use-toast";

// ── Constants ────────────────────────────────────────────────────

type TabId = "all" | "unresponded" | "negative";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unresponded", label: "Unresponded" },
  { id: "negative", label: "1-2 Stars" },
];

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
            s <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

// ── Page Component ───────────────────────────────────────────────

const VendorReviewsPage: React.FC = () => {
  const { selectedRestaurantId } = useVendor();
  const { toast } = useToast();

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
      toast({ title: "Success", description: "Reply posted successfully" });
    } else {
      const msg = res.message || "Failed to post reply. Please try again.";
      setReplyError(msg);
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
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
      <div className="text-center py-16">
        <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">
          Select a restaurant from the sidebar to view its reviews.
        </p>
      </div>
    );
  }

  // ── Render: loading ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // ── Render: main content ──────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">
          Read and respond to customer feedback
        </p>
      </div>

      {/* ── Rating Breakdown Chart ──────────────────────────────── */}
      {reviews.length > 0 && (
        <div className="kpi-card">
          <h3 className="kpi-card-label mb-4">Rating Breakdown</h3>
          <div className="h-40 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={([5, 4, 3, 2, 1] as const).map((star) => ({
                  star: `${star} Star${star > 1 ? "s" : ""}`,
                  count: ratingBreakdown.counts[star],
                }))}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E5E7EB"
                />
                <XAxis
                  dataKey="star"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  formatter={(value: number) => [value, "Reviews"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    fontSize: 12,
                    padding: "8px 12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#f97316", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#ea580c" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Filter Tabs ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {TABS.map((tab) => {
            const count = categoryCounts[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setReplyingTo(null);
                  setReplyText("");
                  setReplyError(null);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {tab.id === "unresponded" && count > 0 && (
                  <span className="status-pill status-pill-warning min-w-[18px] h-4.5 px-1 text-[10px] leading-none">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
                {tab.id === "negative" && count > 0 && (
                  <span className="status-pill status-pill-danger min-w-[18px] h-4.5 px-1 text-[10px] leading-none">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Reviews List ────────────────────────────────────────── */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {LABELS[activeTab]?.title || "No reviews"}
          </h3>
          <p className="text-gray-500">{LABELS[activeTab]?.subtitle || ""}</p>
        </div>
      ) : (
        <div className="space-y-4">
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
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar initials */}
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold text-sm shrink-0">
                    {initial}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header row: name, date, rating, helpful votes */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {customerName}
                          </p>
                          {isUnresponded && (
                            <span className="status-pill status-pill-warning shrink-0">
                              Needs Reply
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(review.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StarRating rating={review.rating} />
                        {review.helpfulVotes > 0 && (
                          <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {review.helpfulVotes}{" "}
                            {review.helpfulVotes === 1
                              ? "person found this helpful"
                              : "people found this helpful"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Review comment */}
                    <p className="text-gray-700 mt-3 whitespace-pre-line">
                      {review.comment}
                    </p>

                    {/* Existing reply - highlighted box */}
                    {review.reply && (
                      <div className="mt-4 pl-4 border-l-2 border-orange-400 bg-orange-50 rounded-r-lg p-3">
                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">
                          Your Reply
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {review.reply.text}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(review.reply.repliedAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
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
                          <p className="text-xs text-red-500">{replyError}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
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
                              size="sm"
                              disabled={!replyText.trim() || sending}
                              onClick={() => handleReply(review._id)}
                              className="bg-orange-500 hover:bg-orange-600 text-white gap-1"
                            >
                              {sending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              {sending ? "Sending..." : "Reply"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : !review.reply ? (
                      <button
                        onClick={() => {
                          setReplyingTo(review._id);
                          setReplyText("");
                          setReplyError(null);
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Reply
                      </button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* ── Pagination ──────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => loadReviews(page - 1)}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-500">
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
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VendorReviewsPage;
