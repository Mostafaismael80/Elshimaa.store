import { apiClient } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  OrderResponse,
  OrderFilterParams,
  UpdateOrderStatusRequest,
} from '../types';

type OrderListResponse = ApiResponse<PaginatedResponse<OrderResponse>>;
type OrderDetailResponse = ApiResponse<OrderResponse>;

export const ordersApi = {
  /** GET /api/orders — Admin paginated list */
  getAll(params?: OrderFilterParams): Promise<OrderListResponse> {
    return apiClient.get('/orders', { params }).then((r) => r.data);
  },

  /** GET /api/orders/{id} */
  getById(id: string): Promise<OrderDetailResponse> {
    return apiClient.get(`/orders/${id}`).then((r) => r.data);
  },

  /** GET /api/orders/number/{orderNumber} — Admin */
  getByNumber(orderNumber: string): Promise<OrderDetailResponse> {
    return apiClient.get(`/orders/number/${orderNumber}`).then((r) => r.data);
  },

  /** GET /api/orders/my-orders — current authenticated customer */
  getMyOrders(): Promise<ApiResponse<OrderResponse[]>> {
    return apiClient.get('/orders/my-orders').then((r) => r.data);
  },

  /** GET /api/orders/track?orderNumber=...&phone=... — public */
  track(orderNumber: string, phone: string): Promise<OrderDetailResponse> {
    return apiClient
      .get('/orders/track', { params: { orderNumber, phone } })
      .then((r) => r.data);
  },

  /** PUT /api/orders/{id}/status — Admin */
  updateStatus(id: string, body: UpdateOrderStatusRequest): Promise<OrderDetailResponse> {
    return apiClient.put(`/orders/${id}/status`, body).then((r) => r.data);
  },

  /** POST /api/orders/{id}/cancel */
  cancel(id: string): Promise<ApiResponse<null>> {
    return apiClient.post(`/orders/${id}/cancel`).then((r) => r.data);
  },
};
