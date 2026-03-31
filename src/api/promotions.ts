import { apiClient } from "./client";
import type { ApiResponse, PromotionResponse, CreatePromotionRequest, UpdatePromotionRequest } from "../types";

export const promotionsApi = {
  getAll: (includeInactive: boolean = false): Promise<ApiResponse<PromotionResponse[]>> => {
    return apiClient.get(`/promotions?includeInactive=${includeInactive}`).then((r) => r.data);
  },

  getById: (id: string): Promise<ApiResponse<PromotionResponse>> => {
    return apiClient.get(`/promotions/${id}`).then((r) => r.data);
  },

  create: (data: CreatePromotionRequest): Promise<ApiResponse<PromotionResponse>> => {
    return apiClient.post("/promotions", data).then((r) => r.data);
  },

  update: (id: string, data: UpdatePromotionRequest): Promise<ApiResponse<PromotionResponse>> => {
    return apiClient.put(`/promotions/${id}`, data).then((r) => r.data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/promotions/${id}`).then((r) => r.data);
  },
};
