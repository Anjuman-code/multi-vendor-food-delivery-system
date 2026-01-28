import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Create an Axios instance with default configuration
const httpClient: AxiosInstance = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:2002',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to handle request configurations
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // You can add authentication tokens or other headers here
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers!.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle responses globally
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: any) => {
    // Handle global error responses here
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default httpClient;