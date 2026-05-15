import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../../utils/testUtils';
import ResponsiveLayout from '../ResponsiveLayout';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

// Mock useMediaQuery
vi.mock('../../../hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(),
}));

describe('ResponsiveLayout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children within main content area', () => {
    vi.mocked(useMediaQuery).mockReturnValue(true); // default to desktop

    render(
      <ResponsiveLayout>
        <div data-testid="main-child">Main Content</div>
      </ResponsiveLayout>
    );

    expect(screen.getByTestId('main-child')).toBeInTheDocument();
  });

  it('renders sidebar and header content when provided on desktop', () => {
    // For isDesktop
    vi.mocked(useMediaQuery).mockImplementation((query: string) => query === '(min-width: 1024px)');

    render(
      <ResponsiveLayout
        sidebarContent={<div data-testid="sidebar-content">Sidebar</div>}
        headerContent={<div data-testid="header-content">Header</div>}
        footerContent={<div data-testid="footer-content">Footer</div>}
      >
        <div>Content</div>
      </ResponsiveLayout>
    );

    expect(screen.getByTestId('sidebar-content')).toBeInTheDocument();
    expect(screen.getByTestId('header-content')).toBeInTheDocument();
    expect(screen.getByTestId('footer-content')).toBeInTheDocument();
  });

  it('renders mobile menu button when not desktop', () => {
    // For isMobile
    vi.mocked(useMediaQuery).mockImplementation((query: string) => query === '(max-width: 640px)');

    render(
      <ResponsiveLayout sidebarContent={<div>Sidebar</div>}>
        <div>Content</div>
      </ResponsiveLayout>
    );

    // The button that toggles sidebar should be visible
    const button = screen.getByLabelText('Toggle sidebar menu');
    expect(button).toBeInTheDocument();
  });
});
