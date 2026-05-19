import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../utils/testUtils';
import AdminDashboard from '../components/AdminDashboard';
import dashboardService from '../services/dashboardService';
import { useStatistics, useCalendarEvents, useNotifications } from '../hooks/useDashboardData';
import { useDashboardStatistics, useAttendanceAnalytics } from '../hooks/useAnalytics';

// Mock the dashboard service
vi.mock('../services/dashboardService');

// Mock hooks
vi.mock('../hooks/useDashboardData', () => ({
  useStatistics: vi.fn(),
  useCalendarEvents: vi.fn(),
  useNotifications: vi.fn(),
}));

vi.mock('../hooks/useAnalytics', () => ({
  useDashboardStatistics: vi.fn(),
  useAttendanceAnalytics: vi.fn(),
  analyticsService: {
    getDashboardStatistics: vi.fn(),
  }
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const mockDashboardService = vi.mocked(dashboardService);

describe('AdminDashboard', () => {
  const mockRefreshStats = vi.fn();
  const mockRefetchAnalytics = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses to fix the specific TypeError requested by user
    mockDashboardService.getStatistics.mockResolvedValue([
      { id: '1', title: 'Total Students', value: '1,234', change: { value: 5, isPositive: true }, color: 'primary' },
      { id: '2', title: 'Total Teachers', value: '89', change: { value: 2, isPositive: true }, color: 'success' },
    ]);
    
    mockDashboardService.getCalendarEvents.mockResolvedValue([]);
    mockDashboardService.getNotifications.mockResolvedValue([]);

    // And actually mock the hooks that AdminDashboard uses
    vi.mocked(useStatistics).mockReturnValue({
      statistics: [
        { id: '1', title: 'Total Students', value: '1,234', change: { value: 5, isPositive: true }, color: 'primary' },
      ],
      isLoading: false,
      isError: null,
      mutate: mockRefreshStats,
    } as any);

    vi.mocked(useCalendarEvents).mockReturnValue({
      events: [],
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    } as any);

    vi.mocked(useNotifications).mockReturnValue({
      notifications: [],
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    } as any);

    vi.mocked(useDashboardStatistics).mockReturnValue({
      statistics: [],
      loading: false,
      error: null,
      refetch: mockRefetchAnalytics,
    } as any);

    vi.mocked(useAttendanceAnalytics).mockReturnValue({
      analytics: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  it('renders dashboard header', async () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    vi.mocked(useStatistics).mockReturnValue({ isLoading: true } as any);
    render(<AdminDashboard />);
    
    // Should show loading skeletons or loading indicators
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('loads and displays statistics', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      // It uses the hook now, we expect 1,234 from our mock hook (which may appear in both desktop and mobile views)
      expect(screen.getAllByText('1,234')[0]).toBeInTheDocument();
    });
  });

  it('handles refresh functionality', async () => {
    render(<AdminDashboard />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    if (refreshButton) {
      refreshButton.click();
      
      await waitFor(() => {
        // Now asserts against the hook mutator since the component doesn't call dashboardService directly
        expect(mockRefreshStats).toHaveBeenCalled();
        expect(mockRefetchAnalytics).toHaveBeenCalled();
      });
    }
  });
});