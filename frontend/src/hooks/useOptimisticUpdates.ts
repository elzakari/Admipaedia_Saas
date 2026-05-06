import { useQueryClient } from '@tanstack/react-query';
import { useEnhancedOfflineSync } from './useEnhancedOfflineSync';
import { queryKeys } from '../lib/queryClient';

interface OptimisticUpdateConfig<T> {
  queryKey: readonly any[];
  updateFn: (oldData: T | undefined, newData: any) => T;
  rollbackFn?: (oldData: T | undefined, error: any) => T;
  onSuccess?: (data: T) => void;
  onError?: (error: any, rollbackData: T) => void;
}

export const useOptimisticUpdates = () => {
  const queryClient = useQueryClient();
  const { queueOperation, isOnline } = useEnhancedOfflineSync();

  const performOptimisticUpdate = async <T>(
    config: OptimisticUpdateConfig<T>,
    operation: {
      type: 'CREATE' | 'UPDATE' | 'DELETE';
      entity: 'teacher' | 'student' | 'class' | 'parent'; // Changed back to 'class' to match OfflineOperation
      entityId?: string;
      url: string;
      method: string;
      data?: any;
    }
  ) => {
    const { queryKey, updateFn, rollbackFn, onSuccess, onError } = config;
    
    // Store previous data for rollback
    const previousData = queryClient.getQueryData<T>(queryKey);
    
    // Perform optimistic update
    queryClient.setQueryData<T>(queryKey, (oldData) => 
      updateFn(oldData, operation.data)
    );
    
    try {
      if (isOnline) {
        // If online, make the request immediately
        const response = await fetch(operation.url, {
          method: operation.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: operation.data ? JSON.stringify(operation.data) : undefined,
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Update with server response
        queryClient.setQueryData<T>(queryKey, (oldData) => 
          updateFn(oldData, result)
        );
        
        onSuccess?.(result);
        return result;
      } else {
        // If offline, queue the operation
        await queueOperation({
          type: operation.type,
          entity: operation.entity, // Now matches the expected type
          entityId: operation.entityId,
          data: operation.data,
          url: operation.url,
          method: operation.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          maxRetries: 3,
        });
        
        return operation.data;
      }
    } catch (error) {
      // Rollback optimistic update
      if (rollbackFn && previousData !== undefined) {
        queryClient.setQueryData<T>(queryKey, rollbackFn(previousData, error));
      } else {
        queryClient.setQueryData<T>(queryKey, previousData);
      }
      
      onError?.(error, previousData as T);
      throw error;
    }
  };

  // Specific optimistic update functions
  const optimisticCreateTeacher = (teacherData: any) => {
    return performOptimisticUpdate({
      queryKey: [...queryKeys.teachers.all],
      updateFn: (oldData: any, newData: any) => {
        if (!oldData) return { data: [newData], total: 1 };
        return {
          ...oldData,
          data: [newData, ...oldData.data],
          total: oldData.total + 1,
        };
      },
    }, {
      type: 'CREATE',
      entity: 'teacher',
      url: '/api/v1/teachers',
      method: 'POST',
      data: teacherData,
    });
  };

  const optimisticUpdateTeacher = (teacherId: string, teacherData: any) => {
    return performOptimisticUpdate({
      queryKey: [...queryKeys.teachers.all],
      updateFn: (oldData: any, newData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: oldData.data.map((teacher: any) => 
            teacher.id === teacherId ? { ...teacher, ...newData } : teacher
          ),
        };
      },
    }, {
      type: 'UPDATE',
      entity: 'teacher',
      entityId: teacherId,
      url: `/api/v1/teachers/${teacherId}`,
      method: 'PUT',
      data: teacherData,
    });
  };

  const optimisticDeleteTeacher = (teacherId: string) => {
    return performOptimisticUpdate({
      queryKey: [...queryKeys.teachers.all],
      updateFn: (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: oldData.data.filter((teacher: any) => teacher.id !== teacherId),
          total: oldData.total - 1,
        };
      },
    }, {
      type: 'DELETE',
      entity: 'teacher',
      entityId: teacherId,
      url: `/api/v1/teachers/${teacherId}`,
      method: 'DELETE',
    });
  };

  return {
    performOptimisticUpdate,
    optimisticCreateTeacher,
    optimisticUpdateTeacher,
    optimisticDeleteTeacher,
  };
};