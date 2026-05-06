import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import teacherService from '../services/teacherService';
import { TeacherAttendance } from '../services/teacherService';

// Keys for React Query cache
export const teacherAttendanceKeys = {
  all: ['teacher-attendance'] as const,
  lists: () => [...teacherAttendanceKeys.all, 'list'] as const,
  list: (teacherId: number, filters: any) => [...teacherAttendanceKeys.lists(), teacherId, filters] as const,
};

/**
 * Hook for fetching teacher attendance records
 * @param teacherId The ID of the teacher to fetch attendance for
 * @param params Optional parameters for pagination and date filtering
 */
export const useTeacherAttendance = (teacherId: number, params?: {
  page?: number;
  per_page?: number;
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery<{ attendance: TeacherAttendance[]; pagination: any }, Error>({
    queryKey: teacherAttendanceKeys.list(teacherId, params),
    queryFn: () => teacherService.getTeacherAttendance(teacherId, params),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for marking teacher attendance
 */
export const useMarkTeacherAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation<
    TeacherAttendance, // Return type
    Error, // Error type
    { teacherId: number; date: string; status: 'present' | 'absent' | 'late'; note?: string }, // Variables type
    unknown // Context type
  >({
    mutationFn: ({ teacherId, date, status, note }) => 
      teacherService.markAttendance(teacherId, { date, status, note }),
    onSuccess: (_, { teacherId }) => {
      // Invalidate all attendance queries for this teacher
      queryClient.invalidateQueries({ queryKey: teacherAttendanceKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: teacherAttendanceKeys.list(teacherId, {})
      });
    },
  });
};