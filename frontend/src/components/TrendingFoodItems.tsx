import FoodItemCard from "@/components/ui/FoodItemCard";
import homeService from "@/services/homeService";
import type { TrendingItem } from "@/types/home";
import { AnimatePresence, motion } from "framer-motion";
import {
    ChevronLeft,
    ChevronRight,
    Flame
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const colorPalette = [
  "from-brand-900 to-amber-900",
  "from-red-900 to-rose-900",
  "from-slate-900 to-gray-900",
  "from-amber-950 to-brown-900",
  "from-emerald-900 to-teal-900",
];
const TrendingFoodItems: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTrendingItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const response = await homeService.getTrendingItems(6);
    if (response.success && response.data) {
      setItems(response.data.items || []);
    } else {
      setItems([]);
      setErrorMessage(response.message || "Failed to load trending items.");
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTrendingItems();
  }, [loadTrendingItems]);

  const itemsWithColor = useMemo(
    () =>
      items.map((item, index) => ({
        ...item,
        color: colorPalette[index % colorPalette.length],
        rating: item.rating ?? 0,
      })),
    [items],
  );

  useEffect(() => {
    if (activeIndex >= itemsWithColor.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, itemsWithColor.length]);

  // Logic to handle carousel bounds
  const handleNext = useCallback(() => {
    if (itemsWithColor.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % itemsWithColor.length);
  }, [itemsWithColor.length]);

  const handlePrev = useCallback(() => {
    if (itemsWithColor.length === 0) return;
    setActiveIndex(
      (prev) => (prev - 1 + itemsWithColor.length) % itemsWithColor.length,
    );
  }, [itemsWithColor.length]);

  // Variants for the 3D Card positioning
  const cardVariants = {
    center: {
      x: "0%",
      scale: 1,
      zIndex: 50,
      opacity: 1,
      rotateY: 0,
      filter: "blur(0px) brightness(1)",
    },
    left: {
      x: "-65%",
      scale: 0.85,
      zIndex: 10,
      opacity: 0.6,
      rotateY: 15, // Subtle 3D rotation
      filter: "blur(2px) brightness(0.8)",
    },
    right: {
      x: "65%",
      scale: 0.85,
      zIndex: 10,
      opacity: 0.6,
      rotateY: -15,
      filter: "blur(2px) brightness(0.8)",
    },
    hidden: {
      x: "0%",
      scale: 0.5,
      zIndex: 0,
      opacity: 0,
    },
  };

  // Determine position variant based on index
  const getVariant = (index: number) => {
    if (index === activeIndex) return "center";
    if (
      index === activeIndex - 1 ||
      (activeIndex === 0 && index === itemsWithColor.length - 1)
    )
      return "left";
    if (
      index === activeIndex + 1 ||
      (activeIndex === itemsWithColor.length - 1 && index === 0)
    )
      return "right";
    return "hidden";
  };

  return (
    <section className="relative py-20 flex flex-col items-center overflow-hidden">
      {/* 2. Content Container */}
      <div className="container relative z-10 mx-auto px-4 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 border border-brand-100 text-brand-600 mb-4"
          >
            <Flame className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-medium tracking-wide uppercase">
              Trending Now
            </span>
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 tracking-tight">
            Culinary{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-red-500">
              Masterpieces
            </span>
          </h2>
        </div>

        {/* 3. The 3D Carousel Stage */}
        <div className="relative w-full max-w-4xl h-[400px] flex items-center justify-center perspective-1000 mb-8">
          {isLoading ? (
            <div className="w-[300px] md:w-[380px] aspect-[4/3] rounded-3xl bg-gray-100 animate-pulse border border-gray-200" />
          ) : errorMessage ? (
            <div className="rounded-3xl border border-gray-200 bg-white px-8 py-10 text-center text-gray-500">
              <p className="mb-4">{errorMessage}</p>
              <button
                className="px-4 py-2 rounded-full bg-brand-500 text-white font-semibold hover:scale-105 transition-transform"
                onClick={loadTrendingItems}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : itemsWithColor.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-8 py-10 text-center text-gray-400">
              No culinary highlights yet. Check back soon.
            </div>
          ) : (
            <>
              <AnimatePresence initial={false}>
                {itemsWithColor.map((item, index) => (
                  <motion.div
                    key={item._id}
                    variants={cardVariants}
                    initial="hidden"
                    animate={getVariant(index)}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute w-[300px] md:w-[380px] aspect-[4/3] rounded-3xl shadow-2xl cursor-grab active:cursor-grabbing"
                    style={{
                      // Force hardware acceleration for smooth 3D transforms
                      willChange: "transform, opacity, filter",
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_e, { offset, velocity }) => {
                      if (itemsWithColor.length <= 1) return;
                      const swipe = Math.abs(offset.x) * velocity.x;
                      if (swipe < -100) handleNext();
                      if (swipe > 100) handlePrev();
                    }}
                  >
                    <FoodItemCard
                      variant="highlight"
                      item={{
                        id: item._id,
                        name: item.name,
                        price: item.price,
                        image: item.image,
                        category: item.category,
                        rating: item.rating,
                        isAvailable: true,
                      }}
                      className="w-full h-full"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {itemsWithColor.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-4 md:left-20 z-50 p-3 rounded-full bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 md:right-20 z-50 p-3 rounded-full bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Feature Icons Grid (Bottom) */}
        <div className="mt-12 grid grid-cols-3 gap-8 md:gap-16 text-center">
          {[
            { label: "Free Delivery", icon: "🚀" },
            { label: "20-30 Mins", icon: "⏱️" },
            { label: "Top Rated", icon: "🏆" },
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="text-2xl grayscale">{feature.icon}</span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                {feature.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingFoodItems;
