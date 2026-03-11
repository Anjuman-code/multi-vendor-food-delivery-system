import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Star,
  MessageSquare,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import vendorService from "@/services/vendorService";
import { useVendor } from "@/contexts/VendorContext";
import type { VendorReview } from "@/types/vendor";
import { useToast } from "@/hooks/use-toast";

const VendorReviewsPage: React.FC = () => {
  const { selectedRestaurantId } = useVendor();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const loadReviews = useCallback(
    async (p: number = 1) => {
      if (!selectedRestaurantId) return;
      setLoading(true);
      const res = await vendorService.getReviews(selectedRestaurantId, p, 10);
      if (res.success && res.data) {
        setReviews(res.data.reviews);
        setTotalPages(res.data.pagination?.pages || 1);
        setPage(p);
      }
      setLoading(false);
    },
    [selectedRestaurantId],
  );

  useEffect(() => {
    loadReviews(1);
  }, [loadReviews]);

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSending(true);
    const res = await vendorService.replyToReview(reviewId, replyText.trim());
    if (res.success) {
      setReviews((prev) =>
        prev.map((r) =>
          r._id === reviewId
            ? ({
                ...r,
                reply: {
                  text: replyText.trim(),
                  repliedAt: new Date().toISOString(),
                },
              } as VendorReview)
            : r,
        ),
      );
      setReplyingTo(null);
      setReplyText("");
      toast({ title: "Success", description: "Reply posted" });
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setSending(false);
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">
          Read and respond to customer feedback
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No reviews yet
          </h3>
          <p className="text-gray-500">
            Reviews from customers will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, idx) => (
            <motion.div
              key={review._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold text-sm shrink-0">
                  {typeof review.customerId === "object"
                    ? review.customerId.firstName?.charAt(0)
                    : "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {typeof review.customerId === "object"
                          ? `${review.customerId.firstName} ${review.customerId.lastName}`
                          : "Customer"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {/* Rating stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= review.rating
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-700 mt-2">{review.comment}</p>

                  {/* Existing reply */}
                  {review.reply && (
                    <div className="mt-4 pl-4 border-l-2 border-orange-200 bg-orange-50/50 rounded-r-lg p-3">
                      <p className="text-xs font-medium text-orange-600 mb-1">
                        Your Reply
                      </p>
                      <p className="text-sm text-gray-700">
                        {review.reply.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(review.reply.repliedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Reply form */}
                  {!review.reply && replyingTo === review._id ? (
                    <div className="mt-4 space-y-3">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your reply..."
                        rows={3}
                        maxLength={500}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {replyText.length}/500
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText("");
                            }}
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
                            Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    !review.reply && (
                      <button
                        onClick={() => setReplyingTo(review._id)}
                        className="mt-3 text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Reply
                      </button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Pagination */}
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
