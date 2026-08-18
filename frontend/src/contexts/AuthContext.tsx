import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services';
import { User, AuthResponse } from '@/services/authService';
import { getJwtExpirationMs } from '@/utils/jwt';
import { queryClient } from '@/lib/queryClient';

/**
 * Returns the currently active tenant identifier for cache scoping purposes.
 * Priority:
 *   1. Explicit user-set active tenant (saas_current_tenant_id in localStorage)
 *   2. Authenticated user's tenant_id / tenant.id
 *   3. Null sentinel when none available (public routes)
 */
function getActiveTenantSalt(user: User | null): string | null {
  try {
    const override = localStorage.getItem('saas_current_tenant_id');
    if (override && typeof override === 'string' && override.trim().length > 0) {
      return override.trim();
    }
  } catch {
    /* ignore storage access failures */
  }
  if (!user) return null;
  const fromUser =
    (user as any)?.tenant_id ??
    (user as any)?.tenant?.id ??
    (user as any)?.school_id ??
    (user as any)?.school?.id ??
    null;
  return fromUser != null ? String(fromUser) : null;
}

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>; // Updated return type
  logout: () => void;
  refreshToken: () => Promise<{ access_token: string; refresh_token?: string }>;
  hasRole: (roles: string | string[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  const authChecked = useRef(false);
  const lastSeenCacheKeySalt = useRef<string>('');

  // ── Cross-tenant cache isolation ────────────────────────────────────────
  // Any time the authenticated user identity or the active tenant switches
  // (e.g. school admin switches between 2 different schools on same browser)
  // we WIPE the entire TanStack query cache. Otherwise stale cached data
  // from the previous tenant would be displayed — causing the exact "data
  // from another tenant is showing" bug the user reported.
  useEffect(() => {
    const nextSalt = `u:${user?.id ?? ''}|t:${getActiveTenantSalt(user) ?? ''}`;
    if (lastSeenCacheKeySalt.current === '') {
      lastSeenCacheKeySalt.current = nextSalt;
      return;
    }
    if (nextSalt !== lastSeenCacheKeySalt.current) {
      try {
        queryClient.clear();
      } catch (err) {
        console.warn('[Auth] Failed to clear query cache on identity/tenant switch:', err);
      }
      lastSeenCacheKeySalt.current = nextSalt;
    }
  }, [user, user?.id]);

  useEffect(() => {
    const checkAuth = async () => {
      if (authChecked.current) return;
      authChecked.current = true;

      try {
        const token = localStorage.getItem('token');
        if (token) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Single refreshToken function implementation
  // Fix the refreshToken function in AuthContext.tsx (around line 55-76)
  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      if (!refreshTokenValue) throw new Error('No refresh token available');

      // Call authService.refreshToken() without parameters
      const { access_token } = await authService.refreshToken();
      // Store as 'token' consistently
      localStorage.setItem('token', access_token);
      return { access_token };
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear tokens and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
      throw error;
    }
  };

  useEffect(() => {
    // Set up token refresh before expiration
    const token = localStorage.getItem('token'); // Use 'token' consistently
    if (token) {
      try {
        if (!token) return;
        const expirationTime = getJwtExpirationMs(token);
        if (!expirationTime) throw new Error('Invalid token');
        const currentTime = Date.now();

        // Calculate time until token expires (minus a buffer of 5 minutes)
        const timeUntilExpiration = expirationTime - currentTime - (5 * 60 * 1000);

        // Set up timer to refresh token before it expires
        if (timeUntilExpiration > 0) {
          const refreshTimer = setTimeout(() => {
            refreshToken();
          }, timeUntilExpiration);

          // Clean up timer
          return () => clearTimeout(refreshTimer);
        } else {
          // Token is already expired or will expire soon, refresh now
          refreshToken();
          return () => { }; // Consistent return
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        // If token can't be decoded, remove it
        localStorage.removeItem('token'); // Use 'token' consistently
        localStorage.removeItem('refreshToken');
        setUser(null);
        setIsAuthenticated(false);
      }
    }
    return () => { }; // Default return
  }, [user]); // Re-run when user changes (e.g., after login)

  // Add more detailed logging in login function
  // In the login function
  const login = async (email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await authService.login(email, password);

      // Handle MFA step
      if (response.step === 'mfa') {
        setIsLoading(false);
        return response;
      }

      // Store tokens in localStorage
      if (response.access_token) localStorage.setItem('token', response.access_token);
      if (response.refresh_token) localStorage.setItem('refreshToken', response.refresh_token);
      if (response.csrf_token) localStorage.setItem('csrfToken', response.csrf_token);

      const existingTenantId = localStorage.getItem('saas_current_tenant_id');
      const availableTenantIds = new Set<string>();
      if (response.tenant?.id) availableTenantIds.add(response.tenant.id);
      if (response.tenants) {
        for (const t of response.tenants) {
          if (t?.id) availableTenantIds.add(t.id);
        }
      }
      const nextTenantId =
        response.tenant?.id ||
        response.default_tenant_id ||
        (response.tenants && response.tenants.length === 1 ? response.tenants[0].id : null);
      const shouldReplaceTenant =
        !existingTenantId ||
        (availableTenantIds.size > 0 && !availableTenantIds.has(existingTenantId));

      if (nextTenantId && shouldReplaceTenant) {
        localStorage.setItem('saas_current_tenant_id', nextTenantId);
      }

      if (response.user) {
        setUser(response.user as User);
        setIsAuthenticated(true);

        // Redirect based on role
        if (response.user.role === 'super_admin' || response.user.role === 'super_manager') {
          navigate('/super-admin');
        } else if (response.user.role === 'admin' || response.user.role === 'school_admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      }

      return response;
    } catch (error) {
      if (error?.response?.status === 401) {
        console.warn('Login failed:', error?.response?.data?.message || 'Invalid credentials');
      } else {
        console.error('Login error:', error);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout(); // This will clear the cookies on the server
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('saas_current_tenant_id');
      // Wipe cached data so the NEXT user/tenant that logs in on this
      // browser absolutely cannot see the previous tenant's cached rows.
      try { queryClient.clear(); } catch (_) { /* noop */ }
      lastSeenCacheKeySalt.current = '';
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Define hasRole function inside the component where user is in scope
  const hasRole = (roles: string | string[]) => {
    if (!user) return false;

    const effectiveRoles = Array.isArray(user.effective_roles) ? user.effective_roles : [];
    const assignedRoles = Array.isArray(user.roles) ? user.roles : [];
    const availableRoles = new Set([user.role, ...effectiveRoles, ...assignedRoles].filter(Boolean));

    if (typeof roles === 'string') {
      return availableRoles.has(roles);
    }

    return roles.some((role) => availableRoles.has(role));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshToken,
        hasRole, // Add this to the context value
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
