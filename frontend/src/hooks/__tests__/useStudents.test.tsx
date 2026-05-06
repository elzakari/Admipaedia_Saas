import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { useStudents } from '../useStudents';
import * as studentService from '../../services/studentService';

jest.mock('../../services/studentService');
const mockStudentService = studentService as jest.Mocked<typeof studentService>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useStudents Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches students successfully', async () => {
    const mockStudents = {
      students: [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
      ],
      pagination: { total: 2, page: 1, pages: 1 }
    };

    mockStudentService.getStudents.mockResolvedValue(mockStudents);

    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStudents);
    expect(mockStudentService.getStudents).toHaveBeenCalledTimes(1);
  });

  it('handles loading state', () => {
    mockStudentService.getStudents.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error state', async () => {
    const errorMessage = 'Failed to fetch students';
    mockStudentService.getStudents.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('refetches data when refetch is called', async () => {
    const mockStudents = {
      students: [{ id: '1', name: 'John Doe', email: 'john@example.com' }],
      pagination: { total: 1, page: 1, pages: 1 }
    };

    mockStudentService.getStudents.mockResolvedValue(mockStudents);

    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(mockStudentService.getStudents).toHaveBeenCalledTimes(2);
    });
  });
});