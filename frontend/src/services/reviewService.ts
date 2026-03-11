/**
 * Review service – wraps /api/reviews endpoints.
 */
import httpClient from "../lib/httpClient";
import type { ApiResponse } from "./authService";

export interface Review {
  _id: string;
  customerId:
    | string
    | {
        _id: string;
        firstName: string;
        lastName: string;
        profileImage?: string;
      };
  restaurantId:
    | string
    | { _id: string; name: string; images?: { logo?: string } };
  orderId: string;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  helpfulVotes: number;
  unhelpfulVotes: number;
  reply?: { text: string; repliedAt: string };
  createdAt: string;
  updatedAt: string;
}

interface ReviewListData {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const extractError = (error: unknown): ApiResponse => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosErr = error as { response?: { data?: ApiResponse } };
    if (axiosErr.response?.data) return axiosErr.response.data;
  }
  if (typeof error === "object" && error !== null && "request" in error) {
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
  return { success: false, message: "An unexpected error occurred." };
};

const reviewService = {
  /** POST /api/reviews */
  async createReview(payload: {
    orderId: string;
    rating: number;
    title?: string;
    comment: string;
    images?: string[];
  }): Promise<ApiResponse<{ review: Review }>> {
    try {
      const response = await httpClient.post<ApiResponse<{ review: Review }>>(
        "/api/reviews",
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ review: Review }>;
    }
  },

  /** GET /api/restaurants/:restaurantId/reviews */
  async getRestaurantReviews(
    restaurantId: string,
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<ReviewListData>> {
    try {
      const response = await httpClient.get<ApiResponse<ReviewListData>>(
        `/api/restaurants/${restaurantId}/reviews?page=${page}&limit=${limit}`,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<ReviewListData>;
    }
  },

  /** GET /api/reviews/me */
  async getMyReviews(): Promise<ApiResponse<{ reviews: Review[] }>> {
    try {
      const response =
        await httpClient.get<ApiResponse<{ reviews: Review[] }>>(
          "/api/reviews/me",
        );
      return response.data;
    } catch (error: unknown) {
      return extractError(error) as ApiResponse<{ reviews: Review[] }>;
    }
  },

  /** DELETE /api/reviews/:reviewId */
  async deleteReview(reviewId: string): Promise<ApiResponse> {
    try {
      const response = await httpClient.delete<ApiResponse>(
        `/api/reviews/${reviewId}`,
      );
      return response.data;
    } catch (error: unknown) {
      return extractError(error);
    }
  },
};

export default reviewService;
