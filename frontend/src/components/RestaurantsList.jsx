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
        // Fallback to mock data if API call fails
        setRestaurants([
          {
            id: 1,
            name: "Panshi",
            cuisine: "Bangladeshi • Biryani",
            rating: 4.7,
            deliveryTime: "30-45 min",
            distance: "1.2 km",
            image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&h=400&fit=crop",
            description: "Authentic Kacchi Biryani and traditional Bangladeshi cuisine from Sylhet."
          },
          {
            id: 2,
            name: "Kacchi Bhai",
            cuisine: "Bangladeshi • Traditional",
            rating: 4.5,
            deliveryTime: "25-40 min",
            distance: "2.5 km",
            image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=400&fit=crop",
            description: "Specializing in authentic Dhaka-style Kacchi Biryani."
          },
          {
            id: 3,
            name: "Woondaal",
            cuisine: "Bangladeshi • Fusion",
            rating: 4.8,
            deliveryTime: "35-50 min",
            distance: "3.0 km",
            image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&h=400&fit=crop",
            description: "Modern twist on traditional Bangladeshi cuisine."
          },
          {
            id: 4,
            name: "Sylhet Tea House",
            cuisine: "Bangladeshi • Sylheti",
            rating: 4.6,
            deliveryTime: "20-35 min",
            distance: "4.2 km",
            image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=400&fit=crop",
            description: "Authentic Sylheti cuisine and traditional tea house atmosphere."
          },
          {
            id: 5,
            name: "Chillox",
            cuisine: "Fast Food • Burgers",
            rating: 4.4,
            deliveryTime: "15-25 min",
            distance: "0.8 km",
            image: "https://images.unsplash.com/photo-1565299507177-b0ac6676234d?w=800&h=400&fit=crop",
            description: "Popular Bangladeshi fast food chain known for burgers."
          },
          {
            id: 6,
            name: "Nando's Bangladesh",
            cuisine: "International • Chicken",
            rating: 4.3,
            deliveryTime: "25-35 min",
            distance: "1.5 km",
            image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=400&fit=crop",
            description: "International flame-grilled PERi-PERi chicken restaurant."
          }
        ]);
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