import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  mobileLabel?: string;
  priority?: 'high' | 'medium' | 'low';
  width?: number;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor?: (item: T) => string;
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  threshold?: number;
}

export function VirtualizedTable<T>({
  data,
  columns,
  keyExtractor = (item: T) => {
    return (item as any).id?.toString() || Math.random().toString(36).substring(2, 9);
  },
  onRowClick,
  className,
  emptyMessage = "No data available",
  isLoading = false,
  itemHeight = 60,
  containerHeight = 400,
  overscan = 5,
  onLoadMore,
  hasMore = false,
  threshold = 10
}: VirtualizedTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1023px)');

  // Filter columns based on priority for different screen sizes
  const visibleColumns = useMemo(() => {
    return columns.filter(column => {
      if (isMobile) return column.priority !== 'low';
      if (isTablet) return column.priority !== 'low' || column.priority === undefined;
      return true;
    });
  }, [columns, isMobile, isTablet]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(data.length, start + visibleCount + overscan * 2);
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, data.length]);

  // Handle scroll events
  const handleScroll = useCallback(async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);

    // Check if we need to load more data
    if (hasMore && onLoadMore && !isLoadingMore) {
      const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (scrollBottom < threshold * itemHeight) {
        setIsLoadingMore(true);
        try {
          await onLoadMore();
        } finally {
          setIsLoadingMore(false);
        }
      }
    }
  }, [hasMore, onLoadMore, isLoadingMore, threshold, itemHeight]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return data.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }));
  }, [data, visibleRange]);

  // Loading skeleton
  if (isLoading && data.length === 0) {
    return (
      <div className={cn("w-full overflow-hidden rounded-lg", className)}>
        {isMobile ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="animate-pulse">
            <div className="flex border-b bg-gray-50 dark:bg-gray-800">
              {visibleColumns.map((_, index) => (
                <div key={index} className="flex-1 p-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex border-b">
                {visibleColumns.map((_, colIndex) => (
                  <div key={colIndex} className="flex-1 p-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={cn("w-full overflow-hidden rounded-lg", className)}>
        <div className="flex justify-center items-center p-8 text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </div>
      </div>
    );
  }

  // Mobile card view with virtualization
  if (isMobile) {
    return (
      <div className={cn("w-full", className)}>
        <div
          ref={containerRef}
          className="overflow-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
          style={{ height: containerHeight }}
          onScroll={handleScroll}
        >
          <div style={{ height: data.length * (itemHeight + 16), position: 'relative' }}>
            <div
              style={{
                transform: `translateY(${visibleRange.start * (itemHeight + 16)}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0
              }}
            >
              {visibleItems.map(({ item, index }) => (
                <div
                  key={keyExtractor(item)}
                  className="p-2"
                  style={{ height: itemHeight + 16 }}
                >
                  <div
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer h-full"
                    onClick={() => onRowClick?.(item)}
                    role={onRowClick ? "button" : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                  >
                    {visibleColumns.map((column, colIndex) => {
                      const value = typeof column.accessor === 'function'
                        ? column.accessor(item)
                        : item[column.accessor as keyof T];

                      return (
                        <div key={colIndex} className="flex justify-between py-1 border-b last:border-0 dark:border-gray-700">
                          <span className="font-medium text-sm text-gray-500 dark:text-gray-400">
                            {column.mobileLabel || column.header}
                          </span>
                          <span className={cn("text-right", column.className)}>
                            {value as React.ReactNode}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {isLoadingMore && (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop/tablet table view with virtualization
  return (
    <div className={cn("w-full overflow-hidden rounded-lg", className)}>
      {/* Table Header */}
      <div className="flex border-b bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
        {visibleColumns.map((column, index) => (
          <div
            key={index}
            className="flex-1 p-4 font-medium text-gray-500 dark:text-gray-400"
            style={{ minWidth: column.width || 'auto' }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={containerRef}
        className="overflow-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div style={{ height: data.length * itemHeight, position: 'relative' }}>
          <div
            style={{
              transform: `translateY(${visibleRange.start * itemHeight}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0
            }}
          >
            {visibleItems.map(({ item, index }) => (
              <div
                key={keyExtractor(item)}
                className="flex border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                style={{ height: itemHeight }}
                onClick={() => onRowClick?.(item)}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {visibleColumns.map((column, colIndex) => {
                  const value = typeof column.accessor === 'function'
                    ? column.accessor(item)
                    : item[column.accessor as keyof T];

                  return (
                    <div
                      key={colIndex}
                      className={cn("flex-1 p-4 flex items-center", column.className)}
                      style={{ minWidth: column.width || 'auto' }}
                    >
                      {value as React.ReactNode}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {isLoadingMore && (
          <div className="p-4 text-center border-t">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
}