import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { authService } from '../services';

// Mock the authService
vi.mock('../services', () => ({
  authService: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn().mockImplementation(async () => {
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('refreshToken');
    }),
    refreshToken: vi.fn()
  }
}));

vi.mock('../utils/jwt', () => ({
  getJwtExpirationMs: () => Date.now() + 1000000
}));

const mockAuthService = authService as unknown as {
  login: any;
  getCurrentUser: any;
  logout: any;
  refreshToken: any;
};

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as any;
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Test component to access AuthContext
const TestComponent = () => {
  const { user, isAuthenticated, isLoading, login, logout, hasRole } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user">{user ? user.username : 'No User'}</div>
      <div data-testid="has-admin-role">{hasRole('admin') ? 'Has Admin' : 'No Admin'}</div>
      <button onClick={() => login('test@example.com', 'password')} data-testid="login-btn">
        Login
      </button>
      <button onClick={logout} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with unauthenticated state', async () => {
    renderWithRouter(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });
    
    expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
  });

  it('should restore authentication state from localStorage', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin' as const
    };

    mockLocalStorage.getItem.mockReturnValue('mock-token');
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

    renderWithRouter(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
    });
    
    expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    expect(screen.getByTestId('has-admin-role')).toHaveTextContent('Has Admin');
  });

  it('should handle login successfully', async () => {
    const mockLoginResponse = {
      success: true,
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'student' as const
      },
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token'
    };

    mockAuthService.login.mockResolvedValue(mockLoginResponse);

    renderWithRouter(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
    });
    
    expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'mock-access-token');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refreshToken', 'mock-refresh-token');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('should redirect admin users to admin dashboard', async () => {
    const mockLoginResponse = {
      success: true,
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin' as const
      },
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token'
    };

    mockAuthService.login.mockResolvedValue(mockLoginResponse);

    renderWithRouter(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('should handle logout', async () => {
    // First set up authenticated state
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'student' as const
    };

    mockLocalStorage.getItem.mockReturnValue('mock-token');
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

    renderWithRouter(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
    });

    // Now test logout
    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should handle role checking correctly', async () => {
    const mockUser = {
      id: 1,
      username: 'teacher',
      email: 'teacher@example.com',
      role: 'teacher' as const
    };

    mockLocalStorage.getItem.mockReturnValue('mock-token');
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

    renderWithRouter(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
    });
    
    expect(screen.getByTestId('has-admin-role')).toHaveTextContent('No Admin');
  });

  it('should handle authentication check failure', async () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-token');
    mockAuthService.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));

    renderWithRouter(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });
    
    expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken');
  });
});
