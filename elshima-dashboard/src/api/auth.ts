import { apiClient } from "./client";
import type { ApiResponse, AuthResponse, LoginRequest } from "../types";

export const authApi = {
  login: async (data: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>("/auth/login", data);
    return res.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<null>> => {
    const res = await apiClient.post<ApiResponse<null>>("/auth/change-password", data);
    return res.data;
  },
};
