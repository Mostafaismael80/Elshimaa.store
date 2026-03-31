import { apiClient } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  ProductResponse,
  ProductFilterParams,
  CreateProductRequest,
  UpdateProductRequest,
} from '../types';

type ProductListResponse = ApiResponse<PaginatedResponse<ProductResponse>>;
type ProductDetailResponse = ApiResponse<ProductResponse>;

export const productsApi = {
  /** GET /api/products — paginated listing */
  getAll(params?: ProductFilterParams): Promise<ProductListResponse> {
    return apiClient.get('/products', { params }).then((r) => r.data);
  },

  /** GET /api/products/{id} — full detail with colors, images, variants */
  getById(id: string): Promise<ProductDetailResponse> {
    return apiClient.get(`/products/${id}`).then((r) => r.data);
  },

  /** GET /api/products/slug/{slug} */
  getBySlug(slug: string): Promise<ProductDetailResponse> {
    return apiClient.get(`/products/slug/${slug}`).then((r) => r.data);
  },

  /** GET /api/products/featured?count=N */
  getFeatured(count = 10): Promise<ApiResponse<ProductResponse[]>> {
    return apiClient.get('/products/featured', { params: { count } }).then((r) => r.data);
  },

  /** GET /api/products/{id}/related?count=N */
  getRelated(id: string, count = 4): Promise<ApiResponse<ProductResponse[]>> {
    return apiClient.get(`/products/${id}/related`, { params: { count } }).then((r) => r.data);
  },

  /** POST /api/products — create with JSON body */
  create(data: CreateProductRequest): Promise<ProductDetailResponse> {
    return apiClient.post('/products', data).then((r) => r.data);
  },

  /** PUT /api/products/{id} — update */
  update(id: string, data: UpdateProductRequest): Promise<ProductDetailResponse> {
    return apiClient.put(`/products/${id}`, data).then((r) => r.data);
  },

  /** DELETE /api/products/{id} — soft delete */
  delete(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete(`/products/${id}`).then((r) => r.data);
  },
};
