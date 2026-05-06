import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';


import teacherService from '../services/teacherService';
import { TeacherCreate, TeacherUpdate } from '../services/teacherService';
import { Teacher } from '../types/teacher.types';

// Add Pagination interface
interface Pagination {
  total: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

// Keys for React Query cache
export const teacherKeys = {
  all: ['teachers'] as const,
  lists: () => [...teacherKeys.all, 'list'] as const,
  list: (filters: any) => [...teacherKeys.lists(), filters] as const,
  details: () => [...teacherKeys.all, 'detail'] as const,
  detail: (id: number) => [...teacherKeys.details(), id] as const,
};

// Hook for fetching teachers list with optional filters
export const useTeachers = (params?: {
  page?: number;
  per_page?: number;
  status?: 'active' | 'inactive' | 'on_leave';
  specialization?: string;
  search?: string;
}) => {
  return useQuery<{
    teachers: Teacher[]; 
    pagination: Pagination 
  }, Error>({
    queryKey: teacherKeys.list(params),
    queryFn: () => teacherService.getTeachers(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching a single teacher by ID
export const useTeacher = (selectedTeacherId: string | null, p0: { enabled: boolean; }, teacherId: number) => {
  return useQuery({
    queryKey: teacherKeys.detail(teacherId),
    queryFn: () => teacherService.getTeacherById(teacherId),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching teacher's classes
// Replace the useTeacherClasses hook implementation
export const useTeacherClasses = (teacherId: string | number, params?: {
  page?: number;
  per_page?: number;
  academic_year?: string;
}) => {
  // Convert teacherId to number to ensure consistency
  const numericTeacherId = typeof teacherId === 'string' ? parseInt(teacherId, 10) : teacherId;
  
  return useQuery({
    queryKey: [...teacherKeys.detail(numericTeacherId), 'classes', params],
    queryFn: () => teacherService.getTeacherClasses(numericTeacherId, params),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Remove the onError property and use the options pattern instead
  });
};

// Mutation hooks
// In useCreateTeacher
export const useCreateTeacher = () => {
  const queryClient = useQueryClient();
  
  return useMutation<
    Teacher,                // TData - Return type
    Error,                  // TError - Error type
    TeacherCreate,          // TVariables - Variables type
    unknown                 // TContext - Context type (optional)
  >({
    mutationFn: (newTeacher: TeacherCreate) => teacherService.createTeacher(newTeacher),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    },
  });
};

// In useUpdateTeacher
export const useUpdateTeacher = () => {
  const queryClient = useQueryClient();
  
  return useMutation<
    Teacher,                              // TData - Return type of the mutation function
    Error,                                // TError - Error type
    { id: number; data: TeacherUpdate },  // TVariables - Variables type
    unknown                               // TContext - Context type (optional)
  >({
    mutationFn: ({ id, data }) => teacherService.updateTeacher(id, data),
    onSuccess: (updatedTeacher) => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.detail(updatedTeacher.id) });
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    },
  });
};

// In useDeleteTeacher
export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, number>({
    mutationFn: (teacherId: number) => teacherService.deleteTeacher(teacherId),
    onSuccess: (_, teacherId) => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.detail(teacherId) });
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    },
  });
};

// Add this new hook for updating teacher status
export const useUpdateTeacherStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation<
    Teacher,                              // TData - Return type
    Error,                                // TError - Error type
    { id: number; status: 'active' | 'inactive' | 'on_leave' },  // TVariables - Variables type
    unknown                               // TContext - Context type (optional)
  >({
    mutationFn: ({ id, status }) => teacherService.updateTeacherStatus(id, status),
    onSuccess: (updatedTeacher) => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.detail(updatedTeacher.id) });
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    },
  });
};
