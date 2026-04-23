import { apiClient } from "./client";
import type {
  ApiResponse,
  ReviewResponse,
  CreateReviewRequest,
  UpdateReviewRequest,
  ReorderReviewImagesRequest,
  ReviewImageResponse,
  PaginatedResponse,
} from "../types";

// ─── Admin Reviews CRUD ────────────────────────────────────────────────────────

export const reviewsApi = {
  /** GET /api/admin/reviews — paginated list with full product + author context */
  getAll: async (params: {
    pageNumber?: number;
    pageSize?: number;
    productId?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<ReviewResponse>>> => {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<ReviewResponse>>>("/admin/reviews", {
      params,
    });
    return res.data;
  },

  /** GET /api/admin/reviews/{id} */
  getById: async (id: string): Promise<ApiResponse<ReviewResponse>> => {
    const res = await apiClient.get<ApiResponse<ReviewResponse>>(`/admin/reviews/${id}`);
    return res.data;
  },

  /** POST /api/admin/reviews */
  create: async (data: CreateReviewRequest): Promise<ApiResponse<ReviewResponse>> => {
    const res = await apiClient.post<ApiResponse<ReviewResponse>>("/admin/reviews", data);
    return res.data;
  },

  /** PUT /api/admin/reviews/{id} */
  update: async (id: string, data: UpdateReviewRequest): Promise<ApiResponse<ReviewResponse>> => {
    const res = await apiClient.put<ApiResponse<ReviewResponse>>(`/admin/reviews/${id}`, data);
    return res.data;
  },

  /** DELETE /api/admin/reviews/{id} — also removes all linked images from server */
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete<ApiResponse<null>>(`/admin/reviews/${id}`);
    return res.data;
  },

  // ─── Image Management (preserved verbatim — Correction 8) ─────────────────

  /** POST /api/admin/reviews/{reviewId}/images — single file upload.
   *  NOTE: backend returns the full ReviewResponse (not just the image),
   *  so we declare Promise<ApiResponse<ReviewResponse>> to match exactly. */
  uploadImage: async (reviewId: string, file: File): Promise<ApiResponse<ReviewResponse>> => {
    const fd = new FormData();
    fd.append("image", file); // field name MUST be "image"
    const res = await apiClient.post<ApiResponse<ReviewResponse>>(
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
