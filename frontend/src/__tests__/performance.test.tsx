import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { renderWithProviders } from '../utils/testUtils';
import { performance } from 'perf_hooks';
import StudentsPage from '../pages/StudentsPage';
import TeachersPage from '../pages/TeachersPage';
import Dashboard from '../pages/Dashboard';

// Mock large datasets
const generateMockStudents = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `student-${i}`,
    name: `Student ${i}`,
    email: `student${i}@example.com`,
    class: `Grade ${Math.floor(i / 30) + 1}`,
    rollNumber: `S${String(i).padStart(3, '0')}`,
  }));
};

// Mock performance APIs
Object.defineProperty(window, 'performance', {
  value: {
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    now: jest.fn(() => Date.now()),
  },
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Simple test component for performance testing
const TestComponent: React.FC = () => {
  return (
    <div data-testid="test-component">
      <h1>Performance Test Component</h1>
      <p>This component is used for performance testing.</p>
    </div>
  );
};

describe('Performance Tests', () => {
  it('renders large student list within acceptable time', async () => {
    const mockStudents = generateMockStudents(1000);
    
    // Mock the API response
    jest.spyOn(require('../services/studentService'), 'getStudents')
      .mockResolvedValue({
        students: mockStudents,
        pagination: { total: 1000, page: 1, pages: 34 }
      });
    
    const startTime = performance.now();
    render(<StudentsPage />);
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(1000); // Should render within 1 second
  });

  it('handles rapid state updates efficiently', async () => {
    const { rerender } = render(<Dashboard />);
    
    const startTime = performance.now();
    
    // Simulate rapid re-renders
    for (let i = 0; i < 100; i++) {
      rerender(<Dashboard key={i} />);
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(totalTime).toBeLessThan(500); // Should handle 100 re-renders within 500ms
  });

  it('should render components without performance issues', () => {
    const startTime = performance.now();
    
    renderWithProviders(<TestComponent />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(renderTime).toBeLessThan(100); // Should render in less than 100ms
  });

  it('should handle large lists efficiently', () => {
    const LargeListComponent = () => (
      <div data-testid="large-list">
        {Array.from({ length: 1000 }, (_, i) => (
          <div key={i} data-testid={`item-${i}`}>
            Item {i}
          </div>
        ))}
      </div>
    );

    const startTime = performance.now();
    renderWithProviders(<LargeListComponent />);
    const endTime = performance.now();
    
    expect(screen.getByTestId('large-list')).toBeInTheDocument();
    expect(endTime - startTime).toBeLessThan(500); // Should render in less than 500ms
  });

  it('should measure component mount time', () => {
    const mockMark = jest.spyOn(performance, 'mark');
    const mockMeasure = jest.spyOn(performance, 'measure');
    
    renderWithProviders(<TestComponent />);
    
    // Verify performance marks were called (if implemented in components)
    expect(mockMark).toHaveBeenCalled();
  });
});