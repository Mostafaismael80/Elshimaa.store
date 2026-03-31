import { apiClient } from "./client";
import type {
  ApiResponse,
  AnnouncementResponse,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from "../types";

export const announcementsApi = {
  getAll: async (includeInactive = false): Promise<ApiResponse<AnnouncementResponse[]>> => {
    const res = await apiClient.get<ApiResponse<AnnouncementResponse[]>>("/admin/announcements", {
      params: { includeInactive },
    });
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<AnnouncementResponse>> => {
    const res = await apiClient.get<ApiResponse<AnnouncementResponse>>(`/admin/announcements/${id}`);
    return res.data;
  },

  create: async (data: CreateAnnouncementRequest): Promise<ApiResponse<AnnouncementResponse>> => {
    const res = await apiClient.post<ApiResponse<AnnouncementResponse>>("/admin/announcements", data);
    return res.data;
  },

  update: async (id: string, data: UpdateAnnouncementRequest): Promise<ApiResponse<AnnouncementResponse>> => {
    const res = await apiClient.put<ApiResponse<AnnouncementResponse>>(`/admin/announcements/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete<ApiResponse<null>>(`/admin/announcements/${id}`);
    return res.data;
  },
};
