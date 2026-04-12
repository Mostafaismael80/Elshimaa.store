import axios from 'axios';
import type { ApiResponse, AuthResponse } from '../types/index';

export const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://api.el-shimaa-store.com';
const API_BASE = `${BASE_URL}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

// ─── Request interceptor — attach JWT token ────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — 401 → try refresh → redirect ─────────────────────
let isRefreshing = false;
let refreshQueue: ((token: string) => void)[] = [];

const drainQueue = (token: string) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const storedToken = localStorage.getItem('token');
      const storedRefresh = localStorage.getItem('refreshToken');

      if (storedToken && storedRefresh) {
        if (isRefreshing) {
          // Queue this request until refresh completes
          return new Promise((resolve) => {
            refreshQueue.push((newToken: string) => {
              original.headers.Authorization = `Bearer ${newToken}`;
              resolve(apiClient(original));
            });
          });
        }

        isRefreshing = true;
        try {
          const { data } = await axios.post<ApiResponse<AuthResponse>>(
            `${API_BASE}/auth/refresh-token`,
            { token: storedToken, refreshToken: storedRefresh }
          );
          const newToken = data.data.token;
          const newRefresh = data.data.refreshToken;
          localStorage.setItem('token', newToken);
          localStorage.setItem('refreshToken', newRefresh);
          original.headers.Authorization = `Bearer ${newToken}`;
          drainQueue(newToken);
          return apiClient(original);
        } catch {
          // Refresh failed — clear session, redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        } finally {
          isRefreshing = false;
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
