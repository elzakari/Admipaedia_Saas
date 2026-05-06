/**
 * Performance optimization utilities for ADMIPAEDIA
 */

import { debounce, throttle } from 'lodash';
import React from 'react';

// Intersection Observer for lazy loading
export class LazyLoadObserver {
  private observer: IntersectionObserver;
  private callbacks: Map<Element, () => void> = new Map();

  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const callback = this.callbacks.get(entry.target);
          if (callback) {
            callback();
            this.unobserve(entry.target);
          }
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    });
  }

  observe(element: Element, callback: () => void) {
    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }

  unobserve(element: Element) {
    this.callbacks.delete(element);
    this.observer.unobserve(element);
  }

  disconnect() {
    this.observer.disconnect();
    this.callbacks.clear();
  }
}

// Image lazy loading utility
export const createLazyImage = (src: string, placeholder?: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
    
    // Set placeholder while loading
    if (placeholder) {
      img.style.backgroundImage = `url(${placeholder})`;
      img.style.backgroundSize = 'cover';
      img.style.backgroundPosition = 'center';
    }
  });
};

// Virtual scrolling utility
export class VirtualScrollManager {
  private container: HTMLElement;
  private itemHeight: number;
  private visibleCount: number;
  private totalCount: number;
  private scrollTop: number = 0;
  private onRender: (startIndex: number, endIndex: number) => void;

  constructor(
    container: HTMLElement,
    itemHeight: number,
    visibleCount: number,
    totalCount: number,
    onRender: (startIndex: number, endIndex: number) => void
  ) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.visibleCount = visibleCount;
    this.totalCount = totalCount;
    this.onRender = onRender;

    this.setupScrollListener();
  }

  private setupScrollListener() {
    const handleScroll = throttle(() => {
      this.scrollTop = this.container.scrollTop;
      this.updateVisibleRange();
    }, 16); // ~60fps

    this.container.addEventListener('scroll', handleScroll);
  }

  private updateVisibleRange() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + this.visibleCount + 1,
      this.totalCount
    );

    this.onRender(startIndex, endIndex);
  }

  updateTotalCount(count: number) {
    this.totalCount = count;
    this.updateVisibleRange();
  }

  scrollToIndex(index: number) {
    const scrollTop = index * this.itemHeight;
    this.container.scrollTop = scrollTop;
  }
}

// Enhanced bundle splitting utilities
export const loadChunk = async (chunkName: string) => {
  try {
    // Use Vite ignore comment to suppress the warning for dynamic imports
    const module = await import(/* @vite-ignore */ `../pages/${chunkName}`);
    return module.default || module;
  } catch (error) {
    console.error(`Failed to load chunk: ${chunkName}`, error);
    throw error;
  }
};

// Route-based code splitting helper
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  const LazyComponent = React.lazy(importFn);
  
  // Return a simple component without forwardRef to avoid complex typing issues
  return (props: any) => {
    const FallbackComponent = fallback || (() => React.createElement('div', {}, 'Loading...'));
    
    return React.createElement(
      React.Suspense,
      { fallback: React.createElement(FallbackComponent) },
      React.createElement(LazyComponent, props)
    );
  };
};

