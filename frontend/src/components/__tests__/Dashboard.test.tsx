import React from 'react';
import { render, screen, waitFor } from '../../utils/testUtils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AdminDashboard from '../AdminDashboard';
import { useStatistics, useCalendarEvents, useNotifications } from '../../hooks/useDashboardData';
import { useDashboardStatistics, useAttendanceAnalytics } from '../../hooks/useAnalytics';

// Mock SWR hooks
vi.mock('../../hooks/useDashboardData', () => ({
  useStatistics: vi.fn(),
  useCalendarEvents: vi.fn(),
  useNotifications: vi.fn(),
}));

vi.mock('../../hooks/useAnalytics', () => ({
  useDashboardStatistics: vi.fn(),
  useAttendanceAnalytics: vi.fn(),
}));

vi.mock('../../services/analyticsService', () => ({
  analyticsService: {
    getDashboardStatistics: vi.fn().mockResolvedValue([]),
    getTeacherAnalytics: vi.fn().mockResolvedValue(null),
  },
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
vi.mock('recharts', () => {
  const React = require('react');
  const MockComponent = ({ children }: any) => React.createElement('div', null, children);
  return {
    ResponsiveContainer: MockComponent,
    LineChart: MockComponent,
    Line: MockComponent,
    AreaChart: MockComponent,
    Area: MockComponent,
    PieChart: MockComponent,
    Cell: MockComponent,
    XAxis: MockComponent,
    YAxis: MockComponent,
    CartesianGrid: MockComponent,
    Tooltip: MockComponent,
    Legend: MockComponent,
  };
});

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default hook implementations
    vi.mocked(useStatistics).mockReturnValue({
      statistics: [
        { id: '1', title: 'students', value: '150', color: 'primary' },
        { id: '2', title: 'teachers', value: '25', color: 'success' },
      ],
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    } as any);

    vi.mocked(useCalendarEvents).mockReturnValue({
      events: [],
      isLoading: false,
      isError: null,
    } as any);

    vi.mocked(useNotifications).mockReturnValue({
      notifications: [],
      isLoading: false,
      isError: null,
    } as any);

    vi.mocked(useDashboardStatistics).mockReturnValue({
      statistics: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useAttendanceAnalytics).mockReturnValue({
      analytics: [],
      loading: false,
      error: null,
    } as any);
  });

  it('renders dashboard with loading state', () => {
    vi.mocked(useStatistics).mockReturnValue({
      statistics: [],
      isLoading: true,
      isError: null,
      mutate: vi.fn(),
    } as any);

    render(<AdminDashboard />);
    
    // Check for loading indicators
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays dashboard stats when loaded', async () => {
    vi.mocked(useStatistics).mockReturnValue({
      statistics: [
        { id: '1', title: 'students', value: '150', color: 'primary' },
        { id: '2', title: 'teachers', value: '25', color: 'success' },
      ],
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    } as any);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('150').length).toBeGreaterThan(0);
      expect(screen.getAllByText('25').length).toBeGreaterThan(0);
    });
  });

  it('handles dashboard errors gracefully', async () => {
    vi.mocked(useStatistics).mockReturnValue({
      statistics: [],
      isLoading: false,
      isError: new Error('Failed to load stats'),
      mutate: vi.fn(),
    } as any);

    render(<AdminDashboard />);

    await waitFor(() => {
      // Should handle error gracefully without crashing
      expect(screen.queryByText(/error/i)).toBeInTheDocument();
    });
  });

  it('renders dashboard header', () => {
    vi.mocked(useStatistics).mockReturnValue({
      statistics: [],
      isLoading: false,
      isError: null,
      mutate: vi.fn(),
    } as any);

    render(<AdminDashboard />);
    
    expect(screen.getAllByText(/admin dashboard/i).length).toBeGreaterThan(0);
  });
});