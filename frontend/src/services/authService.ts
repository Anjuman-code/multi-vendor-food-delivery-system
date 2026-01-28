import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Define types
interface AuthResponse {
  success: boolean;
  message: string;
  data?: any;
}

interface UserData {
  email: string;
  password: string;
  [key: string]: any;
}

interface Credentials {
  email: string;
  password: string;
}

interface ResetData {
  token: string;
  newPassword: string;
}

interface VerificationData {
  token: string;
}

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:2002/api',
  withCredentials: true, // Important for cookies
});

// Extend the AxiosRequestConfig interface to include our custom property
declare module 'axios' {
  interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

// Request interceptor to add token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers!.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: any) => {
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
          originalRequest.headers!.Authorization = `Bearer ${response.data.data.token}`;
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
  async register(userData: UserData): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/register', userData);
      if (response.data.success) {
        // Store tokens
        localStorage.setItem('token', response.data.data.token);
        if (response.data.data.refreshToken) {
          // If refresh token is returned in response (not in cookie)
          // In our implementation, refresh token is stored in cookie
        }
      }
      return response.data;
    } catch (error: any) {
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
  async login(credentials: Credentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      if (response.data.success) {
        // Store token
        localStorage.setItem('token', response.data.data.token);
      }
      return response.data;
    } catch (error: any) {
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
  async logout(): Promise<AuthResponse> {
    try {
      await api.post('/auth/logout');
      // Clear stored tokens
      localStorage.removeItem('token');
      return { success: true, message: 'Logged out successfully' };
    } catch (error: any) {
      localStorage.removeItem('token');
      return { success: true, message: 'Logged out successfully' }; // Still remove token even if API fails
    }
  },

  // Forgot password
  async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
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
  async resetPassword(resetData: ResetData): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/reset-password', resetData);
      return response.data;
    } catch (error: any) {
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
  async verifyEmail(verificationData: VerificationData): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/verify-email', verificationData);
      return response.data;
    } catch (error: any) {
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
  async resendVerification(email: string): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/resend-verification', { email });
      return response.data;
    } catch (error: any) {
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
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const response = await api.get<AuthResponse>('/auth/me');
      return response.data;
    } catch (error: any) {
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
  async updateProfile(profileData: Partial<UserData>): Promise<AuthResponse> {
    try {
      const response = await api.put<AuthResponse>('/auth/profile', profileData);
      return response.data;
    } catch (error: any) {
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
  async changePassword(passwordData: { oldPassword: string; newPassword: string }): Promise<AuthResponse> {
    try {
      const response = await api.put<AuthResponse>('/auth/change-password', passwordData);
      return response.data;
    } catch (error: any) {
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
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  },

  // Get token
  getToken(): string | null {
    return localStorage.getItem('token');
  }
};

export default authService;