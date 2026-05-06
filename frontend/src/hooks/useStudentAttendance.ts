import { useQuery } from '@tanstack/react-query';
import attendanceService from '../services/attendanceService';

// Keys for React Query cache
export const studentAttendanceKeys = {
  all: ['student-attendance'] as const,
  lists: () => [...studentAttendanceKeys.all, 'list'] as const,
  list: (studentId: number, filters: any) => [...studentAttendanceKeys.lists(), studentId, filters] as const,
  summaries: () => [...studentAttendanceKeys.all, 'summary'] as const,
  summary: (studentId: number, filters: any) => [...studentAttendanceKeys.summaries(), studentId, filters] as const,
};

/**
 * Hook for fetching student attendance summary
 */
export const useStudentAttendanceSummary = (studentId: number, params?: {
  academic_year?: string;
  month?: number;
  class_id?: number;
}) => {
  return useQuery({
    queryKey: studentAttendanceKeys.summary(studentId, params),
    queryFn: () => {
      const q: any = {};
      if (params?.class_id) q.class_id = params.class_id;

      if (params?.month) {
        const yearStr = (params?.academic_year || '').split('/')[0];
        const y = Number(yearStr) || new Date().getFullYear();
        const start = new Date(y, params.month - 1, 1);
        const end = new Date(y, params.month, 0);
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        q.date_from = fmt(start);
        q.date_to = fmt(end);
      }

      return attendanceService.getStudentAttendanceSummary(studentId, q);
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for fetching student attendance history
 */
export const useStudentAttendanceHistory = (studentId: number, params?: {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  class_id?: number;
}) => {
  return useQuery({
    queryKey: studentAttendanceKeys.list(studentId, params),
    queryFn: () => attendanceService.getAttendance({
      student_id: studentId,
      ...params
    }),
    enabled: !!studentId,
    keepPreviousData: true,
  });
};
