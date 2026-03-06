import { apiClient } from "./client";
import type {
  ApiResponse,
  PaginatedResponse,
  OrderResponse,
  OrderFilterParams,
  UpdateOrderStatusRequest,
} from "../types";

export const ordersApi = {
  getAll: async (params?: OrderFilterParams): Promise<ApiResponse<PaginatedResponse<OrderResponse>>> => {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<OrderResponse>>>("/orders", { params });
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<OrderResponse>> => {
    const res = await apiClient.get<ApiResponse<OrderResponse>>(`/orders/${id}`);
    return res.data;
  },

  getByNumber: async (orderNumber: string): Promise<ApiResponse<OrderResponse>> => {
    const res = await apiClient.get<ApiResponse<OrderResponse>>(`/orders/number/${orderNumber}`);
    return res.data;
  },

  updateStatus: async (id: string, data: UpdateOrderStatusRequest): Promise<ApiResponse<OrderResponse>> => {
    const res = await apiClient.put<ApiResponse<OrderResponse>>(`/orders/${id}/status`, data);
    return res.data;
  },

  cancel: async (id: string, reason?: string): Promise<ApiResponse<OrderResponse>> => {
    const res = await apiClient.post<ApiResponse<OrderResponse>>(`/orders/${id}/cancel`, reason ? JSON.stringify(reason) : null, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },
};
