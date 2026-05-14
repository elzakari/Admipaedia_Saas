// api.ts
import axios from 'axios';
import { API_BASE_URL } from '../config/constants';
import performanceRegistry from '../services/performanceRegistry';

// Create an axios instance
const base = (API_BASE_URL || '').replace(/\/+$/, '');
const resolvedBaseURL =
  !base ? '/api/v1'
  : base.endsWith('/api/v1') ? base
  : base.endsWith('/api') ? `${base}/v1`
  : `${base}/api/v1`;

const api = axios.create({
  baseURL: resolvedBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});


// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Performance tracking: start time
    (config as any).metadata = { startTime: performance.now() };

    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const tenantId = localStorage.getItem('saas_current_tenant_id');
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced response interceptor
api.interceptors.response.use(
  (response) => {
    // Performance tracking: end time
    const startTime = (response.config as any).metadata?.startTime;
    if (startTime) {
      const duration = performance.now() - startTime;
      performanceRegistry.record({
        name: `api_${response.config.method?.toLowerCase()}_${response.config.url?.split('?')[0]}`,
        value: duration,
        timestamp: Date.now(),
        tags: {
          method: response.config.method || 'unknown',
          url: response.config.url || 'unknown',
          status: response.status.toString()
        }
      });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Fix the response interceptor (around line 40-50)
    // Skip token refresh for login requests
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      originalRequest._retry = true;

      try {
        const refreshToken =
          localStorage.getItem('refreshToken') ||
          localStorage.getItem('refresh_token');
        if (refreshToken) {
          // Use direct axios call with proper headers
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {}, {
            headers: {
              'Authorization': `Bearer ${refreshToken}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });

          const { access_token } = response.data;
          localStorage.setItem('token', access_token);
          localStorage.setItem('access_token', access_token);

          // Update the original request with new token
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Clear tokens and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('refresh_token');
        window.location.href = window.location.pathname.startsWith('/super-admin') ? '/super-admin/login' : '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { api };
