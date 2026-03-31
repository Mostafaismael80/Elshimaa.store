import { apiClient } from "./client";
import type { ApiResponse, DiscountResponse, CreateDiscountRequest } from "../types";

export const discountsApi = {
  getAll: async (includeInactive = false): Promise<ApiResponse<DiscountResponse[]>> => {
    const res = await apiClient.get<ApiResponse<DiscountResponse[]>>("/discounts", {
      params: { includeInactive },
    });
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<DiscountResponse>> => {
    const res = await apiClient.get<ApiResponse<DiscountResponse>>(`/discounts/${id}`);
    return res.data;
  },

  create: async (data: CreateDiscountRequest): Promise<ApiResponse<DiscountResponse>> => {
    const res = await apiClient.post<ApiResponse<DiscountResponse>>("/discounts", data);
    return res.data;
  },

  update: async (id: string, data: CreateDiscountRequest): Promise<ApiResponse<DiscountResponse>> => {
    const res = await apiClient.put<ApiResponse<DiscountResponse>>(`/discounts/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete<ApiResponse<null>>(`/discounts/${id}`);
    return res.data;
  },
};
