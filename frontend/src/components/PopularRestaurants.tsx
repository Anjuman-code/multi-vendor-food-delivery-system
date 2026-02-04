import React from "react";
import { motion } from "framer-motion";
import {
  Star,
  Clock,
  MapPin,
  ChefHat,
  ArrowRight,
  Utensils,
} from "lucide-react";

// Mock data (Same as before, just slight structure tweaks if needed)
const mockPopularRestaurants = [
  {
    id: 1,
    name: "Ocean's Catch",
    cuisine: "Seafood",
    rating: 4.9,
    deliveryTime: "25-35 min",
    distance: "1.5 km",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    description:
      "Fresh seafood caught daily. Experience the finest ingredients and traditional coastal techniques.",
    specialties: ["Grilled Salmon", "Lobster Thermidor", "Fish & Chips"],
    tags: ["Fresh", "Sustainable"],
  },
  {
    id: 2,
    name: "The Gourmet Corner",
    cuisine: "Fine Dining",
    rating: 4.8,
    deliveryTime: "30-40 min",
    distance: "2.1 km",
    image:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    description:
      "Award-winning chef with Michelin-starred experience. Each dish is a crafted work of art.",
    specialties: ["Beef Wellington", "Truffle Risotto", "Soufflé"],
    tags: ["Michelin", "Romantic"],
  },
  {
    id: 3,
    name: "Spice Route",
    cuisine: "Indian",
    rating: 4.7,
    deliveryTime: "20-30 min",
    distance: "0.9 km",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
    description:
      "Authentic flavors prepared with traditional spices. Family recipes passed down for generations.",
    specialties: ["Butter Chicken", "Lamb Rogan Josh", "Garlic Naan"],
    tags: ["Spicy", "Family Style"],
  },
];

const PopularRestaurants: React.FC = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
              Popular Restaurants
            </h2>
            <p className="text-gray-500 text-lg">
              Curated dining experiences near you
            </p>
          </div>
          <button className="hidden md:flex items-center gap-2 text-orange-600 font-semibold hover:text-orange-700 transition-colors">
            View all restaurants <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockPopularRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} data={restaurant} />
          ))}
        </div>

        {/* Mobile View All Button */}
        <button className="w-full md:hidden mt-8 flex items-center justify-center gap-2 bg-white border border-gray-200 py-4 rounded-xl text-gray-900 font-semibold shadow-sm">
          View all restaurants <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

// Extracted Card Component for cleanliness
const RestaurantCard = ({
  data,
}: {
  data: (typeof mockPopularRestaurants)[0];
}) => {
  return (
    <motion.div
      className="group relative h-[500px] w-full rounded-[2rem] overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-shadow duration-500"
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      {/* Background Image with Zoom Effect */}
      <motion.div
        className="absolute inset-0"
        variants={{
          rest: { scale: 1 },
          hover: { scale: 1.1 },
        }}
        transition={{ duration: 0.6 }}
      >
        <img
          src={data.image}
          alt={data.name}
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Gradient Overlay - animates darker on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"
        variants={{
          rest: { opacity: 0.7 },
          hover: { opacity: 1 },
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Floating Badge (Top Right) */}
      <div className="absolute top-6 right-6 bg-white/20 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10">
        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
        <span className="text-white font-bold text-sm">{data.rating}</span>
      </div>

      {/* Content Container */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
        {/* Always Visible Content */}
        <div className="mb-2">
          {/* Tags Row */}
          <div className="flex gap-2 mb-3">
            <span className="text-xs font-medium text-orange-300 bg-orange-500/20 px-2 py-1 rounded backdrop-blur-sm border border-orange-500/20">
              {data.cuisine}
            </span>
            {data.tags.slice(0, 1).map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium text-gray-300 bg-white/10 px-2 py-1 rounded backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
          <h3 className="text-3xl font-bold text-white mb-2 leading-tight">
            {data.name}
          </h3>

          {/* Meta Info Row */}
          <div className="flex items-center gap-4 text-gray-300 text-sm font-medium">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {data.deliveryTime}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {data.distance}
            </div>
          </div>
        </div>

        {/* Hidden Content (Reveals on Hover) */}
        <motion.div
          variants={{
            rest: { height: 0, opacity: 0, marginTop: 0 },
            hover: { height: "auto", opacity: 1, marginTop: 16 },
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="pt-4 border-t border-white/20">
            <p className="text-gray-300 text-sm mb-4 line-clamp-2">
              {data.description}
            </p>

            <div className="mb-6">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2 block flex items-center gap-2">
                <ChefHat className="w-3 h-3" /> Chef Favorites
              </span>
              <div className="flex flex-wrap gap-2">
                {data.specialties.map((item, i) => (
                  <span
                    key={i}
                    className="text-xs text-white bg-white/10 px-2 py-1 rounded-md"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <button className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 group/btn">
              View Menu{" "}
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PopularRestaurants;
