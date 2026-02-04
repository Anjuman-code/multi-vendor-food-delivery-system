import React from "react";
import { motion } from "framer-motion";
import { Search, FilterX, MapPin, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateType = "no-results" | "no-filters" | "no-location" | "error";

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const defaultContent: Record<
  EmptyStateType,
  { icon: React.ReactNode; title: string; description: string }
> = {
  "no-results": {
    icon: <Search className="w-16 h-16" />,
    title: "No restaurants found",
    description:
      "Try adjusting your filters or search in a different location to find more results.",
  },
  "no-filters": {
    icon: <FilterX className="w-16 h-16" />,
    title: "No matching results",
    description:
      "Your selected filters don't match any restaurants. Try removing some filters.",
  },
  "no-location": {
    icon: <MapPin className="w-16 h-16" />,
    title: "Location not found",
    description:
      "We couldn't find restaurants in this area. Try searching for a different location.",
  },
  error: {
    icon: <Utensils className="w-16 h-16" />,
    title: "Something went wrong",
    description:
      "We're having trouble loading restaurants right now. Please try again.",
  },
};

const EmptyState: React.FC<EmptyStateProps> = ({
  type = "no-results",
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const content = defaultContent[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 px-4"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
        className="text-gray-300 mb-6 flex justify-center"
      >
        {content.icon}
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-semibold text-gray-900 mb-2"
      >
        {title || content.title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-gray-500 mb-6 max-w-md mx-auto"
      >
        {description || content.description}
      </motion.p>

      {onAction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={onAction}
            variant="outline"
            className="border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            {actionLabel || "Clear filters"}
          </Button>
        </motion.div>
      )}

      {/* Decorative illustration */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex justify-center gap-2 text-gray-200"
      >
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="w-2 h-2 rounded-full bg-current"
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

export default EmptyState;
