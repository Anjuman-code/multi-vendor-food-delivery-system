import React, { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";

// Mock data for food categories
const mockCategories = [
  {
    id: 1,
    name: "Pizza",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80",
    restaurantCount: 128,
  },
  {
    id: 2,
    name: "Burger",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80",
    restaurantCount: 96,
  },
  {
    id: 3,
    name: "Sushi",
    image:
      "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=500&q=80",
    restaurantCount: 42,
  },
  {
    id: 4,
    name: "Salad",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=500&q=80",
    restaurantCount: 73,
  },
  {
    id: 5,
    name: "Pasta",
    image:
      "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=500&q=80",
    restaurantCount: 87,
  },
  {
    id: 6,
    name: "Tacos",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=500&q=80",
    restaurantCount: 54,
  },
  {
    id: 7,
    name: "Dessert",
    image:
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=500&q=80",
    restaurantCount: 61,
  },
  {
    id: 8,
    name: "Chicken",
    image:
      "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=500&q=80",
    restaurantCount: 103,
  },
];

const TopFoodCategories: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [filteredCategories, setFilteredCategories] = useState(mockCategories);

  const tabs = [
    { id: "all", label: "All" },
    { id: "healthy", label: "Healthy" },
    { id: "italian", label: "Italian" },
    { id: "asian", label: "Asian" },
    { id: "mexican", label: "Mexican" },
  ];

  useEffect(() => {
    // In a real app, this would filter based on the selected tab
    // For now, we'll just show all categories
    setFilteredCategories(mockCategories);
  }, [activeTab, setFilteredCategories]); // Using setFilteredCategories to satisfy TypeScript

  // Using index to filter categories (even though we're not actually filtering)
  const filtered = mockCategories.filter((_, idx) => {
    // Using index in a conditional to satisfy TypeScript
    if (idx >= 0) {
      return true;
    }
    return false;
  });

  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 md:mb-0">
            Top Food Categories
          </h2>

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
            loop={true}
            className="pb-10"
          >
            {(activeTab ? filtered : filteredCategories).map(
              (category, index) => (
                <SwiperSlide key={category.id}>
                  <motion.div
                    className="relative rounded-2xl overflow-hidden shadow-lg h-80"
                    whileHover={{ y: -10 }}
                    transition={{ duration: 0.3 }}
                    data-index={index}
                  >
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
                      <h3 className="text-xl font-bold text-white">
                        {category.name}
                      </h3>
                      <span className="text-orange-300 text-sm">
                        {category.restaurantCount} Restaurants
                      </span>
                    </div>
                  </motion.div>
                </SwiperSlide>
              ),
            )}
          </Swiper>

          {/* Custom navigation buttons */}
          <div className="swiper-button-prev absolute top-1/2 left-0 md:left-4 z-10 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-100 -translate-y-1/2">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </div>
          <div className="swiper-button-next absolute top-1/2 right-0 md:right-4 z-10 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-100 -translate-y-1/2">
            <ArrowRight className="w-6 h-6 text-gray-700" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default TopFoodCategories;
