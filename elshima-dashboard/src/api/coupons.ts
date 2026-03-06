import { apiClient } from "./client";
import type { ApiResponse, CouponResponse, CreateCouponRequest } from "../types";

export const couponsApi = {
  getAll: async (includeInactive = false): Promise<ApiResponse<CouponResponse[]>> => {
    const res = await apiClient.get<ApiResponse<CouponResponse[]>>("/coupons", {
      params: { includeInactive },
    });
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<CouponResponse>> => {
    const res = await apiClient.get<ApiResponse<CouponResponse>>(`/coupons/${id}`);
    return res.data;
  },

  create: async (data: CreateCouponRequest): Promise<ApiResponse<CouponResponse>> => {
    const res = await apiClient.post<ApiResponse<CouponResponse>>("/coupons", data);
    return res.data;
  },

  update: async (id: string, data: CreateCouponRequest): Promise<ApiResponse<CouponResponse>> => {
    const res = await apiClient.put<ApiResponse<CouponResponse>>(`/coupons/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete<ApiResponse<null>>(`/coupons/${id}`);
    return res.data;
  },
};
