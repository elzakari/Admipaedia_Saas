import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import classService, { Class, ClassCreate, ClassUpdate } from '../services/classService';
import { keepPreviousData } from '@tanstack/react-query';
import { StandardPaginatedResponse } from '../types';

// Define query keys for better cache management
export const classKeys = {
  all: ['classes'] as const,
  lists: () => [...classKeys.all, 'list'] as const,
  list: (filters: any) => [...classKeys.lists(), filters] as const,
  details: () => [...classKeys.all, 'detail'] as const,
  detail: (id: number) => [...classKeys.details(), id] as const,
};

// Get all classes with optional filtering
export const useClasses = (params?: {
  page?: number;
  per_page?: number;
  grade_level?: string;
  academic_year?: string;
  enabled?: boolean;
}) => {
  const { enabled, ...queryParams } = params || {};
  
  return useQuery<StandardPaginatedResponse<Class>, Error>({
    queryKey: classKeys.list(queryParams),
    queryFn: () => classService.getClasses(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled !== false, // Enabled by default unless explicitly set to false
  });
};

// Get a single class by ID
export const useClass = (classId: number) => {
  return useQuery<Class, Error>({
    queryKey: classKeys.detail(classId),
    queryFn: async () => {
      const response = await classService.getClassById(classId);
      return response.data;
    },
    enabled: !!classId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Create a new class
export const useCreateClass = () => {
  const queryClient = useQueryClient();
  
  return useMutation<Class, Error, ClassCreate>({
    mutationFn: async (newClass: ClassCreate) => {
      const response = await classService.createClass(newClass);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all class-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: classKeys.all });
      // Also remove any cached data to force a fresh fetch
      queryClient.removeQueries({ queryKey: classKeys.all });
    },
  });
};

// Update an existing class
export const useUpdateClass = () => {
  const queryClient = useQueryClient();
  
  return useMutation<
    Class,
    Error,
    { classId: number | string; data: ClassUpdate }
  >({
    mutationFn: async ({ classId, data }) => {
      const id = typeof classId === 'string' ? parseInt(classId, 10) : classId;
      const response = await classService.updateClass(id, data);
      return response.data;
    },
    onSuccess: (updatedClass) => {
      queryClient.invalidateQueries({ queryKey: classKeys.detail(updatedClass.id) });
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
};

// Delete a class
export const useDeleteClass = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { classId: number; force?: boolean }>({
    mutationFn: async ({ classId, force }) => {
      const response = await classService.deleteClass(classId, force);
      return response.data;
    },
    onSuccess: (_data, { classId }) => {
      queryClient.invalidateQueries({ queryKey: classKeys.detail(classId) });
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
};

// Get classes taught by a specific teacher
export const useTeacherClasses = (teacherId: number, params?: {
  page?: number;
  per_page?: number;
}) => {
  return useQuery<StandardPaginatedResponse<Class>, Error>({
    queryKey: [...classKeys.lists(), 'teacher', teacherId, params],
    queryFn: () => classService.getClassesByTeacher(teacherId, params),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};