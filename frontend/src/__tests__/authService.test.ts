import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import authService from '../services/authService';
import api from '../lib/api';
import { User } from '../types/auth.types';

// Mock the api module
jest.mock('../lib/api');
const mockApi = jest.mocked(api);

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        data: {
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: 'student'
          },
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          success: true
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authService.login('test@example.com', 'password123');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error on invalid credentials', async () => {
      const mockError = new Error('Invalid credentials');
      mockApi.post.mockRejectedValue(mockError);

      await expect(authService.login('invalid@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockApi.post.mockRejectedValue(networkError);

      await expect(authService.login('test@example.com', 'password123'))
        .rejects.toThrow('Network Error');
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        confirm_password: 'password123',
        role: 'student'
      };

      const mockResponse = {
        data: {
          user: { id: 2, ...userData },
          token: 'mock-token'
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authService.register(userData);

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', userData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle registration errors', async () => {
      const userData = { username: 'existing', email: 'existing@example.com' };
      const mockError = new Error('User already exists');
      mockApi.post.mockRejectedValue(mockError);

      await expect(authService.register(userData))
        .rejects.toThrow('User already exists');
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user successfully', async () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'student'
      };

      mockApi.get.mockResolvedValue({ data: { user: mockUser } });

      const result = await authService.getCurrentUser();

      expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });

    it('should handle unauthorized access', async () => {
      const mockError = new Error('Unauthorized');
      mockApi.get.mockRejectedValue(mockError);

      await expect(authService.getCurrentUser())
        .rejects.toThrow('Unauthorized');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await authService.refreshToken();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', {}, {
        headers: {
          'Authorization': 'Bearer undefined',
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } });

      await authService.logout();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('should handle logout errors gracefully', async () => {
      const mockError = new Error('Logout failed');
      mockApi.post.mockRejectedValue(mockError);

      // Should not throw error even if server logout fails
      await expect(authService.logout()).resolves.toBeUndefined();
    });
  });

  describe('password management', () => {
    it('should request password reset successfully', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } });

      await authService.requestPasswordReset('test@example.com');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/request-password-reset', {
        email: 'test@example.com'
      });
    });

    it('should reset password successfully', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } });

      await authService.resetPassword('reset-token', 'newpassword123');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token',
        new_password: 'newpassword123'
      });
    });

    it('should change password successfully', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } });

      await authService.changePassword('oldpassword', 'newpassword123');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/change-password', {
        current_password: 'oldpassword',
        new_password: 'newpassword123',
        confirm_password: 'newpassword123'
      });
    });
  });
});
