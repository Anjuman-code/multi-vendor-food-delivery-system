import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, MapPin, Clock, Star, Edit, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import vendorService from "@/services/vendorService";
import { useVendor } from "@/contexts/VendorContext";
import type { VendorRestaurant } from "@/types/vendor";
import { useToast } from "@/hooks/use-toast";

const VendorRestaurantsPage: React.FC = () => {
  const [restaurants, setRestaurants] = useState<VendorRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { refreshRestaurants } = useVendor();
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const res = await vendorService.getRestaurants();
      if (res.success && res.data) {
        setRestaurants(res.data.restaurants);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this restaurant?"))
      return;
    const res = await vendorService.deleteRestaurant(id);
    if (res.success) {
      setRestaurants((prev) => prev.filter((r) => r._id !== id));
      refreshRestaurants();
      toast({ title: "Success", description: "Restaurant deleted" });
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 animate-pulse"
          >
            <div className="h-40 bg-gray-200 rounded-t-xl" />
            <div className="p-5 space-y-3">
              <div className="h-5 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Restaurants</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your restaurant listings
          </p>
        </div>
        <Link to="/vendor/restaurants/new">
          <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg gap-2">
            <Plus className="w-4 h-4" />
            Add Restaurant
          </Button>
        </Link>
      </div>

      {restaurants.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-white rounded-xl border border-gray-200"
        >
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No restaurants yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create your first restaurant to start receiving orders.
          </p>
          <Link to="/vendor/restaurants/new">
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white gap-2">
              <Plus className="w-4 h-4" />
              Create Restaurant
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant, idx) => (
            <motion.div
              key={restaurant._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
            >
              {/* Cover Image */}
              <div className="relative h-40 bg-gradient-to-r from-orange-100 to-red-100">
                {restaurant.coverImage && (
                  <img
                    src={restaurant.coverImage}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() =>
                      navigate(`/vendor/restaurants/${restaurant._id}/edit`)
                    }
                    className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(restaurant._id)}
                    className="p-2 bg-white rounded-lg shadow hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                {/* Status badge */}
                <span
                  className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium ${
                    restaurant.isOpen
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {restaurant.isOpen ? "Open" : "Closed"}
                </span>
              </div>

              {/* Details */}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {restaurant.name}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {restaurant.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {(restaurant.averageRating ?? 0) > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span>{restaurant.averageRating!.toFixed(1)}</span>
                    </div>
                  )}
                  {restaurant.estimatedDeliveryTime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{restaurant.estimatedDeliveryTime} min</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate max-w-[120px]">
                      {restaurant.address?.city || "—"}
                    </span>
                  </div>
                </div>
                {restaurant.cuisineType.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {restaurant.cuisineType.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded-full"
                      >
                        {c}
                      </span>
                    ))}
                    {restaurant.cuisineType.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded-full">
                        +{restaurant.cuisineType.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorRestaurantsPage;
