import { apiClient } from './client';
import type { ApiResponse } from '../types';

/** Upload an image file to /api/images/upload.
 *  Returns the relative path (e.g. "products/abc123.jpg").
 *  The full URL is built by the backend at read-time; store only the relative path.
 */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<ApiResponse<{ url: string }>>(
    '/images/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }
  );
  return data.data.url;
}

export const imagesApi = { uploadImage };
