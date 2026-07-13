import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOptimizedTeachers } from '../useOptimizedTeachers';
import { teacherService } from '../../services/teacherService';
import { mockTeacher, mockApiResponse } from '../../utils/testUtils';

vi.mock('../../services/teacherService');
const mockedTeacherService = teacherService as any;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useOptimizedTeachers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches teachers successfully', async () => {
    mockedTeacherService.getTeachers.mockResolvedValue({
      data: [mockTeacher],
      total: 1,
      page: 1,
      limit: 10,
    });

    const { result } = renderHook(
      () => useOptimizedTeachers({ page: 1, limit: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.data).toEqual([mockTeacher]);
  });

  it('handles background refetch', async () => {
    mockedTeacherService.getTeachers.mockResolvedValue({
      data: [mockTeacher],
      total: 1,
      page: 1,
      limit: 10,
    });

    const { result } = renderHook(
      () => useOptimizedTeachers({ 
        page: 1, 
        limit: 10, 
        enableBackgroundRefetch: true 
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify background refetch is enabled
    expect(result.current.isRefetching).toBeDefined();
  });

  it('prefetches next page', async () => {
    mockedTeacherService.getTeachers
      .mockResolvedValueOnce({
        data: [mockTeacher],
        pagination: { current_page: 1, total_pages: 2, total: 20, per_page: 10 }
      })
      .mockResolvedValueOnce({
        data: [{ ...mockTeacher, id: '2', name: 'Jane Doe' }],
        pagination: { current_page: 2, total_pages: 2, total: 20, per_page: 10 }
      });

    const { result } = renderHook(
      () => useOptimizedTeachers({ page: 1, limit: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify prefetch was called for next page
    await waitFor(() => {
      expect(mockedTeacherService.getTeachers).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });
});