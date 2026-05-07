/**
 * ReviewVote — tracks per-user votes on reviews to prevent duplicate
 * voting and enable accurate helpful/unhelpful counts.
 */
import mongoose, { Model, Schema, Types } from "mongoose";

export interface IReviewVote {
  reviewId: Types.ObjectId;
  userId: Types.ObjectId;
  vote: "helpful" | "unhelpful";
  createdAt: Date;
}

const reviewVoteSchema = new Schema<IReviewVote>(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: "Review",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vote: {
      type: String,
      enum: ["helpful", "unhelpful"],
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

reviewVoteSchema.index({ reviewId: 1, userId: 1 }, { unique: true });
reviewVoteSchema.index({ reviewId: 1, vote: 1 });

const ReviewVote: Model<IReviewVote> = mongoose.model<IReviewVote>(
  "ReviewVote",
  reviewVoteSchema,
);

export default ReviewVote;
