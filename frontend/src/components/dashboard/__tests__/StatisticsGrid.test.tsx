import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import StatisticsGrid from '../StatisticsGrid';

// Mock the hooks and services
jest.mock('../../../hooks/useEnhancedDashboardData', () => ({
  useEnhancedDashboardData: () => ({
    statistics: {
      data: [
        {
          id: 'total-students',
          title: 'Total Students',
          value: 1250,
          change: 5.2,
          trend: 'up',
          icon: 'Users',
          color: 'blue'
        },
        {
          id: 'total-teachers',
          title: 'Total Teachers',
          value: 85,
          change: -2.1,
          trend: 'down',
          icon: 'UserCheck',
          color: 'green'
        }
      ],
      isLoading: false,
      error: null
    },
    refreshData: jest.fn()
  })
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => children
}));

describe('StatisticsGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders statistics cards correctly', () => {
    render(<StatisticsGrid />);
    
    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('Total Teachers')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('displays trend indicators correctly', () => {
    render(<StatisticsGrid />);
    
    // Check for trend indicators
    expect(screen.getByText('5.2%')).toBeInTheDocument();
    expect(screen.getByText('-2.1%')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    render(<StatisticsGrid />);
    
    const firstCard = screen.getByRole('button', { name: /total students/i });
    firstCard.focus();
    
    expect(firstCard).toHaveFocus();
    
    // Test Enter key
    fireEvent.keyDown(firstCard, { key: 'Enter' });
    // Should open detailed view
  });

  it('supports screen reader accessibility', () => {
    render(<StatisticsGrid />);
    
    const cards = screen.getAllByRole('button');
    cards.forEach(card => {
      expect(card).toHaveAttribute('aria-label');
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  it('handles error states gracefully', () => {
    // Mock error state
    jest.mocked(require('../../../hooks/useEnhancedDashboardData').useEnhancedDashboardData)
      .mockReturnValue({
        statistics: {
          data: [],
          isLoading: false,
          error: 'Failed to load statistics'
        },
        refreshData: jest.fn()
      });

    render(<StatisticsGrid />);
    
    expect(screen.getByText(/failed to load statistics/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows loading state', () => {
    // Mock loading state
    jest.mocked(require('../../../hooks/useEnhancedDashboardData').useEnhancedDashboardData)
      .mockReturnValue({
        statistics: {
          data: [],
          isLoading: true,
          error: null
        },
        refreshData: jest.fn()
      });

    render(<StatisticsGrid />);
    
    expect(screen.getByText(/loading statistics/i)).toBeInTheDocument();
  });

  it('handles card visibility toggle', () => {
    render(<StatisticsGrid />);
    
    const visibilityButtons = screen.getAllByRole('button', { name: /toggle visibility/i });
    expect(visibilityButtons.length).toBeGreaterThan(0);
    fireEvent.click(visibilityButtons[0]!);
    
    // Card should be hidden or marked as hidden
    expect(visibilityButtons[0]!).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens detailed view on card click', async () => {
    render(<StatisticsGrid />);
    
    const card = screen.getByRole('button', { name: /total students/i });
    fireEvent.click(card);
    
    await waitFor(() => {
      expect(screen.getByText(/detailed view/i)).toBeInTheDocument();
    });
  });

  it('handles refresh functionality', () => {
    const mockRefresh = jest.fn();
    jest.mocked(require('../../../hooks/useEnhancedDashboardData').useEnhancedDashboardData)
      .mockReturnValue({
        statistics: {
          data: [],
          isLoading: false,
          error: null
        },
        refreshData: mockRefresh
      });

    render(<StatisticsGrid />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    expect(mockRefresh).toHaveBeenCalled();
  });
});