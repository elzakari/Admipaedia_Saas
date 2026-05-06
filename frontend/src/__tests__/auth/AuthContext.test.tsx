import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';

// Mock the auth service
jest.mock('../../services/authService');
const mockAuthService = authService as jest.Mocked<typeof authService>;

// Test component to access auth context
const TestComponent: React.FC = () => {
  const { user, login, logout, isLoading, error } = useAuth();
  
  return (
    <div>
      <div data-testid="user">{user ? user.username : 'No user'}</div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="error">{error || 'No error'}</div>
      <button onClick={() => login('testuser', 'password123')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

const renderWithAuthProvider = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Initial State', () => {
    it('should initialize with no user and not loading', () => {
      renderWithAuthProvider(<TestComponent />);
      
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });

    it('should restore user from localStorage on mount', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write']
      };

      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'mock-token');

      mockAuthService.validateToken.mockResolvedValue({ valid: true, user: mockUser });

      renderWithAuthProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      });

      expect(mockAuthService.validateToken).toHaveBeenCalledWith('mock-token');
    });

    it('should clear invalid token from localStorage', async () => {
      localStorage.setItem('token', 'invalid-token');
      
      mockAuthService.validateToken.mockResolvedValue({ valid: false });

      renderWithAuthProvider(<TestComponent />);

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeNull();
      });
    });
  });

  describe('Login', () => {
    it('should successfully login user', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write']
      };

      const mockLoginResponse = {
        success: true,
        user: mockUser,
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        csrf_token: 'mock-csrf-token'
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      renderWithAuthProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      
      await act(async () => {
        await userEvent.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      });

      expect(mockAuthService.login).toHaveBeenCalledWith('testuser', 'password123');
      expect(localStorage.getItem('token')).toBe('mock-access-token');
      expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token');
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    });

    it('should handle login failure', async () => {
      const mockError = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(mockError);

      renderWithAuthProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      
      await act(async () => {
        await userEvent.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('No user');
    });

    it('should show loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      mockAuthService.login.mockReturnValue(loginPromise);

      renderWithAuthProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      
      act(() => {
        userEvent.click(loginButton);
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

      act(() => {
        resolveLogin!({
          success: true,
          user: { id: '1', username: 'testuser' },
          access_token: 'token'
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });
    });
  });

  describe('Logout', () => {
    it('should successfully logout user', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write']
      };

      // Set up initial logged-in state
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'mock-token');

      mockAuthService.logout.mockResolvedValue({ success: true });

      renderWithAuthProvider(<TestComponent />);

      // Wait for initial state to load
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      });

      const logoutButton = screen.getByText('Logout');
      
      await act(async () => {
        await userEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should clear local state even if logout API fails', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write']
      };

      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'mock-token');

      mockAuthService.logout.mockRejectedValue(new Error('Network error'));

      renderWithAuthProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      });

      const logoutButton = screen.getByText('Logout');
      
      await act(async () => {
        await userEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });

      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('Token Management', () => {
    it('should refresh token when expired', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write']
      };

      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'expired-token');
      localStorage.setItem('refreshToken', 'refresh-token');

      mockAuthService.validateToken.mockResolvedValue({ valid: false, expired: true });
      mockAuthService.refreshToken.mockResolvedValue({
        success: true,
        access_token: 'new-access-token',
        csrf_token: 'new-csrf-token'
      });

      renderWithAuthProvider(<TestComponent />);

      await waitFor(() => {
        expect(mockAuthService.refreshToken).toHaveBeenCalledWith('refresh-token');
      });

      expect(localStorage.getItem('token')).toBe('new-access-token');
    });

    it('should logout user when refresh token is invalid', async () => {
      localStorage.setItem('token', 'expired-token');
      localStorage.setItem('refreshToken', 'invalid-refresh-token');

      mockAuthService.validateToken.mockResolvedValue({ valid: false, expired: true });
      mockAuthService.refreshToken.mockRejectedValue(new Error('Invalid refresh token'));

      renderWithAuthProvider(<TestComponent />);

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should clear error when login succeeds after failure', async () => {
      // First, simulate a failed login
      mockAuthService.login.mockRejectedValueOnce(new Error('Invalid credentials'));

      renderWithAuthProvider(<TestComponent />);

      const loginButton = screen.getByText('Login');
      
      await act(async () => {
        await userEvent.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
      });

      // Then simulate a successful login
      mockAuthService.login.mockResolvedValueOnce({
        success: true,
        user: { id: '1', username: 'testuser' },
        access_token: 'token'
      });

      await act(async () => {
        await userEvent.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('No error');
        expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      });
    });
  });

  describe('Permission Checking', () => {
    it('should provide hasPermission function', async () => {
      const TestPermissionComponent: React.FC = () => {
        const { hasPermission } = useAuth();
        
        return (
          <div>
            <div data-testid="can-read">{hasPermission('read') ? 'Yes' : 'No'}</div>
            <div data-testid="can-write">{hasPermission('write') ? 'Yes' : 'No'}</div>
            <div data-testid="can-delete">{hasPermission('delete') ? 'Yes' : 'No'}</div>
          </div>
        );
      };

      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write']
      };

      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'mock-token');

      mockAuthService.validateToken.mockResolvedValue({ valid: true, user: mockUser });

      renderWithAuthProvider(<TestPermissionComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('can-read')).toHaveTextContent('Yes');
        expect(screen.getByTestId('can-write')).toHaveTextContent('Yes');
        expect(screen.getByTestId('can-delete')).toHaveTextContent('No');
      });
    });
  });
});