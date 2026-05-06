import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import parentService, { ParentCreate, ParentUpdate } from '../services/parentService';
import type { Parent } from '../services/parentService';
import type { StandardApiResponse, Pagination } from '../types';

// Keys for React Query cache
export const parentKeys = {
  all: ['parents'] as const,
  lists: () => [...parentKeys.all, 'list'] as const,
  list: (filters: any) => [...parentKeys.lists(), filters] as const,
  details: () => [...parentKeys.all, 'detail'] as const,
  detail: (id: number) => [...parentKeys.details(), id] as const,
  children: (parentId: number) => [...parentKeys.detail(parentId), 'children'] as const,
  childData: (childId: number, dataType: string) => ['children', childId, dataType] as const,
};

// Hook for fetching parents list with optional filters
export const useParents = (params?: {
  page?: number;
  per_page?: number;
  status?: 'active' | 'inactive';
  search?: string;
}) => {
  return useQuery<StandardApiResponse<{ parents: Parent[]; pagination: Pagination }>>({
    queryKey: parentKeys.list(params),
    queryFn: () => parentService.getParents(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching a single parent by ID
export const useParent = (parentId: number) => {
  return useQuery({
    queryKey: parentKeys.detail(parentId),
    queryFn: () => parentService.getParentById(parentId),
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching parent's children
export const useParentChildren = (parentId: number) => {
  return useQuery({
    queryKey: parentKeys.children(parentId),
    queryFn: () => parentService.getParentChildren(parentId),
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching child's academic data
export const useChildAcademicData = (childId: number) => {
  return useQuery({
    queryKey: parentKeys.childData(childId, 'academics'),
    queryFn: () => parentService.getChildAcademicData(childId),
    enabled: !!childId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching child's attendance data
export const useChildAttendanceData = (childId: number, params?: {
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: [...parentKeys.childData(childId, 'attendance'), params],
    queryFn: () => parentService.getChildAttendanceData(childId, params),
    enabled: !!childId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching child's fee data
export const useChildFeeData = (childId: number) => {
  return useQuery({
    queryKey: parentKeys.childData(childId, 'fees'),
    queryFn: () => parentService.getChildFeeData(childId),
    enabled: !!childId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching child's behavior data
export const useChildBehaviorData = (childId: number) => {
  return useQuery({
    queryKey: parentKeys.childData(childId, 'behavior'),
    queryFn: () => parentService.getChildBehaviorData(childId),
    enabled: !!childId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Mutation hooks
export const useCreateParent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (newParent: ParentCreate) => parentService.createParent(newParent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parentKeys.lists() });
    },
  });
};

export const useUpdateParent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ParentUpdate }) => 
      parentService.updateParent(id, data),
    onSuccess: (updatedParent) => {
      queryClient.invalidateQueries({ queryKey: parentKeys.detail(updatedParent.id) });
      queryClient.invalidateQueries({ queryKey: parentKeys.lists() });
    },
  });
};

export const useDeleteParent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (parentId: number) => parentService.deleteParent(parentId),
    onSuccess: (_, parentId) => {
      queryClient.invalidateQueries({ queryKey: parentKeys.detail(parentId) });
      queryClient.invalidateQueries({ queryKey: parentKeys.lists() });
    },
  });
};

export const useSendMessageToTeacher = () => {
  return useMutation({
    mutationFn: (data: {
      parentId: number;
      teacherId: number;
      subject: string;
      message: string;
    }) => parentService.sendMessageToTeacher(data),
  });
};

export const useSubmitReport = () => {
  return useMutation({
    mutationFn: (data: {
      parentId: number;
      childId: number;
      reportType: string;
      subject: string;
      description: string;
    }) => parentService.submitReport(data),
  });
};

export const useLinkStudentToParent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ studentId, parentId }: { studentId: number; parentId: number }) => 
      parentService.linkStudentToParent(studentId, parentId),
    onSuccess: (_, { parentId }) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: parentKeys.children(parentId) });
    },
  });
};