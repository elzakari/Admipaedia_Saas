import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardTester from '../DashboardTester';

// Mock all dashboard components
vi.mock('../StatisticsGrid', () => {
  return {
    default: function MockStatisticsGrid() {
      return <div data-testid="statistics-grid">Statistics Grid Component</div>;
    }
  };
});

vi.mock('../EnhancedDashboardFilters', () => {
  return {
    default: function MockEnhancedDashboardFilters() {
      return <div data-testid="dashboard-filters">Dashboard Filters Component</div>;
    }
  };
});

vi.mock('../EnhancedErrorBoundary', () => {
  return {
    default: function MockEnhancedErrorBoundary({ children }: { children: React.ReactNode }) {
      return <div data-testid="error-boundary">{children}</div>;
    }
  };
});

vi.mock('../PerformanceMonitor', () => {
  return {
    default: function MockPerformanceMonitor() {
      return <div data-testid="performance-monitor">Performance Monitor Component</div>;
    }
  };
});

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders dashboard tester with all test suites', () => {
    render(<DashboardTester />);
    
    expect(screen.getByText('Dashboard Component Tester')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Statistics Grid' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Dashboard Filters' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Error Boundary' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Performance Monitor' })).toBeInTheDocument();
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
      expect(screen.getByText(/Running:/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('can run all tests', async () => {
    render(<DashboardTester />);
    
    const runAllButton = screen.getByText('Run All Tests');
    fireEvent.click(runAllButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Running...' })).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('can reset test results', () => {
    render(<DashboardTester />);
    
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);
    
    // All tests should be back to pending state
    expect(screen.getAllByText('pending')).toHaveLength(5);
  });

  it('can export test report', () => {
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    const originalCreateElement = document.createElement.bind(document);
    const mockAnchor = originalCreateElement('a');
    const clickSpy = vi.spyOn(mockAnchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: any, options?: any) => {
      if (tagName === 'a') return mockAnchor as any;
      return originalCreateElement(tagName, options as any);
    }) as any);

    render(<DashboardTester />);
    
    const exportButton = screen.getByText('Export Report');
    fireEvent.click(exportButton);
    
    expect(clickSpy).toHaveBeenCalled();
    expect(mockAnchor.download).toContain('dashboard-test-report');
  });

  it('switches between test suite tabs', async () => {
    render(<DashboardTester />);
    
    const user = userEvent.setup();
    const dashboardFiltersTab = await screen.findByRole('tab', { name: /dashboard filters/i });
    await user.click(dashboardFiltersTab);
    
    await waitFor(() => {
      expect(screen.getByText('Test advanced filtering and export functionality')).toBeInTheDocument();
    });
  });

  it('shows component previews in each tab', async () => {
    render(<DashboardTester />);
    
    const user = userEvent.setup();
    // Check Statistics Grid tab
    expect(await screen.findByTestId('statistics-grid')).toBeInTheDocument();
    
    // Switch to Dashboard Filters tab
    const dashboardFiltersTab = await screen.findByRole('tab', { name: /dashboard filters/i });
    await user.click(dashboardFiltersTab);
    
    expect(await screen.findByTestId('dashboard-filters')).toBeInTheDocument();
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
