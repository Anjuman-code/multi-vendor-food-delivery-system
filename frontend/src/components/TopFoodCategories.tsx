import homeService from "@/services/homeService";
import type { TopCategory } from "@/types/home";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";

const fallbackCategoryImage =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=80";

const TopFoodCategories: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [categories, setCategories] = useState<TopCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tabs = [
    { id: "all", label: "All" },
    { id: "healthy", label: "Healthy" },
    { id: "italian", label: "Italian" },
    { id: "asian", label: "Asian" },
    { id: "mexican", label: "Mexican" },
  ];

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const response = await homeService.getTopCategories(8);
    if (response.success && response.data) {
      setCategories(response.data.categories || []);
    } else {
      setCategories([]);
      setErrorMessage(response.message || "Failed to load categories.");
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filteredCategories = useMemo(() => {
    if (activeTab === "all") return categories;
    const normalizedTab = activeTab.toLowerCase();
    return categories.filter((category) =>
      category.tags.some((tag) => tag.toLowerCase() === normalizedTab),
    );
  }, [activeTab, categories]);

  return (
    <section className="py-16 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-1">Categories</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Top Food Categories</h2>
          </div>

          {/* Tabs for filtering */}
          <div className="flex flex-wrap gap-2 bg-gray-100 p-1 rounded-xl w-full md:w-auto">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-colors duration-300 text-sm md:text-base ${
                  activeTab === tab.id
                    ? "bg-orange-500 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => setActiveTab(tab.id)}
                aria-label={`${tab.label} tab`}
                data-index={index}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Carousel */}
        <div className="relative overflow-hidden">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`category-skeleton-${index}`}
                  className="h-80 rounded-2xl bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
              <p className="text-gray-500 mb-4">{errorMessage}</p>
              <button
                className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors"
                onClick={loadCategories}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
              No categories available right now.
            </div>
          ) : (
            <>
              <Swiper
                modules={[Navigation]}
                spaceBetween={20}
                slidesPerView={1}
                breakpoints={{
                  640: {
                    slidesPerView: 2,
                  },
                  768: {
                    slidesPerView: 3,
                  },
                  1024: {
                    slidesPerView: 4,
                  },
                }}
                navigation={{
                  nextEl: ".swiper-button-next",
                  prevEl: ".swiper-button-prev",
                }}
                loop={filteredCategories.length > 4}
                className="pb-10"
              >
                {filteredCategories.map((category, index) => (
                  <SwiperSlide key={category.name}>
                    <motion.button
                      type="button"
                      onClick={() => navigate(`/restaurants?q=${encodeURIComponent(category.name)}`)}
                      className="relative rounded-2xl overflow-hidden shadow-sm h-64 w-full block"
                      whileHover={{ y: -6 }}
                      transition={{ duration: 0.25 }}
                      data-index={index}
                    >
                      <img
                        src={category.image || fallbackCategoryImage}
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent flex flex-col justify-end p-5">
                        <h3 className="text-base font-bold text-white leading-tight">
                          {category.name}
                        </h3>
                        <span className="text-orange-300 text-xs mt-0.5">
                          {category.restaurantCount} Restaurants
                        </span>
                      </div>
                    </motion.button>
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* Custom navigation buttons */}
              <div className="swiper-button-prev absolute top-1/2 left-0 md:left-4 z-10 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-100 -translate-y-1/2">
                <ArrowLeft className="w-6 h-6 text-gray-700" />
              </div>
              <div className="swiper-button-next absolute top-1/2 right-0 md:right-4 z-10 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-100 -translate-y-1/2">
                <ArrowRight className="w-6 h-6 text-gray-700" />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default TopFoodCategories;
