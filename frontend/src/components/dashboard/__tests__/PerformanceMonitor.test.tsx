import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PerformanceMonitor from '../PerformanceMonitor';

// Mock performance API
const mockPerformance = {
  now: () => Date.now(),
  getEntriesByType: vi.fn(),
  getEntriesByName: vi.fn(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024
  }
};

const mockNavigation = {
  loadEventEnd: 2000,
  fetchStart: 0,
  domContentLoadedEventEnd: 1500
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
});

Object.defineProperty(navigator, 'connection', {
  value: {
    downlink: 10,
    effectiveType: '4g'
  },
  writable: true
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Restore window.performance and navigator.connection
    Object.defineProperty(window, 'performance', {
      value: mockPerformance,
      writable: true
    });
    
    Object.defineProperty(navigator, 'connection', {
      value: {
        downlink: 10,
        effectiveType: '4g'
      },
      writable: true
    });

    mockPerformance.getEntriesByType.mockImplementation((type) => {
      if (type === 'navigation') return [mockNavigation];
      if (type === 'resource') return [];
      return [];
    });
    mockPerformance.getEntriesByName.mockReturnValue([{ startTime: 1800 }]);
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders performance monitor correctly', async () => {
    render(<PerformanceMonitor />);
    
    expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
    expect(screen.getByText(/Score:/)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Page Load Time')).toBeInTheDocument();
    });
  });

  it('collects and displays performance metrics', async () => {
    render(<PerformanceMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Page Load Time')).toBeInTheDocument();
      expect(screen.getByText('DOM Ready')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    });
  });

  it('handles monitoring toggle', () => {
    render(<PerformanceMonitor />);
    
    const monitorButton = screen.getByRole('button', { name: /monitoring/i });
    fireEvent.click(monitorButton);
    
    expect(screen.getByText(/paused/i)).toBeInTheDocument();
  });

  it('handles manual refresh', () => {
    render(<PerformanceMonitor />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    // Should trigger metrics collection
    expect(mockPerformance.getEntriesByType).toHaveBeenCalled();
  });

  it('calculates performance score correctly', async () => {
    render(<PerformanceMonitor />);
    
    await waitFor(() => {
      const scoreElement = screen.getByText(/Score: \d+\/100/);
      expect(scoreElement).toBeInTheDocument();
    });
  });

  it('shows performance recommendations for poor scores', async () => {
    // Mock poor performance metrics
    mockPerformance.getEntriesByType.mockImplementation((type) => {
      if (type === 'navigation') return [{
        ...mockNavigation,
        loadEventEnd: 8000, // Poor performance
        domContentLoadedEventEnd: 6000
      }];
      return [];
    });

    render(<PerformanceMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText(/Performance Tips:/)).toBeInTheDocument();
    });
  });

  it('handles browser compatibility gracefully', () => {
    // Mock unsupported browser
    Object.defineProperty(window, 'performance', {
      value: { ...mockPerformance, memory: undefined },
      writable: true
    });

    render(<PerformanceMonitor />);
    
    expect(screen.getByText(/Some performance metrics may not be available/)).toBeInTheDocument();
  });

  it('expands metric details on click', async () => {
    render(<PerformanceMonitor showTrends={true} refreshInterval={10} />);
    
    await waitFor(() => {
      expect(screen.getByText('Page Load Time')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Page Load Time'));
    
    // Should show trend chart
    await waitFor(() => {
      expect(screen.getByText(/Trend over last/)).toBeInTheDocument();
    });
  });
});
