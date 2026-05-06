import React, { Suspense, lazy, ComponentType } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Skeleton } from '../ui/skeleton';
import { Card } from '../ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

interface LazyLoadingWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
  className?: string;
}

// Default loading skeleton
const DefaultLoadingSkeleton = () => (
  <Card className="p-6">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  </Card>
);

// Default error fallback
const DefaultErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary
}) => (
  <Card className="p-6 text-center">
    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
    <p className="text-gray-600 mb-4">{error.message}</p>
    <Button onClick={resetErrorBoundary} variant="outline">
      <RefreshCw className="w-4 h-4 mr-2" />
      Try Again
    </Button>
  </Card>
);

export const LazyLoadingWrapper: React.FC<LazyLoadingWrapperProps> = ({
  children,
  fallback = <DefaultLoadingSkeleton />,
  errorFallback = DefaultErrorFallback,
  className = ''
}) => {
  return (
    <ErrorBoundary FallbackComponent={errorFallback}>
      <Suspense fallback={fallback}>
        <div className={className}>
          {children}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  loadingComponent?: React.ComponentType,
  errorComponent?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
) {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }));
  
  return (props: P) => (
    <LazyLoadingWrapper
      fallback={loadingComponent ? <loadingComponent /> : undefined}
      errorFallback={errorComponent}
    >
      <LazyComponent {...props} />
    </LazyLoadingWrapper>
  );
}

// Utility for creating lazy-loaded route components
export function createLazyRoute(importFn: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(importFn);
}

// Performance monitoring wrapper
export const PerformanceWrapper: React.FC<{
  children: React.ReactNode;
  componentName: string;
  onPerformanceData?: (data: { componentName: string; renderTime: number }) => void;
}> = ({ children, componentName, onPerformanceData }) => {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (onPerformanceData) {
        onPerformanceData({ componentName, renderTime });
      }
      
      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 100) {
        console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    };
  }, [componentName, onPerformanceData]);
  
  return <>{children}</>;
};

export default LazyLoadingWrapper;