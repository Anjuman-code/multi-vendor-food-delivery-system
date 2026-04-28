import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import apiService from "@/services/apiService";

type ApiRestaurant = {
  _id: string;
  name: string;
  cuisineType?: string[];
  rating?: {
    average?: number;
  };
  deliveryTime?: string;
  address?: {
    city?: string;
    state?: string;
  };
  images?: {
    coverPhoto?: string;
  };
};

type NearbyRestaurant = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  location: string;
  image: string;
};

const NearbyRestaurants: React.FC = () => {
  const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadRestaurants = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiService.getFeaturedRestaurants();
        const payload = response.data as { data?: ApiRestaurant[] };
        const featuredRestaurants = Array.isArray(payload.data)
          ? payload.data
          : [];

        const mappedRestaurants = featuredRestaurants
          .slice(0, 6)
          .map((restaurant) => ({
            id: restaurant._id,
            name: restaurant.name,
            cuisine: restaurant.cuisineType?.[0] || "Local favorite",
            rating: restaurant.rating?.average ?? 0,
            deliveryTime: restaurant.deliveryTime || "30-45 min",
            location:
              [restaurant.address?.city, restaurant.address?.state]
                .filter(Boolean)
                .join(", ") || "Nearby area",
            image:
              restaurant.images?.coverPhoto ||
              "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=500&q=80",
          }));

        if (isActive) {
          setRestaurants(mappedRestaurants);
        }
      } catch {
        if (isActive) {
          setError("Failed to load nearby restaurants.");
          setRestaurants([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadRestaurants();

    return () => {
      isActive = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Nearby Restaurants
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse"
              >
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Restaurants Near You
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover delicious options just around the corner, delivered fresh
            to your door
          </p>
        </div>

        {error && (
          <p className="mb-8 text-center text-sm text-red-600">{error}</p>
        )}

        {/* Masonry layout for restaurant cards */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-8">
          {restaurants.length > 0 ? (
            restaurants.map((restaurant, index) => (
              <motion.div
                key={restaurant.id}
                className="break-inside-avoid mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl">
                  <div className="relative">
                    <img
                      src={restaurant.image}
                      alt={restaurant.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-white rounded-full px-3 py-1 flex items-center shadow-md">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="ml-1 text-sm font-semibold">
                        {restaurant.rating}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {restaurant.name}
                    </h3>
                    <p className="text-gray-600 mb-4">{restaurant.cuisine}</p>

                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{restaurant.deliveryTime}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{restaurant.location}</span>
                      </div>
                    </div>

                    <Link
                      to={`/restaurants/${restaurant.id}`}
                      className="mt-4 block w-full rounded-lg bg-orange-100 py-3 text-center font-medium text-orange-700 transition-colors duration-300 hover:bg-orange-200"
                    >
                      View Menu
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-gray-500">
              No nearby restaurants are available right now.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default NearbyRestaurants;
