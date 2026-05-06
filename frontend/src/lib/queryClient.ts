import { QueryClient, DefaultOptions } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

// Enhanced default options for better performance
const queryConfig: DefaultOptions = {
  queries: {
    // Caching Strategy
    staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
    
    // Network Optimization
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnReconnect: 'always', // Refetch when reconnecting
    refetchOnMount: true, // Refetch on component mount
    
    // Retry Strategy
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Background Refetching
    refetchInterval: false, // Disable automatic background refetching by default
    refetchIntervalInBackground: false,
  },
  mutations: {
    // Global error handling for mutations
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'An error occurred';
      toast.error(message);
    },
    // Retry failed mutations once
    retry: 1,
  },
};

// Create optimized query client
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
  // Enable query deduplication
  queryCache: undefined, // Use default cache with deduplication
});

// Query key factories for consistent cache management
export const queryKeys = {
  // Students
  students: {
    all: ['students'] as const,
    lists: () => [...queryKeys.students.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.students.lists(), filters] as const,
    details: () => [...queryKeys.students.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.students.details(), id] as const,
    attendance: (id: number) => [...queryKeys.students.detail(id), 'attendance'] as const,
  },
  // Teachers
  teachers: {
    all: ['teachers'] as const,
    lists: () => [...queryKeys.teachers.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.teachers.lists(), filters] as const,
    details: () => [...queryKeys.teachers.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.teachers.details(), id] as const,
    classes: (id: number) => [...queryKeys.teachers.detail(id), 'classes'] as const,
    attendance: (id: number) => [...queryKeys.teachers.detail(id), 'attendance'] as const,
  },
  // Classes
  classes: {
    all: ['classes'] as const,
    lists: () => [...queryKeys.classes.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.classes.lists(), filters] as const,
    details: () => [...queryKeys.classes.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.classes.details(), id] as const,
    students: (id: number) => [...queryKeys.classes.detail(id), 'students'] as const,
  },
  // Parents
  parents: {
    all: ['parents'] as const,
    lists: () => [...queryKeys.parents.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.parents.lists(), filters] as const,
    details: () => [...queryKeys.parents.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.parents.details(), id] as const,
    children: (id: number) => [...queryKeys.parents.detail(id), 'children'] as const,
  },
  // Subjects
  subjects: {
    all: ['subjects'] as const,
    lists: () => [...queryKeys.subjects.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.subjects.lists(), filters] as const,
    details: () => [...queryKeys.subjects.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.subjects.details(), id] as const,
    byClass: (classId: number) => [...queryKeys.subjects.lists(), { classId }] as const,
  },
};

// Cache invalidation utilities
export const cacheUtils = {
  // Invalidate all related queries when data changes
  invalidateStudentData: (studentId?: number) => {
    if (studentId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(studentId) });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
  },
  
  invalidateTeacherData: (teacherId?: number) => {
    if (teacherId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers.detail(teacherId) });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.teachers.lists() });
  },
  
  invalidateClassData: (classId?: number) => {
    if (classId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classId) });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.classes.lists() });
  },
  
  // Prefetch commonly accessed data
  prefetchDashboardData: async () => {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: queryKeys.students.list({ page: 1, per_page: 10 }),
        staleTime: 2 * 60 * 1000, // 2 minutes for dashboard data
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.teachers.list({ page: 1, per_page: 10 }),
        staleTime: 2 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.classes.list({ page: 1, per_page: 10 }),
        staleTime: 2 * 60 * 1000,
      }),
    ]);
  },
};