import { apiClient } from './client';
import type {
  ApiResponse,
  CategoryResponse,
  CreateCategoryRequest,
} from '../types';

type CategoryListResponse = ApiResponse<CategoryResponse[]>;
type CategoryDetailResponse = ApiResponse<CategoryResponse>;

export const categoriesApi = {
  /** GET /api/categories?includeInactive=true|false */
  getAll(includeInactive = false): Promise<CategoryListResponse> {
    return apiClient.get('/categories', { params: { includeInactive } }).then((r) => r.data);
  },

  /** GET /api/categories/root */
  getRoots(): Promise<CategoryListResponse> {
    return apiClient.get('/categories/root').then((r) => r.data);
  },

  /** GET /api/categories/{id} */
  getById(id: string): Promise<CategoryDetailResponse> {
    return apiClient.get(`/categories/${id}`).then((r) => r.data);
  },

  /** POST /api/categories — JSON body (image URL pre-uploaded) */
  create(data: CreateCategoryRequest): Promise<CategoryDetailResponse> {
    return apiClient.post('/categories', data).then((r) => r.data);
  },

  /** POST /api/categories/with-image — multipart form data */
  createWithImage(formData: FormData): Promise<CategoryDetailResponse> {
    return apiClient
      .post('/categories/with-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  /** PUT /api/categories/{id} */
  update(id: string, data: FormData): Promise<CategoryDetailResponse> {
    return apiClient.put(`/categories/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  /** DELETE /api/categories/{id} — soft delete */
  delete(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete(`/categories/${id}`).then((r) => r.data);
  },
};
