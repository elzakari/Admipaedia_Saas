import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../../utils/testUtils';
import Layout from '../Layout';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useHeader } from '../../../contexts/HeaderContext';
import { useMobileNavigation } from '../../../hooks/useMobileNavigation';
import { useResponsive } from '../../../hooks/useResponsive';

// Mock contexts and hooks
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
  }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../../contexts/ThemeContext', () => ({
  useTheme: vi.fn(),
  ThemeProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../../contexts/HeaderContext', () => ({
  useHeader: vi.fn(),
  HeaderProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../../hooks/useMobileNavigation', () => ({
  useMobileNavigation: vi.fn(),
}));

vi.mock('../../../hooks/useResponsive', () => ({
  useResponsive: vi.fn(),
}));

// Mock child components
vi.mock('../Footer', () => ({ default: () => <div data-testid="footer" /> }));
vi.mock('../Sidebar', () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock('../../common/LanguageSwitcher', () => ({ default: () => <div data-testid="language-switcher" /> }));
vi.mock('../../navigation/MobileBottomNavigation', () => ({ MobileBottomNavigation: () => <div data-testid="mobile-bottom-nav" /> }));

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', username: 'testadmin' },
      logout: vi.fn(),
    } as any);

    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
    } as any);

    vi.mocked(useHeader).mockReturnValue({
      headerSearch: null,
      headerActions: null,
      hideGlobalHeader: false,
    } as any);

    vi.mocked(useMobileNavigation).mockReturnValue({
      showBottomNav: false,
    } as any);

    vi.mocked(useResponsive).mockReturnValue({
      isMobile: false,
    } as any);
  });

  it('renders children within the layout', () => {
    render(
      <Layout>
        <div data-testid="child-content">Child Content</div>
      </Layout>
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('renders sidebar, header, and footer by default', () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
  });

  it('hides header when hideHeader prop is passed', () => {
    render(
      <Layout hideHeader>
        <div>Content</div>
      </Layout>
    );
    expect(screen.queryByTestId('language-switcher')).not.toBeInTheDocument();
  });

  it('shows username correctly', () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    expect(screen.getByText('testadmin')).toBeInTheDocument();
  });
});
