import { useQuery, useMutation, useQueryClient, keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import teacherService from '../services/teacherService';
import { Teacher, TeacherCreate, TeacherUpdate } from '../services/teacherService';
import { queryKeys, cacheUtils } from '../lib/queryClient';

// Enhanced hook with background refetching and optimistic updates
export const useOptimizedTeachers = (params?: {
  page?: number;
  per_page?: number;
  status?: 'active' | 'inactive' | 'on_leave';
  specialization?: string;
  enableBackgroundRefetch?: boolean;
}) => {
  const { enableBackgroundRefetch = false, ...queryParams } = params || {};
  
  const query = useQuery({
    queryKey: [...queryKeys.teachers.list(queryParams)],
    queryFn: () => teacherService.getTeachers(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Enable background refetching for real-time data
    refetchInterval: enableBackgroundRefetch ? 30000 : false, // 30 seconds
    refetchIntervalInBackground: enableBackgroundRefetch,
  });
  
  // Prefetch next page for better UX
  const queryClient = useQueryClient();
  useEffect(() => {
    if (query.data?.pagination && queryParams.page) {
      const { current_page, total_pages } = query.data.pagination;
      const nextPage = current_page + 1;
      
      if (nextPage <= total_pages) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.teachers.list({ ...queryParams, page: nextPage }),
          queryFn: () => teacherService.getTeachers({ ...queryParams, page: nextPage }),
          staleTime: 2 * 60 * 1000, // 2 minutes for prefetched data
        });
      }
    }
  }, [query.data, queryParams, queryClient]);
  
  return query;
};

// Optimistic update mutation
export const useOptimisticUpdateTeacher = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TeacherUpdate }) => 
      teacherService.updateTeacher(id, data),
    
    // Optimistic update
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [...queryKeys.teachers.detail(id)] });
      
      // Snapshot previous value
      const previousTeacher = queryClient.getQueryData([...queryKeys.teachers.detail(id)]);
      
      // Optimistically update
      queryClient.setQueryData([...queryKeys.teachers.detail(id)], (old: Teacher | undefined) => {
        if (!old) return old;
        return { ...old, ...data };
      });
      
      return { previousTeacher };
    },
    
    // Revert on error
    onError: (err, variables, context) => {
      if (context?.previousTeacher) {
        queryClient.setQueryData(
          [...queryKeys.teachers.detail(variables.id)],
          context.previousTeacher
        );
      }
    },
    
    // Always refetch after success or error
    onSettled: (data, error, variables) => {
      cacheUtils.invalidateTeacherData(variables.id);
    },
  });
};

// Add infinite query support to existing hook
export const useOptimizedTeachersInfinite = (params?: {
  per_page?: number;
  status?: 'active' | 'inactive' | 'on_leave';
  specialization?: string;
  enableBackgroundRefetch?: boolean;
}) => {
  const { enableBackgroundRefetch = false, per_page = 20, ...filters } = params || {};

  return useInfiniteQuery({
    queryKey: [...queryKeys.teachers.list(filters), 'infinite'],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const response = await teacherService.getTeachers({
        ...filters,
        page: pageParam,
        per_page,
      });
      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const { current_page, total_pages } = lastPage.pagination;
      return current_page < total_pages ? current_page + 1 : undefined;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: enableBackgroundRefetch ? 30000 : false,
    refetchIntervalInBackground: enableBackgroundRefetch,
    maxPages: 10, // Prevent memory issues
  });
};