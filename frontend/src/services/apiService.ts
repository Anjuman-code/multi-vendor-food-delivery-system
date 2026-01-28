// API service using the centralized HTTP client
import httpClient from '../lib/httpClient';
import { AxiosResponse } from 'axios';

interface Restaurant {
  _id?: string;
  id?: string;
  name: string;
  [key: string]: any; // Allow additional properties
}

interface Category {
  _id?: string;
  id?: string;
  name: string;
  [key: string]: any; // Allow additional properties
}

// API service functions
const apiService = {
  // Get all restaurants
  getAllRestaurants: (): Promise<AxiosResponse<{ data: Restaurant[] }>> => {
    return httpClient.get('/api/restaurants');
  },

  // Get restaurant by ID
  getRestaurantById: (id: string): Promise<AxiosResponse<{ data: Restaurant }>> => {
    return httpClient.get(`/api/restaurants/${id}`);
  },

  // Create a new restaurant
  createRestaurant: (data: Partial<Restaurant>): Promise<AxiosResponse<{ data: Restaurant }>> => {
    return httpClient.post('/api/restaurants', data);
  },

  // Update a restaurant
  updateRestaurant: (id: string, data: Partial<Restaurant>): Promise<AxiosResponse<{ data: Restaurant }>> => {
    return httpClient.put(`/api/restaurants/${id}`, data);
  },

  // Delete a restaurant
  deleteRestaurant: (id: string): Promise<AxiosResponse> => {
    return httpClient.delete(`/api/restaurants/${id}`);
  },

  // Get all categories
  getCategories: (): Promise<AxiosResponse<{ data: Category[] }>> => {
    return httpClient.get('/api/categories');
  },

  // Get featured restaurants
  getFeaturedRestaurants: (): Promise<AxiosResponse<{ data: Restaurant[] }>> => {
    return httpClient.get('/api/restaurants/featured');
  },

  // Search restaurants
  searchRestaurants: (query: string): Promise<AxiosResponse<{ data: Restaurant[] }>> => {
    return httpClient.get(`/api/restaurants/search?q=${encodeURIComponent(query)}`);
  },
};

export default apiService;