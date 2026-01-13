import React, { useState, useEffect } from "react";
import RestaurantCard from "./RestaurantCard";
import apiService from "../services/apiService";

const RestaurantsList = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllRestaurants = async () => {
      try {
        setLoading(true);
        setError(null); // Reset error before making the request
        console.log('Fetching restaurants...');
        const response = await apiService.getAllRestaurants();
        console.log('API Response:', response);

        // Check if response has the expected structure
        if (response && response.data && response.data.data) {
          setRestaurants(response.data.data);
        } else {
          console.error('Unexpected API response structure:', response);
          throw new Error('Unexpected API response structure');
        }
      } catch (err) {
        console.error('Error fetching restaurants:', err);
        console.error('Error details:', err.response || err.message || err);
        setError('Failed to load restaurants. Please try again later.');
        setRestaurants([]); // Set empty array instead of mock data
      } finally {
        setLoading(false);
      }
    };

    fetchAllRestaurants();
  }, []);

  if (loading) {
    return (
      <div className="py-16 bg-white flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Popular Restaurants
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover the best restaurants in your area with delicious food and great service
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

export default RestaurantsList;