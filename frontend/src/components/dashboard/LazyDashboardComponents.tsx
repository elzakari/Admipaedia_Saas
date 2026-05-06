import React, { Suspense, lazy } from 'react';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { ErrorBoundary } from 'react-error-boundary';

// Lazy load dashboard components
const StatisticsGrid = lazy(() => import('./StatisticsGrid'));
const CalendarWidget = lazy(() => import('./CalendarWidget'));
const NotificationList = lazy(() => import('./NotificationList'));
const AdvancedAnalyticsWidget = lazy(() => import('./AdvancedAnalyticsWidget'));
const EnhancedRealTimeWidget = lazy(() => import('./EnhancedRealTimeWidget'));
const PerformanceDashboardWidget = lazy(() => import('./PerformanceDashboardWidget'));

// Loading skeletons for different components
const StatisticsGridSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {[...Array(4)].map((_, i) => (
      <Card key={i} className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        <div className="mt-4">
          <Skeleton className="h-3 w-24" />
        </div>
      </Card>
    ))}
  </div>
);

const CalendarWidgetSkeleton = () => (
  <Card className="p-6">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {[...Array(35)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-8" />
        ))}
      </div>
    </div>
  </Card>
);

const NotificationListSkeleton = () => (
  <Card className="p-6">
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start space-x-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const AnalyticsWidgetSkeleton = () => (
  <Card className="p-6">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex space-x-4 mb-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-20" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  </Card>
);

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <Card className="p-6 border-red-200">
    <div className="text-center space-y-4">
      <div className="text-red-600">
        <h3 className="text-lg font-semibold">Something went wrong</h3>
        <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      </div>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  </Card>
);

// Lazy component wrappers with error boundaries
export const LazyStatisticsGrid = (props: any) => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Suspense fallback={<StatisticsGridSkeleton />}>
      <StatisticsGrid {...props} />
    </Suspense>
  </ErrorBoundary>
);

export const LazyCalendarWidget = (props: any) => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Suspense fallback={<CalendarWidgetSkeleton />}>
      <CalendarWidget {...props} />
    </Suspense>
  </ErrorBoundary>
);

export const LazyNotificationList = (props: any) => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Suspense fallback={<NotificationListSkeleton />}>
      <NotificationList {...props} />
    </Suspense>
  </ErrorBoundary>
);

export const LazyAdvancedAnalyticsWidget = (props: any) => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Suspense fallback={<AnalyticsWidgetSkeleton />}>
      <AdvancedAnalyticsWidget {...props} />
    </Suspense>
  </ErrorBoundary>
);

export const LazyEnhancedRealTimeWidget = (props: any) => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Suspense fallback={<AnalyticsWidgetSkeleton />}>
      <EnhancedRealTimeWidget {...props} />
    </Suspense>
  </ErrorBoundary>
);

export const LazyPerformanceDashboardWidget = (props: any) => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Suspense fallback={<AnalyticsWidgetSkeleton />}>
      <PerformanceDashboardWidget {...props} />
    </Suspense>
  </ErrorBoundary>
);