import React from 'react';
import { vi } from 'vitest';

(globalThis as any).jest = vi;

if (typeof performance === 'undefined') {
  (globalThis as any).performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => [],
    clearMarks: () => {},
    clearMeasures: () => {}
  };
}
if (typeof performance !== 'undefined' && typeof performance.now !== 'function') {
  (performance as any).now = () => Date.now();
}
if (typeof window !== 'undefined') {
  if (!(window as any).performance) {
    (window as any).performance = (globalThis as any).performance;
  }
  if (window.performance && typeof window.performance.now !== 'function') {
    (window.performance as any).now = () => Date.now();
  }
  if (typeof window.requestAnimationFrame !== 'function') {
    (window as any).requestAnimationFrame = (cb: any) => setTimeout(() => cb(Date.now()), 16);
  }
  if (typeof window.cancelAnimationFrame !== 'function') {
    (window as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
  }
  if (typeof window.matchMedia !== 'function') {
    (window as any).matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    });
  }
}

if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!(globalThis as any).IntersectionObserver) {
  (globalThis as any).IntersectionObserver = class IntersectionObserver {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(element: Element) {
      // Automatically trigger the intersection to simulate element coming into view
      this.callback([{ isIntersecting: true, target: element } as IntersectionObserverEntry], this);
    }
    unobserve() {}
    disconnect() {}
  };
}

vi.mock('recharts', async () => {
  const actual: any = await vi.importActual('recharts');
  return {
    ...actual,
    AreaChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'area-chart' }, children),
    Area: ({ dataKey }: any) => React.createElement('div', { 'data-testid': `area-${dataKey}` }),
    ComposedChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'composed-chart' }, children),
    LineChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'line-chart' }, children),
    Line: ({ dataKey }: any) => React.createElement('div', { 'data-testid': `line-${dataKey}` }),
    XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
    YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
    CartesianGrid: () => React.createElement('div', { 'data-testid': 'cartesian-grid' }),
    Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
    Legend: () => React.createElement('div', { 'data-testid': 'legend' }),
    ResponsiveContainer: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children)
  };
});
