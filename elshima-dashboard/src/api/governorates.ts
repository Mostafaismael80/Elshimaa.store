import { apiClient } from './client';
import type { ApiResponse, GovernorateResponse } from '../types';

export const governoratesApi = {
  getAll(): Promise<ApiResponse<GovernorateResponse[]>> {
    return apiClient.get('/governorates').then((r) => r.data);
  },

  getById(id: string): Promise<ApiResponse<GovernorateResponse>> {
    return apiClient.get(`/governorates/${id}`).then((r) => r.data);
  },

  updateShippingCost(id: string, body: { shippingCost: number }): Promise<ApiResponse<GovernorateResponse>> {
    return apiClient.put(`/governorates/${id}/shipping-cost`, body).then((r) => r.data);
  },
};
