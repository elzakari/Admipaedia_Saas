import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StatisticsGrid from '../StatisticsGrid';

// Mock the hooks and services
const mockUseEnhancedStatistics = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/useEnhancedDashboardData', () => ({
  useEnhancedStatistics: mockUseEnhancedStatistics
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => children
}));

describe('StatisticsGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnhancedStatistics.mockReturnValue({
      statistics: [
        {
          id: 'total-students',
          title: 'Total Students',
          value: 1250,
          change: { value: 5.2, isPositive: true },
          icon: 'Users',
          color: 'primary',
          description: 'Students enrolled'
        },
        {
          id: 'total-teachers',
          title: 'Total Teachers',
          value: 85,
          change: { value: 2.1, isPositive: false },
          icon: 'UserCheck',
          color: 'success',
          description: 'Active teachers'
        }
      ],
      isLoading: false,
      isError: null,
      isValidating: false,
      refresh: vi.fn()
    });
  });

  it('renders statistics cards correctly', () => {
    render(<StatisticsGrid />);
    
    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('1250')).toBeInTheDocument();
    expect(screen.getByText('Total Teachers')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('displays trend indicators correctly', () => {
    render(<StatisticsGrid />);
    
    // Check for trend indicators
    expect(screen.getByText('5.2%')).toBeInTheDocument();
    expect(screen.getByText('2.1%')).toBeInTheDocument();
  });

  it('handles error states gracefully', () => {
    // Mock error state
    mockUseEnhancedStatistics.mockReturnValue({
      statistics: [],
      isLoading: false,
      isError: new Error('Failed to load statistics'),
      isValidating: false,
      refresh: vi.fn()
    });

    render(<StatisticsGrid />);
    
    expect(screen.getByRole('heading', { name: /Failed to Load Statistics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('shows loading state', () => {
    // Mock loading state
    mockUseEnhancedStatistics.mockReturnValue({
      statistics: [],
      isLoading: true,
      isError: null,
      isValidating: true,
      refresh: vi.fn()
    });

    render(<StatisticsGrid />);
    
    expect(screen.getByRole('button', { name: /common\.loading/i })).toBeDisabled();
  });

  it('handles refresh functionality', () => {
    const mockRefresh = vi.fn();
    mockUseEnhancedStatistics.mockReturnValue({
      statistics: [],
      isLoading: false,
      isError: null,
      isValidating: false,
      refresh: mockRefresh
    });

    render(<StatisticsGrid />);
    
    const refreshButton = screen.getByRole('button', { name: /common\.refresh/i });
    fireEvent.click(refreshButton);
    
    expect(mockRefresh).toHaveBeenCalled();
  });
});
