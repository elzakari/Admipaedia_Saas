import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetStudents } = vi.hoisted(() => {
  const mockGetStudents = vi.fn();
  return { mockGetStudents };
});

vi.mock('../../services/studentService', () => ({
  default: {
    getStudents: mockGetStudents,
  },
}));

import { useStudents } from '../useStudents';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: 0 },
      mutations: { retry: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useStudents Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches students successfully', async () => {
    const mockStudents = {
      data: [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
      ],
      pagination: { total: 2, current_page: 1, per_page: 10, total_pages: 1, has_next: false, has_prev: false }
    };

    mockGetStudents.mockResolvedValue(mockStudents);

    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStudents);
    expect(mockGetStudents).toHaveBeenCalledTimes(1);
  });

  it('handles loading state', () => {
    mockGetStudents.mockImplementation(
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
    mockGetStudents.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    }, { timeout: 10000 });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('refetches data when refetch is called', async () => {
    const mockStudents = {
      data: [{ id: '1', name: 'John Doe', email: 'john@example.com' }],
      pagination: { total: 1, current_page: 1, per_page: 10, total_pages: 1, has_next: false, has_prev: false }
    };

    mockGetStudents.mockResolvedValue(mockStudents);

    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    result.current.refetch();

    await waitFor(() => {
      expect(mockGetStudents).toHaveBeenCalledTimes(2);
    });
  });
});
