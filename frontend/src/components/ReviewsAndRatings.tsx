import React, { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Star,
  Quote,
  ChevronLeft,
  ChevronRight,
  Users,
  Store,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Review {
  id: number;
  name: string;
  rating: number;
  comment: string;
  date: string;
  avatar: string;
  location: string;
  orderCount: number;
}

// Mock data for reviews
const mockReviews: Review[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    rating: 5,
    comment:
      "The food arrived hot and fresh, exactly as described. The delivery driver was incredibly friendly and punctual. Will definitely order again!",
    date: "Oct 15, 2025",
    avatar: "https://randomuser.me/api/portraits/women/32.jpg",
    location: "New York, NY",
    orderCount: 47,
  },
  {
    id: 2,
    name: "Michael Chen",
    rating: 4,
    comment:
      "Great selection of restaurants and easy ordering process. My Thai curry was delicious and authentic. The app experience is seamless!",
    date: "Nov 8, 2025",
    avatar: "https://randomuser.me/api/portraits/men/44.jpg",
    location: "San Francisco, CA",
    orderCount: 23,
  },
  {
    id: 3,
    name: "Emma Rodriguez",
    rating: 5,
    comment:
      "Absolutely love this service! The variety of cuisines available is impressive. Customer service helped resolve an issue with my order quickly.",
    date: "Dec 20, 2025",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    location: "Austin, TX",
    orderCount: 89,
  },
  {
    id: 4,
    name: "David Kim",
    rating: 5,
    comment:
      "As someone who works long hours, this food delivery service has been a lifesaver. The quality is consistently excellent and very user-friendly.",
    date: "Jan 5, 2026",
    avatar: "https://randomuser.me/api/portraits/men/22.jpg",
    location: "Seattle, WA",
    orderCount: 156,
  },
  {
    id: 5,
    name: "Priya Sharma",
    rating: 5,
    comment:
      "The best food delivery app I've ever used! Real-time tracking is accurate, and the food quality from partner restaurants is outstanding.",
    date: "Jan 18, 2026",
    avatar: "https://randomuser.me/api/portraits/women/45.jpg",
    location: "Chicago, IL",
    orderCount: 34,
  },
  {
    id: 6,
    name: "James Wilson",
    rating: 4,
    comment:
      "Impressive restaurant selection and the rewards program is fantastic. Already saved so much on my regular orders. Highly recommend!",
    date: "Jan 25, 2026",
    avatar: "https://randomuser.me/api/portraits/men/67.jpg",
    location: "Miami, FL",
    orderCount: 62,
  },
];

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
              {review.orderCount} orders completed
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
  const totalPages = Math.ceil(mockReviews.length / reviewsPerPage);

  const getCurrentReviews = () => {
    const start = currentPage * reviewsPerPage;
    return mockReviews.slice(start, start + reviewsPerPage);
  };

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  // Auto-rotate reviews
  useEffect(() => {
    const interval = setInterval(() => {
      nextPage();
    }, 6000);
    return () => clearInterval(interval);
  }, [currentPage]);

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-orange-50/30 to-white" />

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-200/30 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-orange-100 text-orange-600 rounded-full text-sm font-semibold mb-4">
            Customer Reviews
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Loved by{" "}
            <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              Thousands
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            See what our happy customers have to say about their food delivery
            experience
          </p>
        </motion.div>

        {/* Reviews Grid */}
        <div className="relative mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="wait">
              {getCurrentReviews().map((review, index) => (
                <ReviewCard
                  key={`${currentPage}-${review.id}`}
                  review={review}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>

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

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <StatCard
            icon={<ThumbsUp className="w-7 h-7" />}
            value={4.8}
            suffix="/5"
            label="Average Rating"
            delay={0}
          />
          <StatCard
            icon={<Users className="w-7 h-7" />}
            value={10000}
            suffix="+"
            label="Happy Customers"
            delay={0.1}
          />
          <StatCard
            icon={<Store className="w-7 h-7" />}
            value={500}
            suffix="+"
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
          <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-6 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            Start Ordering Now
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default ReviewsAndRatings;
