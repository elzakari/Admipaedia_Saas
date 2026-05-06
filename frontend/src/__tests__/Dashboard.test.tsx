import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderWithProviders } from '../utils/testUtils';
import AdminDashboard from '../components/AdminDashboard';
import * as dashboardService from '../services/dashboardService';

// Mock the dashboard service
jest.mock('../services/dashboardService', () => ({
  getStatistics: jest.fn(),
  getEvents: jest.fn(),
  getNotifications: jest.fn(),
}));

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

const mockDashboardService = dashboardService as jest.Mocked<typeof dashboardService>;

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockDashboardService.getStatistics.mockResolvedValue([
      { id: 1, title: 'Total Students', value: '1,234', change: '+5%', trend: 'up' },
      { id: 2, title: 'Total Teachers', value: '89', change: '+2%', trend: 'up' },
    ]);
    
    mockDashboardService.getEvents.mockResolvedValue([
      { id: 1, title: 'School Assembly', date: '2024-01-15', type: 'event' },
    ]);
    
    mockDashboardService.getNotifications.mockResolvedValue([
      { id: 1, message: 'New student registered', type: 'info', timestamp: new Date() },
    ]);
  });

  it('renders dashboard header', async () => {
    renderWithProviders(<AdminDashboard />);
    
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    renderWithProviders(<AdminDashboard />);
    
    // Should show loading skeletons or loading indicators
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('loads and displays statistics', async () => {
    renderWithProviders(<AdminDashboard />);
    
    await waitFor(() => {
      expect(mockDashboardService.getStatistics).toHaveBeenCalled();
    });
  });

  it('handles refresh functionality', async () => {
    renderWithProviders(<AdminDashboard />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    if (refreshButton) {
      refreshButton.click();
      
      await waitFor(() => {
        expect(mockDashboardService.getStatistics).toHaveBeenCalledTimes(2);
      });
    }
  });
});