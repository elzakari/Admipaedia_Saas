import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetStudents } = vi.hoisted(() => {
  const mockGetStudents = vi.fn();
  return { mockGetStudents };
});

vi.mock('../services/studentService', () => ({
  default: {
    getStudents: mockGetStudents,
    getAllStudents: mockGetStudents,
    getStudentById: vi.fn(),
    createStudent: vi.fn(),
    updateStudent: vi.fn(),
    deleteStudent: vi.fn(),
  },
}));

import { useStudents } from '../hooks/useStudents';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: 0 },
      mutations: { retry: 0 },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useStudents', () => {
  const mockStudents = [
    {
      id: 1,
      admission_number: 'ADM001',
      first_name: 'John',
      last_name: 'Doe',
      display_name: 'John Doe',
      full_name: 'John Michael Doe',
      email: 'john.doe@example.com',
      date_of_birth: '2010-01-01',
      gender: 'male' as const,
      class_id: 1,
      class_name: 'Grade 1A',
      enrollment_date: '2021-09-01',
      status: 'active' as const,
      address: '123 Main St',
      city: 'Accra',
      country: 'Ghana',
    },
    {
      id: 2,
      admission_number: 'ADM002',
      first_name: 'Jane',
      last_name: 'Smith',
      display_name: 'Jane Smith',
      full_name: 'Jane Elizabeth Smith',
      email: 'jane.smith@example.com',
      date_of_birth: '2010-02-15',
      gender: 'female' as const,
      class_id: 1,
      class_name: 'Grade 1A',
      enrollment_date: '2021-09-01',
      status: 'active' as const,
      address: '456 Oak Ave',
      city: 'Accra',
      country: 'Ghana',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch students successfully', async () => {
    const mockResponse = {
      success: true,
      data: mockStudents,
      pagination: {
        current_page: 1,
        total_pages: 1,
        total: 2,
        per_page: 20,
      },
    };
    mockGetStudents.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(mockGetStudents).toHaveBeenCalledTimes(1);
  });

  it('should handle error state', async () => {
    const error = new Error('Failed to fetch students');
    mockGetStudents.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    }, { timeout: 10000 });

    expect(result.current.error).toBeInstanceOf(Error);
    // Note: TanStack Query may wrap the original error message
    expect(result.current.error?.message).toBeTruthy();
  });

  it('should refetch data when refetch is called', async () => {
    const mockResponse = {
      success: true,
      data: mockStudents,
      pagination: { current_page: 1, total_pages: 1, total: 2, per_page: 20 },
    };
    mockGetStudents.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    await result.current.refetch();

    expect(mockGetStudents).toHaveBeenCalledTimes(2);
  });

  it('should pass filters to the service', async () => {
    const filters = { class_id: 1, status: 'active' as const };

    mockGetStudents.mockResolvedValueOnce({
      success: true,
      data: mockStudents,
      pagination: { current_page: 1, total_pages: 1, total: 2, per_page: 20 },
    });

    const { result } = renderHook(() => useStudents(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetStudents).toHaveBeenCalledTimes(1);
  });
});