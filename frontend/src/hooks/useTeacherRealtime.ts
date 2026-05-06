import { useEffect } from 'react';
import { useWebSocket } from '../services/websocketService';
import { useQueryClient } from '@tanstack/react-query';
import { teacherKeys } from './useTeachers';

export const useTeacherRealtime = () => {
  const queryClient = useQueryClient();
  // Fix: Use only the namespace, not the full URL
  // Use only the namespace
  const { isConnected, error, subscribe } = useWebSocket('/ws/teachers');
  
  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to teacher updates
    const unsubscribeTeacherCreated = subscribe('teacher_created', (data) => {
      // Fix: Use object syntax with queryKey property
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    });

    const unsubscribeTeacherUpdated = subscribe('teacher_updated', (data) => {
      // Fix: Use object syntax with queryKey property
      queryClient.invalidateQueries({ queryKey: teacherKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    });

    const unsubscribeTeacherDeleted = subscribe('teacher_deleted', (data) => {
      // Fix: Use object syntax with queryKey property
      queryClient.invalidateQueries({ queryKey: teacherKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeTeacherCreated();
      unsubscribeTeacherUpdated();
      unsubscribeTeacherDeleted();
    };
  }, [isConnected, subscribe, queryClient]);

  return { isConnected, error };
};