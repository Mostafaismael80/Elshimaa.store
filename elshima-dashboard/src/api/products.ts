import { apiClient } from "./client";
import type {
  ApiResponse,
  PaginatedResponse,
  ProductResponse,
  ProductFilterParams,
  CreateProductRequest,
  UpdateProductRequest,
  AddProductBatchRequest,
} from "../types";

export const productsApi = {
  getAll: async (params?: ProductFilterParams): Promise<ApiResponse<PaginatedResponse<ProductResponse>>> => {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<ProductResponse>>>("/products", { params });
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<ProductResponse>> => {
    const res = await apiClient.get<ApiResponse<ProductResponse>>(`/products/${id}`);
    return res.data;
  },

  create: async (data: CreateProductRequest): Promise<ApiResponse<ProductResponse>> => {
    const res = await apiClient.post<ApiResponse<ProductResponse>>("/products", data);
    return res.data;
  },

  /** Add one or more products using slug/name-based body (categorySlug, sizeType, colorName, sizeName) */
  createBatch: async (data: AddProductBatchRequest): Promise<ApiResponse<ProductResponse[]>> => {
    const res = await apiClient.post<ApiResponse<ProductResponse[]>>("/products/batch", data);
    return res.data;
  },

  createWithImage: async (formData: FormData): Promise<ApiResponse<ProductResponse>> => {
    const res = await apiClient.post<ApiResponse<ProductResponse>>("/products/with-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  update: async (id: string, data: UpdateProductRequest): Promise<ApiResponse<ProductResponse>> => {
    const res = await apiClient.put<ApiResponse<ProductResponse>>(`/products/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete<ApiResponse<null>>(`/products/${id}`);
    return res.data;
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<ApiResponse<{ url: string }>>("/images/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data.url;
  },
};
