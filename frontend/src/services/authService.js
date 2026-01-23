import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:2002/api',
  withCredentials: true, // Important for cookies
});

// Request interceptor to add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If token expired and not already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const response = await axios.post('http://localhost:2002/api/auth/refresh-token', {}, {
          withCredentials: true
        });

        if (response.data.success) {
          localStorage.setItem('token', response.data.data.token);
          originalRequest.headers.Authorization = `Bearer ${response.data.data.token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Authentication service
const authService = {
  // Register a new user
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      if (response.data.success) {
        // Store tokens
        localStorage.setItem('token', response.data.data.token);
        if (response.data.data.refreshToken) {
          // If refresh token is returned in response (not in cookie)
          // In our implementation, refresh token is stored in cookie
        }
      }
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error. Please check your connection.'
        };
      } else {
        return {
          success: false,
          message: 'An unexpected error occurred.'
        };
      }
    }
  },

  // Login user
  async login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.success) {
        // Store token
        localStorage.setItem('token', response.data.data.token);
      }
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error. Please check your connection.'
        };
      } else {
        return {
          success: false,
          message: 'An unexpected error occurred.'
        };
      }
    }
  },

  // Logout user
  async logout() {
    try {
      await api.post('/auth/logout');
      // Clear stored tokens
      localStorage.removeItem('token');
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      localStorage.removeItem('token');
      return { success: true, message: 'Logged out successfully' }; // Still remove token even if API fails
    }
  },

  // Forgot password
  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error. Please check your connection.'
        };
      } else {
        return {
          success: false,
          message: 'An unexpected error occurred.'
        };
      }
    }
  },

  // Reset password
  async resetPassword(resetData) {
    try {
      const response = await api.post('/auth/reset-password', resetData);
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error. Please check your connection.'
        };
      } else {
        return {
          success: false,
          message: 'An unexpected error occurred.'
        };
      }
    }
  },

  // Verify email
  async verifyEmail(verificationData) {
    try {
      const response = await api.post('/auth/verify-email', verificationData);
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error. Please check your connection.'
        };
      } else {
        return {
          success: false,
          message: 'An unexpected error occurred.'
        };
      }
    }
  },

  // Resend verification email
  async resendVerification(email) {
    try {
      const response = await api.post('/auth/resend-verification', { email });
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error. Please check your connection.'
        };
      } else {
        return {
          success: false,
          message: 'An unexpected error occurred.'
        };
      }
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error. Please check your connection.'
        };
      } else {
        return {
          success: false,
          message: 'An unexpected error occurred.'
        };
      }
    }
  },

  // Update profile
  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error. Please check your connection.'
        };
      } else {
        return {
          success: false,
          message: 'An unexpected error occurred.'
        };
      }
    }
  },

  // Change password
  async changePassword(passwordData) {
    try {
      const response = await api.put('/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error. Please check your connection.'
        };
      } else {
        return {
          success: false,
          message: 'An unexpected error occurred.'
        };
      }
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
  },

  // Get token
  getToken() {
    return localStorage.getItem('token');
  }
};

export default authService;