import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

// Extend AxiosRequestConfig to support retry flag
declare module 'axios' {
  interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || 'http://localhost:2002';

// Create an Axios instance with default configuration
const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies (refresh token)
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request interceptor: attach access token ───────────────────
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 + token refresh ───────────
httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Only attempt token refresh for 401s on NON-auth endpoints.
    // Auth endpoints (login, register, etc.) return 401 intentionally
    // and must not trigger a refresh + redirect loop.
    const url = originalRequest?.url || '';
    const authRefreshExclusion = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/register/vendor',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/session',
      '/api/auth/verify-email',
      '/api/auth/verify-otp',
      '/api/auth/resend-verification',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/google',
      '/api/auth/google/callback',
    ];
    const isAuthEndpoint = authRefreshExclusion.some((path) =>
      url.includes(path),
    );

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      try {
        const legacyRefreshToken = localStorage.getItem('refreshToken');
        // Call refresh endpoint directly (not through httpClient to avoid loop)
        const response = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          legacyRefreshToken ? { refreshToken: legacyRefreshToken } : {},
          { withCredentials: true },
        );

        if (response.data.success) {
          const { accessToken, refreshToken: newRefreshToken } =
            response.data.data;

          // Keep localStorage updates only for legacy sessions.
          if (legacyRefreshToken && accessToken && newRefreshToken) {
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          return httpClient(originalRequest);
        }
      } catch {
        // Refresh failed — clear tokens and redirect
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);

export default httpClient;
