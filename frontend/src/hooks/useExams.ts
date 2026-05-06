import useSWR from 'swr';
import { API_BASE_URL } from '../config/constants';
import { Exam, Grade } from '../types/academics.types';
import examService from '../services/examService';

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }

  return response.json();
};

export function useExams(params?: {
  page?: number;
  per_page?: number;
  class_id?: number;
  subject_id?: number;
  date_from?: string;
  date_to?: string;
  status?: string;
  include_conflicts?: boolean;
}) {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
  }

  const qs = queryParams.toString();
  const url = `${API_BASE_URL}/api/v1/exams${qs ? `?${qs}` : ''}`;

  const { data, error, mutate } = useSWR<{ exams: Exam[]; pagination: any }>(
    url,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 300000, // 5 minutes
    }
  );

  return {
    exams: data?.exams || [],
    pagination: data?.pagination,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useExam(examId: number | null) {
  const { data, error, mutate } = useSWR<{ exam: Exam }>(
    examId ? `${API_BASE_URL}/api/v1/exams/${examId}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    exam: data?.exam,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useGradesByExam(examId: number | null, params?: {
  page?: number;
  per_page?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
  }

  const { data, error, mutate } = useSWR<{ grades: Grade[]; pagination: any }>(
    examId ? `${API_BASE_URL}/api/v1/exams/${examId}/grades?${queryParams.toString()}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    grades: data?.grades || [],
    pagination: data?.pagination,
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
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
  }

  const { data, error, mutate } = useSWR<{ grades: Grade[]; pagination: any }>(
    studentId ? `${API_BASE_URL}/api/v1/students/${studentId}/grades?${queryParams.toString()}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    grades: data?.grades || [],
    pagination: data?.pagination,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useGradingScheme() {
  const { data, error } = useSWR(
    `${API_BASE_URL}/api/v1/academics/grading-scheme`,
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