/**
 * Authentication service – wraps all /api/auth endpoints.
 * Uses the shared httpClient (which handles tokens + refresh).
 */
import httpClient from '../lib/httpClient';

// ── Types matching backend responses ───────────────────────────

/** Standard envelope returned by every backend endpoint. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

/** Shape returned by POST /api/auth/register */
export interface RegisterResponseData {
  userId: string;
}

/** Shape returned by POST /api/auth/login */
export interface LoginResponseData {
  accessToken?: string;
  refreshToken?: string;
  user: AuthUser;
}

/** Shape returned by GET /api/auth/session */
export interface SessionResponseData {
  user: AuthUser;
}

/** Safe user object returned after login */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
}

/** Payload sent to POST /api/auth/register */
export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

/** Payload sent to POST /api/auth/register/vendor */
export interface VendorRegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  businessName: string;
  businessLicense: string;
  taxId: string;
}

/** Payload sent to POST /api/auth/login */
export interface LoginPayload {
  emailOrPhone: string;
  password: string;
}

// ── Helper ─────────────────────────────────────────────────────

/** Extract a user-friendly error message from an Axios error. */
const extractError = (error: unknown): ApiResponse => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosErr = error as { response?: { data?: ApiResponse } };
    if (axiosErr.response?.data) return axiosErr.response.data;
  }
  if (typeof error === 'object' && error !== null && 'request' in error) {
    return {
      success: false,
      message: 'Network error. Please check your connection.',
    };
  }
  return { success: false, message: 'An unexpected error occurred.' };
};

// ── Service ────────────────────────────────────────────────────

const authService = {
  /**
   * POST /api/auth/register
   * Creates a new customer account.
   * Backend does NOT return tokens – the user must verify their email first.
   */
  async register(
    payload: RegisterPayload,
  ): Promise<ApiResponse<RegisterResponseData>> {
    try {
      const response = await httpClient.post<ApiResponse<RegisterResponseData>>(
        '/api/auth/register',
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<RegisterResponseData>;
    }
  },

  /**
   * POST /api/auth/register/vendor
   * Creates a new vendor account.
   * Backend does NOT return tokens – the user must verify their email first.
   */
  async registerVendor(
    payload: VendorRegisterPayload,
  ): Promise<ApiResponse<RegisterResponseData>> {
    try {
      const response = await httpClient.post<ApiResponse<RegisterResponseData>>(
        '/api/auth/register/vendor',
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<RegisterResponseData>;
    }
  },

  /**
   * POST /api/auth/login
   * Authenticates a user and stores access + refresh tokens.
   */
  async login(payload: LoginPayload): Promise<ApiResponse<LoginResponseData>> {
    try {
      const response = await httpClient.post<ApiResponse<LoginResponseData>>(
        '/api/auth/login',
        payload,
      );

      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<LoginResponseData>;
    }
  },

  /**
   * POST /api/auth/logout
   * Invalidates the current refresh token on the server.
   */
  async logout(): Promise<ApiResponse> {
    try {
      await httpClient.post('/api/auth/logout');
    } catch {
      // Best-effort – always clear local storage even if the request fails.
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return { success: true, message: 'Logged out successfully' };
  },

  /**
   * POST /api/auth/forgot-password
   * Sends a password-reset email (backend always returns success to prevent enumeration).
   */
  async forgotPassword(email: string): Promise<ApiResponse> {
    try {
      const response = await httpClient.post<ApiResponse>(
        '/api/auth/forgot-password',
        { email },
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  /**
   * POST /api/auth/reset-password
   * Resets the password using a valid reset token.
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<ApiResponse> {
    try {
      const response = await httpClient.post<ApiResponse>(
        '/api/auth/reset-password',
        { token, newPassword },
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  /**
   * GET /api/auth/verify-email/:token
   * Verifies a user's email address via link token.
   */
  async verifyEmail(token: string): Promise<ApiResponse> {
    try {
      const response = await httpClient.get<ApiResponse>(
        `/api/auth/verify-email/${encodeURIComponent(token)}`,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  /**
   * POST /api/auth/verify-otp
   * Verifies a user's email address via 6-digit OTP.
   */
  async verifyOTP(email: string, otp: string): Promise<ApiResponse> {
    try {
      const response = await httpClient.post<ApiResponse>(
        '/api/auth/verify-otp',
        { email, otp },
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  /**
   * POST /api/auth/resend-verification
   * Resends the email verification token.
   */
  async resendVerification(email: string): Promise<ApiResponse> {
    try {
      const response = await httpClient.post<ApiResponse>(
        '/api/auth/resend-verification',
        { email },
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  /**
   * PUT /api/auth/change-password
   * Changes the password for the currently authenticated user.
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ApiResponse> {
    try {
      const response = await httpClient.put<ApiResponse>(
        '/api/auth/change-password',
        { currentPassword, newPassword },
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },

  /** GET /api/auth/session – bootstrap auth state from server session cookies. */
  async getSession(): Promise<ApiResponse<SessionResponseData>> {
    try {
      const response =
        await httpClient.get<ApiResponse<SessionResponseData>>(
          '/api/auth/session',
        );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<SessionResponseData>;
    }
  },

  /** Redirect browser to backend OAuth start endpoint. */
  startGoogleAuth(nextPath?: string): void {
    const apiBase =
      import.meta.env?.VITE_API_BASE_URL || 'http://localhost:2002';
    const params = new URLSearchParams();

    if (typeof nextPath === 'string' && nextPath.startsWith('/')) {
      params.set('next', nextPath);
    }

    const query = params.toString();
    const target = `${apiBase}/api/auth/google${query ? `?${query}` : ''}`;
    window.location.assign(target);
  },

  /** Complete Google OAuth by loading authenticated user from server session. */
  async completeGoogleAuth(): Promise<ApiResponse<SessionResponseData>> {
    return this.getSession();
  },

  // ── Helpers ────────────────────────────────────────────────────

  /** Check whether the app has a cached user snapshot. */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('user');
  },

  /** Return legacy token from local storage (for backward compatibility only). */
  getToken(): string | null {
    return localStorage.getItem('accessToken');
  },
};

export default authService;
