// API service using the centralized HTTP client
import httpClient from '../lib/httpClient';

// API service functions
const apiService = {
  // Get all restaurants
  getAllRestaurants: () => {
    return httpClient.get('/api/restaurants');
  },

  // Get restaurant by ID
  getRestaurantById: (id) => {
    return httpClient.get(`/api/restaurants/${id}`);
  },

  // Create a new restaurant
  createRestaurant: (data) => {
    return httpClient.post('/api/restaurants', data);
  },

  // Update a restaurant
  updateRestaurant: (id, data) => {
    return httpClient.put(`/api/restaurants/${id}`, data);
  },

  // Delete a restaurant
  deleteRestaurant: (id) => {
    return httpClient.delete(`/api/restaurants/${id}`);
  },

  // Get all categories
  getCategories: () => {
    return httpClient.get('/api/categories');
  },

  // Get featured restaurants
  getFeaturedRestaurants: () => {
    return httpClient.get('/api/restaurants/featured');
  },

  // Search restaurants
  searchRestaurants: (query) => {
    return httpClient.get(`/api/restaurants/search?q=${encodeURIComponent(query)}`);
  },
};

export default apiService;