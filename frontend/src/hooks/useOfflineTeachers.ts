import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnhancedOfflineSync } from './useEnhancedOfflineSync';
import { useOptimisticUpdates } from './useOptimisticUpdates';
import { queryKeys } from '../lib/queryClient';
import teacherService, { Teacher } from '@/services/teacherService';

export const useOfflineTeachers = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  subject?: string;
}) => {
  const { isOnline, getCachedData, cacheData } = useEnhancedOfflineSync();
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: queryKeys.teachers.list(params),
    queryFn: async () => {
      if (isOnline) {
        const data = await teacherService.getTeachers(params);
        // Cache the data for offline use
        await cacheData(
          `teachers_${JSON.stringify(params)}`,
          data,
          'teacher',
          30 * 60 * 1000 // 30 minutes
        );
        return data;
      } else {
        // Try to get cached data when offline
        const cachedData = await getCachedData(`teachers_${JSON.stringify(params)}`);
        if (cachedData) {
          return cachedData;
        }
        throw new Error('No cached data available offline');
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (!isOnline) return false;
      return failureCount < 3;
    },
  });
};

export const useOfflineTeacherMutations = () => {
  const {
    optimisticCreateTeacher,
    optimisticUpdateTeacher,
    optimisticDeleteTeacher,
  } = useOptimisticUpdates();
  
  const createTeacher = useMutation({
    mutationFn: optimisticCreateTeacher,
    onSuccess: () => {
      // Additional success handling if needed
    },
    onError: (error) => {
      console.error('Failed to create teacher:', error);
    },
  });
  
  const updateTeacher = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      optimisticUpdateTeacher(id, data),
    onSuccess: () => {
      // Additional success handling if needed
    },
    onError: (error) => {
      console.error('Failed to update teacher:', error);
    },
  });
  
  const deleteTeacher = useMutation({
    mutationFn: optimisticDeleteTeacher,
    onSuccess: () => {
      // Additional success handling if needed
    },
    onError: (error) => {
      console.error('Failed to delete teacher:', error);
    },
  });
  
  return {
    createTeacher,
    updateTeacher,
    deleteTeacher,
  };
};