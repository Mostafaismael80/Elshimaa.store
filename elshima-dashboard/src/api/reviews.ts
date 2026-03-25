import { apiClient } from "./client";
import type {
  ApiResponse,
  ReviewResponse,
  ReorderReviewImagesRequest,
  ReviewImageResponse,
  PaginatedResponse,
} from "../types";

// Review visibility/deletion depends on backend-supported endpoints.
// This module only covers image management (upload, delete, reorder).

export const reviewsApi = {
  /** GET /api/reviews — paginated list (public endpoint, no admin filter) */
  getAll: async (params: {
    pageNumber?: number;
    pageSize?: number;
    productId?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<ReviewResponse>>> => {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<ReviewResponse>>>("/reviews", {
      params,
    });
    return res.data;
  },

  /** POST /api/admin/reviews/{reviewId}/images — single file upload */
  uploadImage: async (reviewId: string, file: File): Promise<ApiResponse<ReviewImageResponse>> => {
    const fd = new FormData();
    fd.append("image", file); // field name MUST be "image"
    const res = await apiClient.post<ApiResponse<ReviewImageResponse>>(
      `/admin/reviews/${reviewId}/images`,
      fd,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  },

  /** DELETE /api/admin/reviews/images/{imageId} */
  deleteImage: async (imageId: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete<ApiResponse<null>>(`/admin/reviews/images/${imageId}`);
    return res.data;
  },

  /** PUT /api/admin/reviews/{reviewId}/images/reorder */
  reorderImages: async (
    reviewId: string,
    data: ReorderReviewImagesRequest
  ): Promise<ApiResponse<null>> => {
    const res = await apiClient.put<ApiResponse<null>>(
      `/admin/reviews/${reviewId}/images/reorder`,
      data
    );
    return res.data;
  },
};
