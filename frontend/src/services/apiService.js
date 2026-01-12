// Example API service using the centralized HTTP client
import httpClient from '../lib/httpClient';

// Example API service functions
const apiService = {
  // Get all restaurants
  getRestaurants: () => {
    return httpClient.get('/restaurants');
  },

  // Get restaurant by ID
  getRestaurantById: (id) => {
    return httpClient.get(`/restaurants/${id}`);
  },

  // Create a new restaurant
  createRestaurant: (data) => {
    return httpClient.post('/restaurants', data);
  },

  // Update a restaurant
  updateRestaurant: (id, data) => {
    return httpClient.put(`/restaurants/${id}`, data);
  },

  // Delete a restaurant
  deleteRestaurant: (id) => {
    return httpClient.delete(`/restaurants/${id}`);
  },

  // Get all categories
  getCategories: () => {
    return httpClient.get('/categories');
  },

  // Get featured restaurants
  getFeaturedRestaurants: () => {
    return httpClient.get('/restaurants/featured');
  },

  // Search restaurants
  searchRestaurants: (query) => {
    return httpClient.get(`/restaurants/search?q=${encodeURIComponent(query)}`);
  },
};

export default apiService;