import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Star,
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import homeService from "@/services/homeService";
import type { TrendingItem } from "@/types/home";

const colorPalette = [
  "from-orange-900 to-amber-900",
  "from-red-900 to-rose-900",
  "from-slate-900 to-gray-900",
  "from-amber-950 to-brown-900",
  "from-emerald-900 to-teal-900",
];
const fallbackItemImage =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=700&q=80";

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

  const activeItem = itemsWithColor[activeIndex];
  const ambientColor = activeItem?.color || "from-gray-900 to-gray-800";

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
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gray-950 py-20 transition-colors duration-700">
      {/* 1. Ambient Background Layer */}
      {/* This creates the glow effect behind the cards matching the video style */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${ambientColor} opacity-40 transition-all duration-700 ease-in-out`}
      />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />{" "}
      {/* Overlay to keep it dark */}
      {/* 2. Content Container */}
      <div className="container relative z-10 mx-auto px-4 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/90 mb-4"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium tracking-wide uppercase">
              Trending Now
            </span>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Culinary{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
              Masterpieces
            </span>
          </h2>
        </div>

        {/* 3. The 3D Carousel Stage */}
        <div className="relative w-full max-w-4xl h-[400px] flex items-center justify-center perspective-1000 mb-8">
          {isLoading ? (
            <div className="w-[300px] md:w-[380px] aspect-[4/3] rounded-3xl bg-white/10 animate-pulse border border-white/10" />
          ) : errorMessage ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-10 text-center text-white/70">
              <p className="mb-4">{errorMessage}</p>
              <button
                className="px-4 py-2 rounded-full bg-white text-black font-semibold hover:scale-105 transition-transform"
                onClick={loadTrendingItems}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : itemsWithColor.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-10 text-center text-white/70">
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
                    {/* Card Content */}
                    <div className="relative w-full h-full overflow-hidden rounded-3xl border border-white/10 bg-gray-900">
                      <img
                        src={item.image || fallbackItemImage}
                        alt={item.name}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                      {/* Glass Overlay on Card */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />

                      {/* On-Card Badges */}
                      <div className="absolute top-4 right-4 flex gap-2">
                        <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-white text-xs font-bold">
                            {item.rating?.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {itemsWithColor.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-4 md:left-20 z-50 p-4 rounded-full bg-white/5 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition-all"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 md:right-20 z-50 p-4 rounded-full bg-white/5 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* 4. Active Item Details (Text transition below cards) */}
        <div className="w-full max-w-md text-center">
          {activeItem ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-orange-400 font-medium tracking-widest text-sm uppercase mb-2">
                  {activeItem.category || "Chef's pick"}
                </p>
                <h3 className="text-3xl font-bold text-white mb-6">
                  {activeItem.name}
                </h3>

                {/* Action Bar */}
                <div className="flex items-center justify-between bg-white/10 backdrop-blur-xl border border-white/10 p-2 pr-2 pl-6 rounded-full max-w-xs mx-auto">
                  <span className="text-2xl font-bold text-white">
                    ${activeItem.price.toFixed(2)}
                  </span>
                  <button className="bg-white text-black px-6 py-3 rounded-full font-bold hover:scale-105 active:scale-95 transition-transform flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Order
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <p className="text-white/60 text-sm">Fresh picks are on the way.</p>
          )}
        </div>

        {/* Feature Icons Grid (Bottom) */}
        <div className="mt-16 grid grid-cols-3 gap-8 md:gap-16 text-center opacity-60">
          {[
            { label: "Free Delivery", icon: "🚀" },
            { label: "20-30 Mins", icon: "⏱️" },
            { label: "Top Rated", icon: "🏆" },
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="text-2xl grayscale">{feature.icon}</span>
              <span className="text-xs text-white font-medium uppercase tracking-wider">
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
