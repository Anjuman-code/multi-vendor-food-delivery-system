import React, { useState, useEffect } from "react";
import RestaurantCard from "./RestaurantCard";
import apiService from "../services/apiService";

const FeaturedRestaurants = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeaturedRestaurants = async () => {
      try {
        setLoading(true);
        const response = await apiService.getFeaturedRestaurants();
        setRestaurants(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching featured restaurants:', err);
        setError('Failed to load featured restaurants. Please try again later.');
        setRestaurants([]); // Set empty array instead of mock data
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedRestaurants();
  }, []);

  if (loading) {
    return (
      <div className="py-16 bg-white flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading featured restaurants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Featured Restaurants
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our most popular restaurants offering great food and
            service
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-center">
            <p className="text-yellow-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {restaurants.map((restaurant) => (
            <RestaurantCard key={restaurant._id || restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturedRestaurants;
