/**
 * Review routes – create (auth), read (public), delete (auth).
 */
import { Router } from "express";
import {
  createReview,
  getMyReviews,
  deleteReview,
  voteReview,
  getReviewStats,
  getLatestReviews,
} from "../controllers/review.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../config/constants";

const router: Router = Router();

// Public
router.get("/stats", getReviewStats);
router.get("/latest", getLatestReviews);

// Authenticated – customer only
router.post("/", authenticate, authorize(UserRole.CUSTOMER), createReview);
router.get("/me", authenticate, authorize(UserRole.CUSTOMER), getMyReviews);
router.delete(
  "/:reviewId",
  authenticate,
  authorize(UserRole.CUSTOMER),
  deleteReview,
);

// Voting — any authenticated user
router.post("/:reviewId/vote", authenticate, voteReview);

export default router;
