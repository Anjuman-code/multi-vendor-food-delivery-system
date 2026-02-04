import React from "react";
import { motion } from "framer-motion";
import { SkeletonCard } from "@/components/ui/skeleton";

interface RestaurantCardSkeletonProps {
  count?: number;
}

const RestaurantCardSkeleton: React.FC<RestaurantCardSkeletonProps> = ({
  count = 1,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <SkeletonCard />
        </motion.div>
      ))}
    </>
  );
};

export default RestaurantCardSkeleton;
