import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import attendanceService, { BulkAttendanceCreate } from '../services/attendanceService';

// Keys for React Query cache
export const classAttendanceKeys = {
  all: ['class-attendance'] as const,
  lists: () => [...classAttendanceKeys.all, 'list'] as const,
  list: (classId: number, filters: any) => [...classAttendanceKeys.lists(), classId, filters] as const,
  summaries: () => [...classAttendanceKeys.all, 'summary'] as const,
  summary: (classId: number, filters: any) => [...classAttendanceKeys.summaries(), classId, filters] as const,
};

/**
 * Hook for fetching class attendance summary
 */
export const useClassAttendanceSummary = (classId: number, params?: {
  date?: string;
  month?: number;
  year?: number;
}) => {
  return useQuery({
    queryKey: classAttendanceKeys.summary(classId, params),
    queryFn: () => attendanceService.getClassAttendanceSummary(classId, params),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for submitting bulk attendance for a class
 */
export const useSubmitClassAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: BulkAttendanceCreate) => 
      attendanceService.createBulkAttendance(data),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['class-attendance-day', variables.class_id]
      });
      queryClient.invalidateQueries({ 
        queryKey: classAttendanceKeys.lists() 
      });
      queryClient.invalidateQueries({ 
        queryKey: classAttendanceKeys.list(variables.class_id, {}) 
      });
      queryClient.invalidateQueries({ 
        queryKey: classAttendanceKeys.summaries() 
      });
      queryClient.invalidateQueries({ 
        queryKey: classAttendanceKeys.summary(variables.class_id, {}) 
      });
    },
  });
};
