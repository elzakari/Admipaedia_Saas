import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/constants';
import { toast } from 'sonner';

// Extend the InternalAxiosRequestConfig interface to include metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: Date;
  };
  _retry?: boolean;
}

// Create an axios instance with enhanced configuration
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
  withCredentials: true
});

// Track retry attempts and refresh state
let isRefreshing = false;
let failedRequestsQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Add request timestamp for timeout tracking
    (config as ExtendedAxiosRequestConfig).metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Enhanced response interceptor
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const config = response.config as ExtendedAxiosRequestConfig;
    const duration = new Date().getTime() - (config.metadata?.startTime?.getTime() || 0);
    
    // Log slow requests
    if (duration > 5000) {
      console.warn(`Slow API request detected: ${response.config.url} took ${duration}ms`);
    }
    
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      toast.error('Request Timeout', {
        description: 'The request took too long to complete. Please try again.',
        action: {
          label: 'Retry',
          onClick: () => api.request(originalRequest)
        },
        duration: 8000
      });
      return Promise.reject(error);
    }
    
    // Handle network errors
    if (!error.response) {
      toast.error('Network Error', {
        description: 'Unable to connect to the server. Please check your connection.',
        duration: 8000
      });
      return Promise.reject(error);
    }
    
    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers!['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {}, {
          headers: {
            'Authorization': `Bearer ${refreshToken}`
          },
          timeout: 10000 // Shorter timeout for refresh
        });
        
        const { access_token } = response.data;
        localStorage.setItem('token', access_token);
        
        // Process queued requests
        failedRequestsQueue.forEach(({ resolve }) => resolve(access_token));
        failedRequestsQueue = [];
        
        // Retry original request
        originalRequest.headers!['Authorization'] = `Bearer ${access_token}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // Process queued requests with error
        failedRequestsQueue.forEach(({ reject }) => reject(refreshError));
        failedRequestsQueue = [];
        
        // Clear tokens and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        
        toast.error('Session Expired', {
          description: 'Please log in again to continue.',
          duration: 5000
        });
        
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Handle other HTTP errors
    if (error.response?.status >= 500) {
      toast.error('Server Error', {
        description: 'Something went wrong on our end. Please try again later.',
        duration: 8000
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;
export { api };