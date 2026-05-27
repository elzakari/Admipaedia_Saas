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

    const activeBranchId = localStorage.getItem('active_branch_id') || localStorage.getItem('saas_current_branch_id');
    if (activeBranchId) {
      config.headers['X-Active-Branch-ID'] = activeBranchId;
      config.headers['X-Branch-ID'] = activeBranchId;
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
    const isLoginPage = typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/super-admin/login');
    const isAuthMe = originalRequest?.url?.includes('/auth/me');

    if (isLoginPage && isAuthMe) {
      return Promise.reject(error);
    }

    const status = error.response ? error.response.status : null;

    if (status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
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
        } else {
          // Only drop session if there's no refresh token and the token signature itself is explicitly rejected
          console.warn("🔒 Explicit session expiration encountered.");
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          if (!isLoginPage) {
            window.location.href = window.location.pathname.startsWith('/super-admin') ? '/super-admin/login' : '/login';
          }
        }
      } catch (refreshError: any) {
        // Only clear tokens if the refresh endpoint explicitly returns 401 or 403
        const refreshStatus = refreshError.response ? refreshError.response.status : null;
        if (refreshStatus === 401 || refreshStatus === 403) {
          console.warn("🔒 Refresh token explicitly rejected/expired.");
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('refresh_token');
          if (!isLoginPage) {
            window.location.href = window.location.pathname.startsWith('/super-admin') ? '/super-admin/login' : '/login';
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { api };
