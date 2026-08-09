// api.ts
import axios from 'axios';
import { API_BASE_URL } from '../config/constants';
import performanceRegistry from '../services/performanceRegistry';
import { normalizeStoredContextValue } from '../services/socketConnectionContext';

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

    const token = normalizeStoredContextValue(
      localStorage.getItem('token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('accessToken')
    );
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const tenantId = normalizeStoredContextValue(localStorage.getItem('saas_current_tenant_id'));
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }

    const activeBranchId = normalizeStoredContextValue(
      localStorage.getItem('active_branch_id') || localStorage.getItem('saas_current_branch_id')
    );
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

      // Note: declare refreshToken OUTSIDE the try/catch so the catch branch
      // can use it to decide whether to drop the local session (TS2304 fix).
      let refreshToken: string | null = null;
      try {
        refreshToken =
          localStorage.getItem('refreshToken') ||
          localStorage.getItem('refresh_token') || null;
      } catch {
        refreshToken = null;
      }

      try {
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
          try {
            localStorage.setItem('token', access_token);
            localStorage.setItem('access_token', access_token);
          } catch {}

          // Update the original request with new token
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          return api(originalRequest);
        } else {
          // Only drop session if there's no refresh token and the token signature itself is explicitly rejected
          console.warn("🔒 Explicit session expiration encountered.");
          try {
            localStorage.removeItem('token');
            localStorage.removeItem('access_token');
          } catch {}
          if (!isLoginPage && typeof window !== 'undefined') {
            try {
              window.location.href = window.location.pathname.startsWith('/super-admin') ? '/super-admin/login' : '/login';
            } catch {}
          }
        }
      } catch (refreshError: any) {
        // Normalize: refresh failures should never be thrown as an unhandled
        // promise rejection from the response interceptor, because the caller
        // may not be awaiting the original axios promise.
        const refreshStatus = refreshError.response ? refreshError.response.status : null;
        const refreshMsg =
          (typeof refreshError?.response?.data?.message === 'string'
            && refreshError.response.data.message.trim())
          ? refreshError.response.data.message
          : (typeof refreshError?.response?.data?.error === 'string'
             && refreshError.response.data.error.trim())
          ? refreshError.response.data.error
          : (typeof refreshError?.message === 'string' ? refreshError.message : null);
        const shouldDrop = (
          refreshStatus === 401
          || refreshStatus === 403
          || (refreshStatus === 400
              && (refreshMsg === 'Invalid token'
                  || refreshMsg === 'Token has expired'
                  || refreshMsg === 'Token has been revoked'))
          || !refreshToken
        );

        if (shouldDrop) {
          console.warn(
            `🔒 Refresh token rejected/expired (HTTP ${refreshStatus ?? 'N/A'}). Dropping session.`
            + (refreshMsg ? ` Details: ${refreshMsg}` : '')
          );
          try {
            localStorage.removeItem('token');
            localStorage.removeItem('access_token');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('csrf_token');
            localStorage.removeItem('user');
          } catch {}
          if (!isLoginPage && typeof window !== 'undefined') {
            try {
              window.location.href = window.location.pathname.startsWith('/super-admin')
                ? '/super-admin/login'
                : '/login';
            } catch {}
          }
        } else {
          // Network error, 404, 5xx, rate-limit, or transient refresh failure.
          // Don't drop the local session; surface the original 401 to the caller
          // so the page can retry or show a toast instead of hard-logging-out.
          console.warn(
            `⚠️  Token refresh skipped (HTTP ${refreshStatus ?? 'network'}). `
            + 'Preserving local session; surface original 401 to caller.',
            refreshError
          );
        }

        // Never throw an unhandled promise rejection out of the refresh
        // interceptor. Reject with the original error but always with a
        // try/finally fallback, because the caller chain is often composed
        // with react-query callbacks that may swallow but should not throw
        // globally.
        try {
          Object.defineProperty(error, 'message', {
            writable: true, configurable: true, enumerable: false,
            value: refreshMsg
              || (typeof error.message === 'string' ? error.message : 'Session refresh failed')
          });
        } catch {}

        return Promise.reject(error);
      }
    }

    // Enrich the thrown error so UI toast layers can display actionable messages without
    // re-plumbing error responses at every mutation/call site.
    try {
      const data: any = error?.response?.data;
      if (data && typeof data === 'object') {
        const candidates: string[] = [];
        if (typeof data.message === 'string' && data.message.trim()) candidates.push(data.message);
        if (typeof data.error === 'string' && data.error.trim() && data.error !== data.message) candidates.push(data.error);
        const msg = candidates[0] || null;
        const detail = candidates.slice(1).join(' — ') || null;
        if (msg) {
          Object.defineProperty(error, 'message', {
            writable: true,
            configurable: true,
            enumerable: false,
            value: msg,
          });
        }
        if (detail) {
          (error as any).errorDetail = detail;
        }
        if (typeof data.error_type === 'string') {
          (error as any).errorType = data.error_type;
        }
      }
    } catch {
      // Fall through with the original error if enrichment parsing fails.
    }

    return Promise.reject(error);
  }
);

export default api;
export { api };
