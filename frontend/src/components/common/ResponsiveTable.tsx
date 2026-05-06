import React from 'react';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  mobileLabel?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface BulkAction {
  label: string;
  onClick: () => void;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor?: (item: T) => string;
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  loadingRows?: number;
  // Additional props used in StudentsPage
  selectedRows?: string[];
  onSelectRow?: (id: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  pagination?: PaginationProps;
  bulkActions?: BulkAction[];
}

export function ResponsiveTable<T>({ 
  data, 
  columns, 
  keyExtractor = (item: T) => {
    // Default implementation that tries to find an id property
    return (item as any).id?.toString() || Math.random().toString(36).substring(2, 9);
  }, 
  onRowClick, 
  className,
  emptyMessage = "No data available",
  isLoading = false,
  loadingRows = 5,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  pagination,
  bulkActions
}: ResponsiveTableProps<T>) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1023px)');
  
  // Filter columns based on priority for different screen sizes
  const visibleColumns = columns.filter(column => {
    if (isMobile) return column.priority !== 'low';
    if (isTablet) return column.priority !== 'low' || column.priority === undefined;
    return true;
  });

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn("w-full overflow-hidden rounded-lg", className)}>
        {isMobile ? (
          // Mobile loading skeleton
          <div className="space-y-4">
            {Array.from({ length: loadingRows }).map((_, index) => (
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
          // Desktop/tablet loading skeleton
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {visibleColumns.map((column, index) => (
                  <th key={index} className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: loadingRows }).map((_, index) => (
                <tr key={index} className="border-b animate-pulse">
                  {visibleColumns.map((_, colIndex) => (
                    <td key={colIndex} className="p-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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

  // Mobile card view
  if (isMobile) {
    return (
      <div className={cn("w-full space-y-4", className)}>
        {data.map(item => (
          <div 
            key={keyExtractor(item)} 
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            onClick={() => onRowClick?.(item)}
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
          >
            {visibleColumns.map((column, index) => {
              const value = typeof column.accessor === 'function' 
                ? column.accessor(item) 
                : item[column.accessor as keyof T];
                
              return (
                <div key={index} className="flex justify-between py-1 border-b last:border-0 dark:border-gray-700">
                  <span className="font-medium text-sm text-gray-500 dark:text-gray-400">
                    {column.mobileLabel || column.header}
                  </span>
                  <span className={cn("text-right", column.className)}>{value as React.ReactNode}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // Desktop/tablet table view
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {visibleColumns.map((column, index) => (
              <th 
                key={index} 
                className="text-left p-4 font-medium text-gray-500 dark:text-gray-400"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr 
              key={keyExtractor(item)} 
              className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              onClick={() => onRowClick?.(item)}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {visibleColumns.map((column, index) => {
                const value = typeof column.accessor === 'function' 
                  ? column.accessor(item) 
                  : item[column.accessor as keyof T];
                  
                return (
                  <td key={index} className={cn("p-4", column.className)}>
                    {value as React.ReactNode}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}