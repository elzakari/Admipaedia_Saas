import api from '../lib/api';

export interface User {
  id: number;
  email: string;
  username: string; // Added to match backend /auth/me
  first_name?: string;
  last_name?: string;
  role: 'super_admin' | 'super_manager' | 'admin' | 'teacher' | 'student' | 'parent' | 'user';
  is_active?: boolean;
  profile_image?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  password_changed_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  password: string;
  confirm_password?: string;
  confirmPassword?: string;
  role?: 'admin' | 'teacher' | 'student' | 'parent' | 'user';
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  access_token?: string;
  refresh_token?: string;
  csrf_token?: string;
  message?: string;
  step?: 'mfa';
  temp_token?: string;
  expires_in?: number;
  tenant?: { id: string; name?: string; slug?: string };
  tenants?: Array<{ id: string; name: string; slug: string }>;
  default_tenant_id?: string | null;
}

const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const credentials: LoginCredentials = { email, password };
    const response = await api.post('/auth/login', credentials);

    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    if (response.data.refresh_token) {
      localStorage.setItem('refreshToken', response.data.refresh_token);
    }
    if (response.data.csrf_token) {
      localStorage.setItem('csrfToken', response.data.csrf_token);
    }

    return response.data;
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const username =
      userData.username ||
      userData.name ||
      [userData.first_name, userData.last_name].filter(Boolean).join(' ').trim();

    const payload = {
      username,
      email: userData.email,
      password: userData.password,
      confirm_password: userData.confirm_password || userData.confirmPassword || userData.password,
      role: userData.role || 'user'
    };

    const response = await api.post('/auth/register', payload);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    if (response.data && response.data.user) return response.data.user;
    return response.data;
  },

  // Fixed: Use api instead of axios
  refreshToken: async (): Promise<{ access_token: string; refresh_token?: string }> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', {}, {
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    try {
      await api.post('/auth/request-password-reset', { email });
    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw error;
    }
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword, confirm_password: newPassword });
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: newPassword
      });
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  verifyEmail: async (token: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  resendVerificationEmail: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  claimAccount: async (token: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.post('/auth/claim-account', { token, new_password: newPassword, confirm_password: newPassword });
      return response.data;
    } catch (error) {
      console.error('Error claiming account:', error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }
};

export { authService };
export default authService;
