import React from 'react';
import { log } from './logger';

// Utility for dynamic imports and code splitting
export const createAsyncComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  const LazyComponent = React.lazy(importFn);
  
  // Return a simple component using React.createElement instead of JSX
  return (props: React.ComponentProps<T>) => 
    React.createElement(
      React.Suspense,
      {
        fallback: fallback 
          ? React.createElement(fallback)
          : React.createElement('div', 
              { className: 'flex items-center justify-center p-8' },
              React.createElement('div', {
                className: 'animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent'
              })
            )
      },
      React.createElement(LazyComponent, props)
    );
};

// Preload critical routes
export const preloadRoute = (routeImport: () => Promise<any>) => {
  // Preload on idle or after a delay
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => routeImport());
  } else {
    setTimeout(() => routeImport(), 2000);
  }
};

// Tree-shake unused utilities
export const optimizeImports = () => {
  // This function helps identify unused imports during build
  // Use with webpack-bundle-analyzer to identify optimization opportunities
  
  log.info('Bundle optimization utilities loaded', {}, 'BundleOptimization');
};