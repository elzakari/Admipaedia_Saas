import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardTester from '../DashboardTester';

// Mock all dashboard components
jest.mock('../StatisticsGrid', () => {
  return function MockStatisticsGrid() {
    return <div data-testid="statistics-grid">Statistics Grid Component</div>;
  };
});

jest.mock('../EnhancedDashboardFilters', () => {
  return function MockEnhancedDashboardFilters() {
    return <div data-testid="dashboard-filters">Dashboard Filters Component</div>;
  };
});

jest.mock('../EnhancedErrorBoundary', () => {
  return function MockEnhancedErrorBoundary({ children }: { children: React.ReactNode }) {
    return <div data-testid="error-boundary">{children}</div>;
  };
});

jest.mock('../PerformanceMonitor', () => {
  return function MockPerformanceMonitor() {
    return <div data-testid="performance-monitor">Performance Monitor Component</div>;
  };
});

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard tester with all test suites', () => {
    render(<DashboardTester />);
    
    expect(screen.getByText('Dashboard Component Tester')).toBeInTheDocument();
    expect(screen.getByText('Statistics Grid')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Filters')).toBeInTheDocument();
    expect(screen.getByText('Error Boundary')).toBeInTheDocument();
    expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
  });

  it('displays test statistics correctly', () => {
    render(<DashboardTester />);
    
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('can run individual test suites', async () => {
    render(<DashboardTester />);
    
    const runSuiteButtons = screen.getAllByText('Run Suite');
    expect(runSuiteButtons.length).toBeGreaterThan(0);
    fireEvent.click(runSuiteButtons[0]!);
    
    await waitFor(() => {
      expect(screen.getByText(/Running.../)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('can run all tests', async () => {
    render(<DashboardTester />);
    
    const runAllButton = screen.getByText('Run All Tests');
    fireEvent.click(runAllButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Running.../)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('can reset test results', () => {
    render(<DashboardTester />);
    
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);
    
    // All tests should be back to pending state
    expect(screen.getAllByText('pending')).toHaveLength(16); // 4 suites × 4 tests each
  });

  it('can export test report', () => {
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock document.createElement and appendChild
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn()
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);

    render(<DashboardTester />);
    
    const exportButton = screen.getByText('Export Report');
    fireEvent.click(exportButton);
    
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toContain('dashboard-test-report');
  });

  it('switches between test suite tabs', () => {
    render(<DashboardTester />);
    
    const dashboardFiltersTab = screen.getByRole('tab', { name: /dashboard filters/i });
    fireEvent.click(dashboardFiltersTab);
    
    expect(screen.getByText('Test advanced filtering and export functionality')).toBeInTheDocument();
  });

  it('shows component previews in each tab', () => {
    render(<DashboardTester />);
    
    // Check Statistics Grid tab
    expect(screen.getByTestId('statistics-grid')).toBeInTheDocument();
    
    // Switch to Dashboard Filters tab
    const dashboardFiltersTab = screen.getByRole('tab', { name: /dashboard filters/i });
    fireEvent.click(dashboardFiltersTab);
    
    expect(screen.getByTestId('dashboard-filters')).toBeInTheDocument();
  });

  it('handles test execution with proper status updates', async () => {
    render(<DashboardTester />);
    
    const runSuiteButtons = screen.getAllByText('Run Suite');
    expect(runSuiteButtons.length).toBeGreaterThan(0);
    fireEvent.click(runSuiteButtons[0]!);
    
    // Should show running status
    await waitFor(() => {
      expect(screen.getByText('running')).toBeInTheDocument();
    }, { timeout: 1000 });
    
    // Should eventually show completed status
    await waitFor(() => {
      expect(screen.getByText(/passed|failed/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});