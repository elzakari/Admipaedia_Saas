import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import studentService from '../services/studentService';
import type { Student, StudentCreate, StudentUpdate } from '../types/student.types';

export const useStudentAnalyticsSummary = (params?: { class_id?: number; date_from?: string; date_to?: string }) => {
  return useQuery({
    queryKey: ['students', 'analytics-summary', params],
    queryFn: () => studentService.getStudentAnalyticsSummary(params),
    enabled: !!localStorage.getItem('token'),
    retry: 2,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
};

export const useStudents = (params?: { page?: number; per_page?: number; class_id?: number; status?: string; search?: string }) => {
  return useQuery({
    queryKey: ['students', params],
    queryFn: () => studentService.getStudents(params),
    retry: 2, // Retry failed requests up to 2 times
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
};

export const useStudent = (id: number) => {
  return useQuery({
    queryKey: ['student', id],
    queryFn: () => studentService.getStudentById(id),
    enabled: !!id,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: StudentCreate) => studentService.createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: StudentUpdate }) => 
      studentService.updateStudent(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', data.data.id] });
    },
  });
};

export const useDeleteStudent = (student?: Student) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => studentService.deleteStudent(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', id] });
    },
  });
};
