import { apiClient } from './client';

export interface LookupDto {
  id: string;
  name: string;
  hexCode?: string | null;
  sizeTypeId?: string;
}

export const lookupsApi = {
  getColors(): Promise<LookupDto[]> {
    return apiClient.get('/colors').then((r) => r.data);
  },
  
  getSizes(): Promise<LookupDto[]> {
    return apiClient.get('/sizes').then((r) => r.data);
  },

  getSizeTypes(): Promise<LookupDto[]> {
    return apiClient.get('/size-types').then((r) => r.data);
  }
};
