import { Button } from "@/components/ui/button";
import { AnimatePresence, motion, useInView } from "framer-motion";
import {
    ChevronLeft,
    ChevronRight,
    Quote,
    Star,
    Store,
    ThumbsUp,
    Users,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import apiService from "@/services/apiService";
import reviewService from "@/services/reviewService";

interface ApiRestaurant {
  _id: string;
  name: string;
  address?: {
    city?: string;
    state?: string;
  };
}

interface ApiReviewCustomer {
  _id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

interface ApiReview {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  customerId: string | ApiReviewCustomer;
}

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
  avatar: string;
  location: string;
  createdAt: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
  delay: number;
}

const AnimatedCounter: React.FC<{ value: number; suffix: string }> = ({
  value,
  suffix,
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  suffix,
  label,
  delay,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="group relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
      <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl text-orange-500">
            {icon}
          </div>
        </div>
        <div className="text-center">
          <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
            <AnimatedCounter value={value} suffix={suffix} />
          </div>
          <div className="text-gray-600 font-medium">{label}</div>
        </div>
      </div>
    </motion.div>
  );
};

const ReviewCard: React.FC<{ review: Review; index: number }> = ({
  review,
  index,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group h-full"
    >
      <div className="relative h-full bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden">
        {/* Decorative gradient blob */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-orange-200 to-red-200 rounded-full opacity-50 blur-2xl group-hover:opacity-70 transition-opacity duration-500" />

        {/* Quote icon */}
        <div className="relative mb-4">
          <div className="inline-flex p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg">
            <Quote className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Rating */}
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 transition-colors duration-300 ${
                i < review.rating
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Comment */}
        <p className="relative text-gray-700 leading-relaxed mb-6 line-clamp-4">
          "{review.comment}"
        </p>

        {/* Author info */}
        <div className="relative flex items-center gap-4 pt-4 border-t border-gray-100">
          <div className="relative">
            <img
              src={review.avatar}
              alt={review.name}
              className="w-14 h-14 rounded-full object-cover ring-4 ring-orange-100"
            />
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-800">{review.name}</h4>
            <p className="text-sm text-gray-500">{review.location}</p>
            <p className="text-xs text-orange-500 font-medium mt-1">
              Verified customer review
            </p>
          </div>
        </div>

        {/* Date badge */}
        <div className="absolute top-6 right-6">
          <span className="text-xs text-gray-400 font-medium">
            {review.date}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const ReviewsAndRatings: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const reviewsPerPage = 3;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [restaurantCount, setRestaurantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(reviews.length / reviewsPerPage));

  const formatDate = (dateValue: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateValue));

  useEffect(() => {
    let isActive = true;

    const loadReviews = async () => {
      setLoading(true);
      setError(null);

      try {
        const featuredResponse = await apiService.getFeaturedRestaurants();
        const featuredPayload = featuredResponse.data as {
          data?: ApiRestaurant[];
        };
        let restaurants = Array.isArray(featuredPayload.data)
          ? featuredPayload.data
          : [];

        if (restaurants.length === 0) {
          const allResponse = await apiService.getAllRestaurants();
          const allPayload = allResponse.data as { data?: ApiRestaurant[] };
          restaurants = Array.isArray(allPayload.data) ? allPayload.data : [];
        }

        const selectedRestaurants = restaurants.slice(0, 3);
        const reviewGroups = await Promise.all(
          selectedRestaurants.map(async (restaurant) => {
            const response = await reviewService.getRestaurantReviews(
              restaurant._id,
              1,
              3,
            );

            if (!response.success || !response.data?.reviews) {
              return [] as Review[];
            }

            return response.data.reviews.map((review: ApiReview) => {
              const customer =
                typeof review.customerId === "string"
                  ? null
                  : review.customerId;
              const customerName = customer
                ? `${customer.firstName} ${customer.lastName}`.trim()
                : "Verified customer";
              const location =
                [restaurant.address?.city, restaurant.address?.state]
                  .filter(Boolean)
                  .join(", ") || restaurant.name;
              const avatarName = encodeURIComponent(customerName);

              return {
                id: review._id,
                name: customerName,
                rating: review.rating,
                comment: review.comment,
                date: formatDate(review.createdAt),
                avatar:
                  customer?.profileImage ||
                  `https://ui-avatars.com/api/?name=${avatarName}&background=f97316&color=ffffff`,
                location,
                createdAt: review.createdAt,
              };
            });
          }),
        );

        const combinedReviews = reviewGroups
          .flat()
          .sort(
            (left, right) =>
              new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime(),
          )
          .slice(0, 6);

        if (isActive) {
          setReviews(combinedReviews);
          setRestaurantCount(selectedRestaurants.length);
          setCurrentPage(0);
        }
      } catch {
        if (isActive) {
          setError("Failed to load customer reviews.");
          setReviews([]);
          setRestaurantCount(0);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadReviews();

    return () => {
      isActive = false;
    };
  }, []);

  const getCurrentReviews = () => {
    const start = currentPage * reviewsPerPage;
    return reviews.slice(start, start + reviewsPerPage);
  };

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  useEffect(() => {
    if (reviews.length <= reviewsPerPage) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [reviews.length, totalPages]);

  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 bg-orange-50 text-orange-500 rounded-full text-xs font-semibold tracking-widest uppercase mb-3">
            Customer Reviews
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Loved by Thousands
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            See what our happy customers have to say about their food delivery
            experience
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[420px] mb-12">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-full rounded-3xl border border-gray-100 bg-white p-6 shadow-lg animate-pulse"
              >
                <div className="h-10 w-10 rounded-2xl bg-gray-200 mb-4" />
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((__, starIndex) => (
                    <div
                      key={starIndex}
                      className="h-5 w-5 rounded-full bg-gray-200"
                    />
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="h-4 rounded bg-gray-200" />
                  <div className="h-4 rounded bg-gray-200" />
                  <div className="h-4 w-4/5 rounded bg-gray-200" />
                </div>
                <div className="mt-6 flex items-center gap-4 pt-4 border-t border-gray-100">
                  <div className="h-14 w-14 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 rounded bg-gray-200" />
                    <div className="h-3 w-2/3 rounded bg-gray-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mb-12 rounded-3xl border border-dashed border-red-200 bg-white px-6 py-10 text-center text-red-600">
            {error}
          </div>
        ) : reviews.length > 0 ? (
          <div className="relative mb-12 min-h-[420px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentPage}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[420px]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
              >
                {getCurrentReviews().map((review, index) => (
                  <ReviewCard review={review} index={index} key={review.id} />
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-center gap-4 mt-10">
              <Button
                variant="outline"
                size="icon"
                onClick={prevPage}
                className="rounded-full w-12 h-12 border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all duration-300"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              {/* Page indicators */}
              <div className="flex gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`transition-all duration-300 rounded-full ${
                      i === currentPage
                        ? "w-8 h-3 bg-gradient-to-r from-orange-500 to-red-500"
                        : "w-3 h-3 bg-gray-300 hover:bg-gray-400"
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={nextPage}
                className="rounded-full w-12 h-12 border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all duration-300"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-12 rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-gray-500">
            Customer reviews will appear here once restaurants start collecting
            feedback.
          </div>
        )}

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <StatCard
            icon={<ThumbsUp className="w-7 h-7" />}
            value={Number(averageRating.toFixed(1))}
            suffix="/5"
            label="Average Rating"
            delay={0}
          />
          <StatCard
            icon={<Users className="w-7 h-7" />}
            value={reviews.length}
            suffix=""
            label="Verified Reviews"
            delay={0.1}
          />
          <StatCard
            icon={<Store className="w-7 h-7" />}
            value={restaurantCount}
            suffix=""
            label="Partner Restaurants"
            delay={0.2}
          />
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
          <p className="text-gray-600 mb-6">
            Ready to join our community of food lovers?
          </p>
          <Link to="/restaurants">
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-6 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              Start Ordering Now
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ReviewsAndRatings;
