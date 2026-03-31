import { apiClient } from "./client";
import type { ApiResponse, UserDto } from "../types";

// Admin-level user data is served via orders (userId + customerName/email).
// This module wraps the current-user endpoint for profile use.
export const usersApi = {
  getMe: async (): Promise<ApiResponse<UserDto>> => {
    const res = await apiClient.get<ApiResponse<UserDto>>("/users/me");
    return res.data;
  },

  // Fetch paginated customers from orders data (aggregated client-side)
  // Real customer list uses the /orders endpoint filtered by userId
};
