import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import teacherService from '../services/teacherService';
import { Teacher } from '../services/teacherService';
import { queryKeys, cacheUtils } from '../lib/queryClient';

// Define the response type for better typing
interface TeachersResponse {
  teachers: Teacher[];
  pagination: {
    current_page: number;
    total_pages: number;
    total: number;
    per_page: number;
  };
}

// Infinite query hook for teachers with cursor-based pagination
export const useInfiniteTeachers = (params?: {
  per_page?: number;
  status?: 'active' | 'inactive' | 'on_leave';
  specialization?: string;
  search?: string;
}) => {
  const { per_page = 20, ...filters } = params || {};

  return useInfiniteQuery<TeachersResponse, Error>({
    queryKey: queryKeys.teachers.list({ ...filters, infinite: true }),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await teacherService.getTeachers({
        ...filters,
        page: pageParam as number,
        per_page,
      });
      return response;
    },
    initialPageParam: 1, // Added missing initialPageParam
    getNextPageParam: (lastPage: TeachersResponse) => {
      const { current_page, total_pages } = lastPage.pagination;
      return current_page < total_pages ? current_page + 1 : undefined;
    },
    getPreviousPageParam: (firstPage: TeachersResponse) => {
      const { current_page } = firstPage.pagination;
      return current_page > 1 ? current_page - 1 : undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    maxPages: 10, // Limit cached pages to prevent memory issues
  });
};

// Hook for infinite scroll with automatic loading
export const useInfiniteTeachersWithAutoLoad = (params?: {
  per_page?: number;
  status?: 'active' | 'inactive' | 'on_leave';
  specialization?: string;
  search?: string;
  threshold?: number; // Distance from bottom to trigger load
}) => {
  const { threshold = 100, ...queryParams } = params || {};
  const query = useInfiniteTeachers(queryParams);

  // Auto-load next page when scrolling near bottom
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (
        distanceFromBottom < threshold &&
        query.hasNextPage &&
        !query.isFetchingNextPage
      ) {
        query.fetchNextPage();
      }
    },
    [query, threshold]
  );

  return {
    ...query,
    handleScroll,
    // Flatten all pages into single array
    allTeachers: query.data?.pages.flatMap((page: TeachersResponse) => page.teachers) || [],
    totalCount: query.data?.pages[0]?.pagination.total || 0,
  };
};

// Optimized bulk operations for teachers
export const useBulkTeacherOperations = () => {
  const queryClient = useQueryClient();

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({
      teacherIds,
      status,
    }: {
      teacherIds: number[];
      status: 'active' | 'inactive' | 'on_leave';
    }) => {
      // Perform bulk update (assuming API supports it)
      const promises = teacherIds.map(id =>
        teacherService.updateTeacherStatus(id, status)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      // Invalidate all teacher queries
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers.all });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async (teacherIds: number[]) => {
      const promises = teacherIds.map(id => teacherService.deleteTeacher(id));
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers.all });
    },
  });

  return {
    bulkUpdateStatus,
    bulkDelete,
  };
};

// Search with debouncing for better performance
export const useTeacherSearch = (initialParams?: {
  per_page?: number;
  status?: 'active' | 'inactive' | 'on_leave';
  specialization?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const query = useInfiniteTeachers({
    ...initialParams,
    search: debouncedSearch || undefined,
  });

  return {
    ...query,
    searchTerm,
    setSearchTerm,
    isSearching: searchTerm !== debouncedSearch,
  };
};