// Performance monitoring for lazy-loaded components
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    const startTime = React.useRef<number>();

    React.useEffect(() => {
      startTime.current = performance.now();
      
      return () => {
        if (startTime.current) {
          const endTime = performance.now();
          const duration = endTime - startTime.current;
          
          // Log performance metrics
          if (duration > 100) {
            console.warn(`Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
          }
          
          // Send to analytics if available
          if ((window as any).gtag) {
            (window as any).gtag('event', 'page_render_time', {
              event_category: 'Performance',
              event_label: componentName,
              value: Math.round(duration)
            });
          }
        }
      };
    }, []);

    return React.createElement(Component, props);
  });
};

// Preload critical routes based on user role
export const preloadCriticalRoutes = () => {
  // Preload dashboard components based on user role
  const userRole = localStorage.getItem('userRole');
  
  if (userRole) {
    switch (userRole) {
      case 'admin':
        import('../pages/dashboard/AdminDashboard').catch(console.error);
        import('../pages/students/StudentsPage').catch(console.error);
        import('../pages/teachers/TeachersPage').catch(console.error);
        break;
      case 'teacher':
        import('../pages/dashboard/TeacherDashboard').catch(console.error);
        import('../pages/students/StudentsPage').catch(console.error);
        import('../pages/academics/AcademicsPage').catch(console.error);
        break;
      case 'student':
        import('../pages/dashboard/StudentDashboard').catch(console.error);
        import('../pages/academics/AcademicsPage').catch(console.error);
        import('../pages/Library/LibraryPage').catch(console.error);
        break;
      case 'parent':
        import('../pages/dashboard/ParentDashboard').catch(console.error);
        import('../pages/students/StudentsPage').catch(console.error);
        import('../pages/Fees/FeesPage').catch(console.error);
        break;
    }
  }
};

// Resource hints for better loading
export const addResourceHints = () => {
  const head = document.head;
  
  // Preconnect to API endpoints
  const preconnectAPI = document.createElement('link');
  preconnectAPI.rel = 'preconnect';
  preconnectAPI.href = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  head.appendChild(preconnectAPI);
  
  // DNS prefetch for external resources
  const dnsPrefetch = document.createElement('link');
  dnsPrefetch.rel = 'dns-prefetch';
  dnsPrefetch.href = '//fonts.googleapis.com';
  head.appendChild(dnsPrefetch);
};

// Initialize performance optimizations
export const initializePerformanceOptimizations = () => {
  // Add resource hints
  addResourceHints();
  
  // Preload critical routes after initial load
  setTimeout(preloadCriticalRoutes, 1000);
  
  // Enable performance observer if available
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          console.log('Navigation timing:', entry);
        }
      }
    });
    
    observer.observe({ entryTypes: ['navigation', 'resource'] });
  }
};

// Memory management utilities
export class MemoryManager {
  private static instance: MemoryManager;
  private cache: Map<string, any> = new Map();
  private maxCacheSize: number = 100;

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  set(key: string, value: any, ttl?: number) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    const entry = {
      value,
      timestamp: Date.now(),
      ttl: ttl ? Date.now() + ttl : null
    };

    this.cache.set(key, entry);
  }

  get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (entry.ttl && Date.now() > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static startMeasure(name: string) {
    performance.mark(`${name}-start`);
  }

  static endMeasure(name: string) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name, 'measure')[0];
    if (measure) {
      const existing = this.metrics.get(name) || [];
      existing.push(measure.duration);
      this.metrics.set(name, existing);
      
      // Keep only last 100 measurements
      if (existing.length > 100) {
        existing.shift();
      }
    }
  }

  static getMetrics(name: string) {
    const measurements = this.metrics.get(name) || [];
    if (measurements.length === 0) return null;

    const sum = measurements.reduce((a, b) => a + b, 0);
    const avg = sum / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return { avg, min, max, count: measurements.length };
  }

  static getAllMetrics() {
    const result: Record<string, any> = {};
    this.metrics.forEach((_measurements, name) => {
      result[name] = this.getMetrics(name);
    });
    return result;
  }

  static clearMetrics() {
    this.metrics.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Debounced search utility
export const createDebouncedSearch = (
  searchFn: (query: string) => Promise<any>,
  delay: number = 300
) => {
  return debounce(searchFn, delay);
};

// Throttled scroll handler
export const createThrottledScrollHandler = (
  handler: (event: Event) => void,
  delay: number = 16
) => {
  return throttle(handler, delay);
};

// Resource preloading
export const preloadResource = (url: string, type: 'script' | 'style' | 'image' = 'script') => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    
    link.onload = resolve;
    link.onerror = reject;
    
    document.head.appendChild(link);
  });
};

// Critical resource loading
export const loadCriticalResources = async (resources: string[]) => {
  const promises = resources.map(url => preloadResource(url));
  return Promise.allSettled(promises);
};

// Web Worker utility
export const createWebWorker = (workerScript: string) => {
  return new Promise<Worker>((resolve, reject) => {
    try {
      const worker = new Worker(workerScript);
      worker.onmessage = (event) => {
        if (event.data.type === 'ready') {
          resolve(worker);
        }
      };
      worker.onerror = reject;
    } catch (error) {
      reject(error);
    }
  });
};

// Service Worker registration
export const registerServiceWorker = async (swPath: string = '/enhanced-sw.js') => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(swPath);
      console.log('Service Worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  } else {
    throw new Error('Service Workers not supported');
  }
};

export default {
  LazyLoadObserver,
  VirtualScrollManager,
  MemoryManager,
  PerformanceMonitor,
  createLazyImage,
  loadChunk,
  createLazyComponent,
  withPerformanceMonitoring,
  preloadCriticalRoutes,
  addResourceHints,
  initializePerformanceOptimizations,
  createDebouncedSearch,
  createThrottledScrollHandler,
  preloadResource,
  loadCriticalResources,
  createWebWorker,
  registerServiceWorker
};
