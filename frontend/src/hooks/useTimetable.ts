import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import timetableService, { CreateTimeSlotParams } from '../services/timetableService';

export const useClassTimetable = (classId: number, academicYear?: string, term?: string) => {
  return useQuery({
    queryKey: ['timetable', 'class', classId, academicYear, term],
    queryFn: () => timetableService.getClassTimetable(classId, academicYear, term),
    enabled: !!classId,
  });
};

export const useTeacherTimetable = (teacherId: number, academicYear?: string, term?: string) => {
  return useQuery({
    queryKey: ['timetable', 'teacher', teacherId, academicYear, term],
    queryFn: () => timetableService.getTeacherTimetable(teacherId, academicYear, term),
    enabled: !!teacherId,
  });
};

export const useAllTimetables = (academicYear?: string, term?: string) => {
  return useQuery({
    queryKey: ['timetable', 'all', academicYear, term],
    queryFn: () => timetableService.getAllTimetables(academicYear, term),
  });
};

export const usePeriods = (params?: {
  class_id?: number;
  subject_id?: number;
  teacher_id?: number;
  day_of_week?: string;
  term?: string;
  academic_year?: string;
  slot_id?: number;
}) => {
  return useQuery({
    queryKey: ['timetable', 'periods', params],
    queryFn: () => timetableService.getPeriodOptions(params),
  });
};

export const useCreateTimeSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTimeSlotParams) => timetableService.createTimeSlot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
    },
  });
};

export const useUpdateTimeSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId, updates }: { slotId: string; updates: Partial<CreateTimeSlotParams> }) =>
      timetableService.updateTimeSlot(slotId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
    },
  });
};

export const useDeleteTimeSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => timetableService.deleteTimeSlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
    },
  });
};
