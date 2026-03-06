import { apiClient } from "./client";
import type {
  ApiResponse,
  CategoryResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../types";

export const categoriesApi = {
  getAll: async (includeInactive = false): Promise<ApiResponse<CategoryResponse[]>> => {
    const res = await apiClient.get<ApiResponse<CategoryResponse[]>>("/categories", {
      params: { includeInactive },
    });
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<CategoryResponse>> => {
    const res = await apiClient.get<ApiResponse<CategoryResponse>>(`/categories/${id}`);
    return res.data;
  },

  create: async (data: CreateCategoryRequest): Promise<ApiResponse<CategoryResponse>> => {
    const res = await apiClient.post<ApiResponse<CategoryResponse>>("/categories", data);
    return res.data;
  },

  createWithImage: async (formData: FormData): Promise<ApiResponse<CategoryResponse>> => {
    const res = await apiClient.post<ApiResponse<CategoryResponse>>("/categories/with-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  update: async (id: string, data: UpdateCategoryRequest): Promise<ApiResponse<CategoryResponse>> => {
    const res = await apiClient.put<ApiResponse<CategoryResponse>>(`/categories/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete<ApiResponse<null>>(`/categories/${id}`);
    return res.data;
  },
};
