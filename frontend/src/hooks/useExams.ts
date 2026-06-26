import useSWR from 'swr';
import { Exam, Grade } from '../types/academics.types';
import api from '../lib/api';
import { extractExamRows } from '../services/examService';

const fetcher = async ([path, params]: [string, Record<string, string | number | boolean>]) => {
  const response = await api.get(path, { params });
  return response.data;
};

export function useExams(params?: {
  page?: number;
  per_page?: number;
  class_id?: number;
  classId?: number;
  subject_id?: number;
  subjectId?: number;
  date_from?: string;
  dateFrom?: string;
  date_to?: string;
  dateTo?: string;
  status?: string;
  include_conflicts?: boolean;
  searchTerm?: string;
}) {
  const normalizedParams: Record<string, string | number | boolean> = {};
  if (params) {
    if (params.page !== undefined) normalizedParams.page = params.page;
    if (params.per_page !== undefined) normalizedParams.per_page = params.per_page;
    if (params.class_id !== undefined || params.classId !== undefined) normalizedParams.class_id = params.class_id ?? params.classId!;
    if (params.subject_id !== undefined || params.subjectId !== undefined) normalizedParams.subject_id = params.subject_id ?? params.subjectId!;
    if (params.date_from !== undefined || params.dateFrom !== undefined) normalizedParams.date_from = params.date_from ?? params.dateFrom!;
    if (params.date_to !== undefined || params.dateTo !== undefined) normalizedParams.date_to = params.date_to ?? params.dateTo!;
    if (params.status !== undefined) normalizedParams.status = params.status;
    if (params.include_conflicts !== undefined) normalizedParams.include_conflicts = params.include_conflicts;
  }

  const { data, error, mutate } = useSWR<any>(
    ['/exams', normalizedParams],
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 300000, // 5 minutes
    }
  );

  return {
    exams: extractExamRows(data),
    pagination: data?.pagination || data?.data?.pagination,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useExam(examId: number | null) {
  const { data, error, mutate } = useSWR<any>(
    examId ? [`/exams/${examId}`, {}] : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    exam: data?.exam || data?.data?.exam,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useGradesByExam(examId: number | null, params?: {
  page?: number;
  per_page?: number;
}) {
  const normalizedParams: Record<string, string | number> = {};
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        normalizedParams[key] = value;
      }
    });
  }

  const { data, error, mutate } = useSWR<any>(
    examId ? [`/exams/${examId}/grades`, normalizedParams] : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    grades: data?.grades || data?.data?.grades || [],
    pagination: data?.pagination || data?.data?.pagination,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useGradesByStudent(studentId: number | null, params?: {
  page?: number;
  per_page?: number;
  subject_id?: number;
  class_id?: number;
}) {
  const normalizedParams: Record<string, string | number> = {};
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        normalizedParams[key] = value;
      }
    });
  }

  const { data, error, mutate } = useSWR<any>(
    studentId ? [`/students/${studentId}/grades`, normalizedParams] : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    grades: data?.grades || data?.data?.grades || [],
    pagination: data?.pagination || data?.data?.pagination,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useGradingScheme() {
  const { data, error } = useSWR(
    ['/academics/grading-scheme', {}],
    fetcher,
    {
      fallbackData: {
        gradingScheme: [
          { grade: 'A+', minScore: 90, maxScore: 100, description: 'Excellent' },
          { grade: 'A', minScore: 80, maxScore: 89, description: 'Very Good' },
          { grade: 'B+', minScore: 70, maxScore: 79, description: 'Good' },
          { grade: 'B', minScore: 60, maxScore: 69, description: 'Above Average' },
          { grade: 'C+', minScore: 50, maxScore: 59, description: 'Average' },
          { grade: 'C', minScore: 40, maxScore: 49, description: 'Below Average' },
          { grade: 'F', minScore: 0, maxScore: 39, description: 'Fail' },
        ]
      },
      revalidateOnFocus: false,
    }
  );

  return {
    gradingScheme: data?.gradingScheme || [],
    isLoading: !error && !data,
    isError: error,
  };
}
