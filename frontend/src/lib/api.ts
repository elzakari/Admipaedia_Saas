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
    console.log('🚀 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers
    });

    // Performance tracking: start time
    (config as any).metadata = { startTime: performance.now() };

    const token = localStorage.getItem('token'); // Changed from 'access_token' to 'token'
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('🔐 Added auth token to request');
    } else {
      console.log('⚠️ No auth token found in localStorage');
    }

    const tenantId = localStorage.getItem('saas_current_tenant_id');
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      dataType: typeof response.data,
      dataSize: JSON.stringify(response.data).length
    });

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
    console.error('❌ API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      message: error.message,
      data: error.response?.data
    });

    const originalRequest = error.config;

    // Fix the response interceptor (around line 40-50)
    // Skip token refresh for login requests
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      console.log('🔄 Attempting token refresh for 401 error');
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          console.log('🔑 Found refresh token, attempting refresh');
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
          console.log('✅ Token refreshed successfully');

          // Update the original request with new token
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          return api(originalRequest);
        } else {
          console.log('❌ No refresh token found');
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        // Clear tokens and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { api };
