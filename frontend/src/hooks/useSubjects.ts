import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import subjectService from '../services/subjectService'
import { Subject, SubjectFilters, PaginationMeta } from '../types/subject.types'

export const subjectKeys = {
  all: ['subjects'] as const,
  list: (filters: SubjectFilters) => [...subjectKeys.all, 'list', filters] as const,
  detail: (id: number) => [...subjectKeys.all, 'detail', id] as const,
}

export function useSubjects(filters: SubjectFilters = {}) {
  return useQuery<{ subjects: Subject[]; pagination: PaginationMeta }>({
    queryKey: subjectKeys.list(filters),
    queryFn: async () => {
      const result = await subjectService.getSubjects({
        page: filters.page,
        per_page: filters.per_page,
        department: filters.department,
        is_active: filters.is_active,
        class_id: filters.class_id,
      });
      return {
        subjects: result.subjects,
        pagination: result.pagination
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  })
}

export function useCreateSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: subjectService.createSubject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subjectKeys.all })
    },
  })
}

export function useUpdateSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Subject> }) => subjectService.updateSubject(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: subjectKeys.detail(variables.id) })
      qc.invalidateQueries({ queryKey: subjectKeys.all })
    },
  })
}

export function useDeleteSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, force }: { id: number; force?: boolean }) => subjectService.deleteSubject(id, force),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subjectKeys.all })
    },
  })
}

export function useSubject(id: number) {
  return useQuery<Subject>({
    queryKey: subjectKeys.detail(id),
    queryFn: () => subjectService.getSubjectById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}
