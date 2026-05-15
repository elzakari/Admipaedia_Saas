import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../../utils/testUtils';
import Sidebar from '../Sidebar';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useEntitlements } from '../../../hooks/useEntitlements';
import { useSaasTenant } from '../../../hooks/useSaasTenant';

// Mock contexts and hooks - using exactly the import paths the component uses!
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: vi.fn(),
  ThemeProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/hooks/useEntitlements', () => ({
  useEntitlements: vi.fn(),
}));

vi.mock('@/hooks/useSaasTenant', () => ({
  useSaasTenant: vi.fn(),
}));

// Provide these module mocks using both absolute and alias paths just in case
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));
vi.mock('../../../contexts/ThemeContext', () => ({
  useTheme: vi.fn(),
  ThemeProvider: ({ children }: any) => <>{children}</>,
}));
vi.mock('../../../hooks/useEntitlements', () => ({
  useEntitlements: vi.fn(),
}));
vi.mock('../../../hooks/useSaasTenant', () => ({
  useSaasTenant: vi.fn(),
}));


// Mock ResizeObserver for framer-motion/recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin' },
      logout: vi.fn(),
    } as any);

    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      toggleTheme: vi.fn(),
    } as any);

    vi.mocked(useEntitlements).mockReturnValue({
      hasFeature: () => true, // allow all features for testing
      isLoading: false,
    } as any);

    vi.mocked(useSaasTenant).mockReturnValue({
      current: {
        tenant: { name: 'Test School', slug: 'testschool', logo_url: '' }
      }
    } as any);
  });

  it('renders sidebar with navigation items', () => {
    render(<Sidebar isOpen={true} toggleSidebar={vi.fn()} />);
    
    // Check for standard admin links
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('Teachers')).toBeInTheDocument();
  });

  it('shows tenant name as brand title', () => {
    render(<Sidebar isOpen={true} toggleSidebar={vi.fn()} />);
    expect(screen.getByText('TESTSCHOOL')).toBeInTheDocument();
  });

  it('shows ADMIPEDIA as brand title for super_admin', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { role: 'super_admin' }, logout: vi.fn() } as any);

    render(<Sidebar isOpen={true} toggleSidebar={vi.fn()} />);
    expect(screen.getByText('ADMIPEDIA')).toBeInTheDocument();
    expect(screen.getByText('Schools')).toBeInTheDocument();
  });

  it('renders system online status', () => {
    render(<Sidebar isOpen={true} toggleSidebar={vi.fn()} />);
    expect(screen.getAllByText('System Online')[0]).toBeInTheDocument();
  });
});
