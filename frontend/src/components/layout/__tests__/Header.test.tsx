import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '../../../utils/testUtils';
import Header from '../Header';

// Mock child components to isolate the Header
vi.mock('../../common/ThemeToggle', () => ({
  default: () => <div data-testid="theme-toggle" />
}));

vi.mock('../../common/LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher" />
}));

describe('Header Component', () => {
  it('renders the header title with correct link', () => {
    render(<Header />);
    const link = screen.getByText('ADMIPEDIA');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('renders the theme toggle and language switcher', () => {
    render(<Header />);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
  });

  it('renders settings and profile links', () => {
    render(<Header />);
    const settingsLinks = screen.getAllByRole('link');
    expect(settingsLinks.some(link => link.getAttribute('href') === '/settings')).toBe(true);
    expect(settingsLinks.some(link => link.getAttribute('href') === '/profile')).toBe(true);
  });
});
