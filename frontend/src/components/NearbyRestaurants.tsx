import apiService from "@/services/apiService";
import { motion } from "framer-motion";
import { ArrowRight, Clock, MapPin, Star } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
      <section className="py-16">
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
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-1">Nearby</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Restaurants Near You</h2>
          </div>
          <Link
            to="/restaurants"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {error && (
          <p className="mb-8 text-center text-sm text-red-600">{error}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.length > 0 ? (
            restaurants.map((restaurant, index) => (
              <motion.div
                key={restaurant.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.07 }}
                whileHover={{ y: -4 }}
              >
                <Link to={`/restaurants/${restaurant.id}`} className="block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="relative">
                    <img
                      src={restaurant.image}
                      alt={restaurant.name}
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center shadow-sm">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="ml-1 text-xs font-semibold text-gray-800">{restaurant.rating}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-0.5">{restaurant.name}</h3>
                    <p className="text-xs text-orange-500 font-medium mb-3">{restaurant.cuisine}</p>

                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{restaurant.deliveryTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[100px]">{restaurant.location}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-200 bg-white/60 px-6 py-12 text-center text-gray-500 text-sm">
              No nearby restaurants are available right now.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default NearbyRestaurants;
