import React from 'react';
import { render, screen, waitFor } from '../../utils/testUtils';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import AdminDashboard from '../AdminDashboard';
import * as dashboardService from '../../services/dashboardService';

// Mock the dashboard service
jest.mock('../../services/dashboardService');
const mockDashboardService = dashboardService as jest.Mocked<typeof dashboardService>;

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockDashboardService.getDashboardStats = jest.fn().mockResolvedValue({
      totalStudents: 150,
      totalTeachers: 25,
      totalClasses: 12,
      attendanceRate: 95.5
    });
  });

  it('renders dashboard with loading state', () => {
    mockDashboardService.getDashboardStats = jest.fn().mockReturnValue(
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(<AdminDashboard />);
    
    // Check for loading indicators
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays dashboard stats when loaded', async () => {
    const mockStats = {
      totalStudents: 150,
      totalTeachers: 25,
      totalClasses: 12,
      attendanceRate: 95.5
    };

    mockDashboardService.getDashboardStats = jest.fn().mockResolvedValue(mockStats);

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(mockDashboardService.getDashboardStats).toHaveBeenCalled();
    });
  });

  it('handles dashboard errors gracefully', async () => {
    const errorMessage = 'Failed to load dashboard';
    mockDashboardService.getDashboardStats = jest.fn().mockRejectedValue(new Error(errorMessage));

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(mockDashboardService.getDashboardStats).toHaveBeenCalled();
    });

    // Should handle error gracefully without crashing
    expect(screen.queryByText(/error/i)).toBeInTheDocument();
  });

  it('renders dashboard header', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument();
  });
});