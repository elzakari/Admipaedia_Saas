import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

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
  it('should render components without performance issues', () => {
    const startTime = performance.now();

    render(<TestComponent />);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(renderTime).toBeLessThan(1000); // Should render in less than 1000ms
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
    render(<LargeListComponent />);
    const endTime = performance.now();

    expect(screen.getByTestId('large-list')).toBeInTheDocument();
    expect(endTime - startTime).toBeLessThan(2000); // Should render in less than 2s
  });

  it('should handle rapid re-renders efficiently', () => {
    const Counter = ({ count }: { count: number }) => (
      <div data-testid="counter">{count}</div>
    );

    const { rerender } = render(<Counter count={0} />);

    const startTime = performance.now();

    for (let i = 1; i <= 100; i++) {
      rerender(<Counter count={i} />);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    expect(screen.getByTestId('counter')).toHaveTextContent('100');
    expect(totalTime).toBeLessThan(1000); // 100 re-renders within 1s
  });

  it('generates and renders data lists within time budget', () => {
    const items = Array.from({ length: 500 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));

    const ListComponent = () => (
      <ul data-testid="data-list">
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    );

    const startTime = performance.now();
    render(<ListComponent />);
    const endTime = performance.now();

    expect(screen.getByTestId('data-list')).toBeInTheDocument();
    expect(endTime - startTime).toBeLessThan(1000);
  });
});